use std::collections::HashSet;
use std::env;
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::Router;
use axum::extract::State;
use axum::extract::ws::{Message as WebSocketMessage, WebSocket, WebSocketUpgrade};
use axum::http::{HeaderMap, StatusCode, Uri, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use prost::Message as ProstMessage;
use tokio::time::{MissedTickBehavior, interval, timeout};

use crate::proto::{ClientMessage, ServerMessage, client_message, server_message};
use crate::room::{RoomHandle, encode_server_message};

const MAXIMUM_MESSAGE_SIZE: usize = 256 * 1024;
const JOIN_TIMEOUT: Duration = Duration::from_secs(10);
const SEND_TIMEOUT: Duration = Duration::from_secs(10);
const PING_INTERVAL: Duration = Duration::from_secs(30);
const PONG_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Clone, Debug)]
pub struct DiceServiceConfig {
    pub listen_address: String,
    pub allowed_origins: HashSet<String>,
}

impl DiceServiceConfig {
    pub fn from_environment() -> Self {
        let mut allowed_origins = HashSet::from([
            "http://localhost:8000".to_owned(),
            "http://127.0.0.1:8000".to_owned(),
        ]);
        for origin in env::var("DICE_ALLOWED_ORIGINS")
            .unwrap_or_default()
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
        {
            allowed_origins.insert(origin.trim_end_matches('/').to_owned());
        }
        Self {
            listen_address: env::var("DICE_SERVICE_ADDR")
                .unwrap_or_else(|_| "127.0.0.1:8081".to_owned()),
            allowed_origins,
        }
    }
}

#[derive(Clone)]
struct AppState {
    room: RoomHandle,
    config: Arc<DiceServiceConfig>,
}

pub fn app(room: RoomHandle, config: Arc<DiceServiceConfig>) -> Router {
    Router::new()
        .route("/healthz", get(health))
        .route("/dice/ws", get(websocket))
        .with_state(AppState { room, config })
}

async fn health() -> StatusCode {
    StatusCode::NO_CONTENT
}

async fn websocket(
    State(state): State<AppState>,
    headers: HeaderMap,
    upgrade: WebSocketUpgrade,
) -> Response {
    if !origin_allowed(&headers, &state.config) {
        return StatusCode::FORBIDDEN.into_response();
    }
    upgrade
        .max_message_size(MAXIMUM_MESSAGE_SIZE)
        .max_frame_size(MAXIMUM_MESSAGE_SIZE)
        .on_upgrade(move |socket| serve_socket(socket, state.room))
}

async fn serve_socket(mut socket: WebSocket, room: RoomHandle) {
    let first = match timeout(JOIN_TIMEOUT, socket.recv()).await {
        Ok(Some(Ok(WebSocketMessage::Binary(payload)))) => payload,
        _ => {
            let _ = socket
                .send(WebSocketMessage::Close(Some(
                    axum::extract::ws::CloseFrame {
                        code: 1008,
                        reason: "binary join message required".into(),
                    },
                )))
                .await;
            return;
        }
    };
    let Ok(first) = ClientMessage::decode(first) else {
        return;
    };
    let Some(client_message::Payload::Join(join)) = first.payload else {
        return;
    };
    let Ok(mut session) = room.join(join.resume_token).await else {
        return;
    };
    let welcome = ServerMessage {
        payload: Some(server_message::Payload::Welcome(session.welcome.clone())),
    };
    if send_binary(&mut socket, &welcome).await.is_err() {
        room.leave(session.connection_id).await;
        return;
    }

    let mut ping = interval(PING_INTERVAL);
    ping.set_missed_tick_behavior(MissedTickBehavior::Skip);
    ping.tick().await;
    let mut last_pong = Instant::now();

    loop {
        enum Next {
            Inbound(Option<Result<WebSocketMessage, axum::Error>>),
            Reliable(Option<ServerMessage>),
            Frame(Result<(), tokio::sync::watch::error::RecvError>),
            Ping,
        }
        let next = tokio::select! {
            inbound = socket.recv() => Next::Inbound(inbound),
            reliable = session.reliable.recv() => Next::Reliable(reliable),
            frame = session.frames.changed() => Next::Frame(frame),
            _ = ping.tick() => Next::Ping,
        };
        let keep_open = match next {
            Next::Inbound(Some(Ok(WebSocketMessage::Binary(payload)))) => {
                if let Ok(message) = ClientMessage::decode(payload) {
                    room.command(session.connection_id.clone(), message).await;
                    true
                } else {
                    false
                }
            }
            Next::Inbound(Some(Ok(WebSocketMessage::Ping(payload)))) => {
                socket.send(WebSocketMessage::Pong(payload)).await.is_ok()
            }
            Next::Inbound(Some(Ok(WebSocketMessage::Pong(_)))) => {
                last_pong = Instant::now();
                true
            }
            Next::Inbound(Some(Ok(WebSocketMessage::Close(_))) | None | Some(Err(_))) => false,
            Next::Inbound(Some(Ok(_))) => true,
            Next::Reliable(Some(message)) => send_binary(&mut socket, &message).await.is_ok(),
            Next::Reliable(None) => false,
            Next::Frame(Ok(())) => {
                let frame = session.frames.borrow().clone();
                if let Some(frame) = frame {
                    send_binary(
                        &mut socket,
                        &ServerMessage {
                            payload: Some(server_message::Payload::PhysicsFrame(frame)),
                        },
                    )
                    .await
                    .is_ok()
                } else {
                    true
                }
            }
            Next::Frame(Err(_)) => false,
            Next::Ping => {
                last_pong.elapsed() <= PONG_TIMEOUT
                    && socket
                        .send(WebSocketMessage::Ping(Vec::new().into()))
                        .await
                        .is_ok()
            }
        };
        if !keep_open {
            break;
        }
    }
    room.leave(session.connection_id).await;
}

async fn send_binary(socket: &mut WebSocket, message: &ServerMessage) -> Result<(), axum::Error> {
    timeout(
        SEND_TIMEOUT,
        socket.send(WebSocketMessage::Binary(
            encode_server_message(message).into(),
        )),
    )
    .await
    .map_err(|_| {
        axum::Error::new(std::io::Error::new(
            std::io::ErrorKind::TimedOut,
            "WebSocket write timed out",
        ))
    })?
}

fn origin_allowed(headers: &HeaderMap, config: &DiceServiceConfig) -> bool {
    let Some(origin) = headers.get(header::ORIGIN) else {
        return true;
    };
    let Ok(origin) = origin.to_str() else {
        return false;
    };
    let normalized = origin.trim_end_matches('/');
    if config.allowed_origins.contains(normalized) {
        return true;
    }
    let Some(host) = headers
        .get(header::HOST)
        .and_then(|value| value.to_str().ok())
    else {
        return false;
    };
    normalized
        .parse::<Uri>()
        .ok()
        .and_then(|uri| uri.authority().map(|authority| authority.as_str() == host))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::proto::{
        JoinRoom, RollMode, StartDragCommand, StartRollCommand, TablePoint, client_message,
        server_message, table_event,
    };
    use crate::room::spawn_room;
    use axum::body::Body;
    use axum::http::Request;
    use futures_util::{SinkExt, StreamExt};
    use http_body_util::BodyExt;
    use tokio::net::TcpListener;
    use tokio_tungstenite::MaybeTlsStream;
    use tokio_tungstenite::WebSocketStream;
    use tokio_tungstenite::connect_async;
    use tokio_tungstenite::tungstenite::Message as TungsteniteMessage;
    use tokio_tungstenite::tungstenite::client::IntoClientRequest;
    use tower::ServiceExt;

    fn config() -> DiceServiceConfig {
        DiceServiceConfig {
            listen_address: "127.0.0.1:0".into(),
            allowed_origins: HashSet::from(["https://allowed.example".into()]),
        }
    }

    #[test]
    fn accepts_same_origin_and_allowlist() {
        let mut headers = HeaderMap::new();
        headers.insert(header::HOST, "dice.example".parse().unwrap());
        headers.insert(header::ORIGIN, "https://dice.example".parse().unwrap());
        assert!(origin_allowed(&headers, &config()));
        headers.insert(header::ORIGIN, "https://allowed.example".parse().unwrap());
        assert!(origin_allowed(&headers, &config()));
        headers.insert(
            header::ORIGIN,
            "https://unapproved.example".parse().unwrap(),
        );
        assert!(!origin_allowed(&headers, &config()));
    }

    #[tokio::test]
    async fn health_endpoint_is_available() {
        let response = app(spawn_room(), Arc::new(config()))
            .oneshot(
                Request::builder()
                    .uri("/healthz")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NO_CONTENT);
        assert!(
            response
                .into_body()
                .collect()
                .await
                .unwrap()
                .to_bytes()
                .is_empty()
        );
    }

    type TestSocket = WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>;

    async fn start_server() -> (String, tokio::task::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let task = tokio::spawn(async move {
            axum::serve(listener, app(spawn_room(), Arc::new(config())))
                .await
                .unwrap();
        });
        (format!("ws://{address}/dice/ws"), task)
    }

    async fn connect_and_join(url: &str, token: &str) -> (TestSocket, crate::proto::Welcome) {
        let (mut socket, _) = connect_async(url).await.unwrap();
        let join = ClientMessage {
            request_id: "join".into(),
            payload: Some(client_message::Payload::Join(JoinRoom {
                resume_token: token.into(),
            })),
        };
        socket
            .send(TungsteniteMessage::Binary(join.encode_to_vec().into()))
            .await
            .unwrap();
        let welcome = next_matching(&mut socket, |message| {
            matches!(message.payload, Some(server_message::Payload::Welcome(_)))
        })
        .await;
        let Some(server_message::Payload::Welcome(welcome)) = welcome.payload else {
            unreachable!()
        };
        (socket, welcome)
    }

    async fn next_matching(
        socket: &mut TestSocket,
        matches: impl Fn(&ServerMessage) -> bool,
    ) -> ServerMessage {
        timeout(Duration::from_secs(3), async {
            loop {
                let payload = socket.next().await.unwrap().unwrap();
                if let TungsteniteMessage::Binary(payload) = payload {
                    let message = ServerMessage::decode(payload).unwrap();
                    if matches(&message) {
                        return message;
                    }
                }
            }
        })
        .await
        .expect("timed out waiting for server message")
    }

    #[tokio::test]
    async fn websocket_clients_share_rolls_and_active_snapshots() {
        let (url, server) = start_server().await;
        let (mut first, first_welcome) = connect_and_join(&url, "").await;
        let (mut second, _) = connect_and_join(&url, "").await;
        let start = ClientMessage {
            request_id: "start-a".into(),
            payload: Some(client_message::Payload::StartRoll(StartRollCommand {
                mode: RollMode::AddNew as i32,
                target_die_ids: Vec::new(),
            })),
        };
        first
            .send(TungsteniteMessage::Binary(start.encode_to_vec().into()))
            .await
            .unwrap();
        let first_event = next_matching(&mut first, |message| {
            matches!(
                message.payload,
                Some(server_message::Payload::Event(ref event))
                    if matches!(event.payload, Some(table_event::Payload::RollStarted(_)))
            )
        })
        .await;
        let second_event = next_matching(&mut second, |message| {
            matches!(
                message.payload,
                Some(server_message::Payload::Event(ref event))
                    if matches!(event.payload, Some(table_event::Payload::RollStarted(_)))
            )
        })
        .await;
        assert_eq!(first_event, second_event);

        let (_, joining_welcome) = connect_and_join(&url, "").await;
        let snapshot = joining_welcome.snapshot.unwrap();
        assert_eq!(snapshot.active_rolls.len(), 1);
        assert_eq!(snapshot.dice.len(), 12);
        assert!(
            snapshot
                .dice
                .iter()
                .all(|die| die.owner_player_id == first_welcome.player_id)
        );
        server.abort();
    }

    #[tokio::test]
    async fn websocket_rejects_non_owner_drag_and_bad_origin() {
        let (url, server) = start_server().await;
        let (mut owner, _) = connect_and_join(&url, "").await;
        let (mut other, _) = connect_and_join(&url, "").await;
        owner
            .send(TungsteniteMessage::Binary(
                ClientMessage {
                    request_id: "start".into(),
                    payload: Some(client_message::Payload::StartRoll(StartRollCommand {
                        mode: RollMode::AddNew as i32,
                        target_die_ids: Vec::new(),
                    })),
                }
                .encode_to_vec()
                .into(),
            ))
            .await
            .unwrap();
        let started = next_matching(&mut other, |message| {
            matches!(
                message.payload,
                Some(server_message::Payload::Event(ref event))
                    if matches!(event.payload, Some(table_event::Payload::RollStarted(_)))
            )
        })
        .await;
        let Some(server_message::Payload::Event(event)) = started.payload else {
            unreachable!()
        };
        let Some(table_event::Payload::RollStarted(started)) = event.payload else {
            unreachable!()
        };
        other
            .send(TungsteniteMessage::Binary(
                ClientMessage {
                    request_id: "forged-drag".into(),
                    payload: Some(client_message::Payload::StartDrag(StartDragCommand {
                        die_id: started.dice[0].die_id.clone(),
                        interaction_id: "drag".into(),
                        sequence: 0,
                        target: Some(TablePoint { x: 0.0, z: 0.0 }),
                    })),
                }
                .encode_to_vec()
                .into(),
            ))
            .await
            .unwrap();
        let rejected = next_matching(&mut other, |message| {
            matches!(
                message.payload,
                Some(server_message::Payload::Rejected(ref rejected))
                    if rejected.request_id == "forged-drag"
            )
        })
        .await;
        assert!(matches!(
            rejected.payload,
            Some(server_message::Payload::Rejected(_))
        ));

        let mut request = url.clone().into_client_request().unwrap();
        request
            .headers_mut()
            .insert(header::ORIGIN, "https://evil.example".parse().unwrap());
        let error = connect_async(request).await.unwrap_err();
        assert!(error.to_string().contains("403"));
        server.abort();
    }
}

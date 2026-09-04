use std::{net::SocketAddr, sync::Arc};

use cards_dice_service::{DiceServiceConfig, app, spawn_room};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cards_dice_service=info".into()),
        )
        .init();

    let config = DiceServiceConfig::from_environment();
    let address: SocketAddr = config
        .listen_address
        .parse()
        .expect("DICE_SERVICE_ADDR must be a socket address");
    let room = spawn_room();
    let listener = TcpListener::bind(address).await.expect("bind dice service");
    info!(%address, "dice physics service listening");
    axum::serve(listener, app(room, Arc::new(config)))
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("serve dice physics service");
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

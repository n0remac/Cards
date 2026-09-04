use std::collections::{HashMap, HashSet};
use std::time::Duration;

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use prost::Message;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha20Rng;
use rapier3d_f64::na::Unit;
use rapier3d_f64::prelude::*;
use tokio::sync::{mpsc, oneshot, watch};
use tokio::time::{MissedTickBehavior, interval};

use crate::proto::{
    self, ActiveDrag, ActiveRoll, ClientMessage, CommandRejected, CommandRejectionCode, DieFace,
    DieMotionState, DieResult, DieTransform, DragEnded, DragStarted, DragUpdated, PhysicsFrame,
    RollCompleted, RollMode, RollResult, RollStarted, ServerMessage, TableBounds, TableDieState,
    TableEvent, TablePoint, TableSnapshot, Welcome, WorldQuaternion, WorldTransform, WorldVector3,
    client_message, server_message, table_event,
};

pub const TABLE_ID: &str = "global-dice-table";
pub const SIMULATION_VERSION: u32 = 5;
const RELIABLE_QUEUE_CAPACITY: usize = 128;
const COMMAND_QUEUE_CAPACITY: usize = 256;
const FIXED_TIME_STEP: f64 = 1.0 / 60.0;
const FRAME_INTERVAL_TICKS: u64 = 3;
const SETTLE_SPEED: f64 = 0.05;
const SETTLE_STEPS: u32 = 20;
const DIE_HALF_EXTENT: f64 = 0.48;
const DIE_CENTER_HEIGHT: f64 = 0.5;
const DRAG_HEIGHT: f64 = 0.58;
const WORLD_LIMIT: f64 = 10_000.0;
const BOUNDS_PADDING: f64 = 2.5;
const PATCH_SPACING: f64 = 1.35;

const STANDARD_DEFINITION_IDS: [&str; 12] = [
    "letter-die-01",
    "letter-die-02",
    "letter-die-03",
    "letter-die-04",
    "letter-die-05",
    "letter-die-06",
    "letter-die-07",
    "letter-die-08",
    "letter-die-09",
    "letter-die-10",
    "letter-die-11",
    "letter-die-12",
];

#[derive(Clone)]
pub struct RoomHandle {
    requests: mpsc::Sender<RoomRequest>,
    frames: watch::Sender<Option<PhysicsFrame>>,
}

pub struct RoomSession {
    pub connection_id: String,
    pub welcome: Welcome,
    pub reliable: mpsc::Receiver<ServerMessage>,
    pub frames: watch::Receiver<Option<PhysicsFrame>>,
}

impl RoomHandle {
    pub async fn join(&self, resume_token: String) -> Result<RoomSession, String> {
        let (reliable_tx, reliable) = mpsc::channel(RELIABLE_QUEUE_CAPACITY);
        let (response_tx, response_rx) = oneshot::channel();
        self.requests
            .send(RoomRequest::Join {
                resume_token,
                reliable: reliable_tx,
                response: response_tx,
            })
            .await
            .map_err(|_| "dice room stopped".to_owned())?;
        let joined = response_rx
            .await
            .map_err(|_| "dice room stopped during join".to_owned())??;
        Ok(RoomSession {
            connection_id: joined.connection_id,
            welcome: joined.welcome,
            reliable,
            frames: self.frames.subscribe(),
        })
    }

    pub async fn command(&self, connection_id: String, message: ClientMessage) {
        let _ = self
            .requests
            .send(RoomRequest::Command {
                connection_id,
                message,
            })
            .await;
    }

    pub async fn leave(&self, connection_id: String) {
        let _ = self
            .requests
            .send(RoomRequest::Leave { connection_id })
            .await;
    }
}

pub fn spawn_room() -> RoomHandle {
    let (request_tx, request_rx) = mpsc::channel(COMMAND_QUEUE_CAPACITY);
    let (frame_tx, _) = watch::channel(None);
    let handle = RoomHandle {
        requests: request_tx,
        frames: frame_tx.clone(),
    };
    tokio::spawn(RoomState::new(frame_tx).run(request_rx));
    handle
}

enum RoomRequest {
    Join {
        resume_token: String,
        reliable: mpsc::Sender<ServerMessage>,
        response: oneshot::Sender<Result<JoinedClient, String>>,
    },
    Leave {
        connection_id: String,
    },
    Command {
        connection_id: String,
        message: ClientMessage,
    },
}

struct JoinedClient {
    connection_id: String,
    welcome: Welcome,
}

struct RoomClient {
    player_id: String,
    reliable: mpsc::Sender<ServerMessage>,
}

#[derive(Clone)]
struct DieRecord {
    die_id: String,
    definition_id: String,
    owner_id: String,
    face: DieFace,
    revision: u64,
    motion: DieMotionState,
    active_roll_id: Option<String>,
    body: RigidBodyHandle,
}

#[derive(Clone)]
struct PreRollState {
    die_id: String,
    pose: Pose,
    face: DieFace,
    revision: u64,
}

struct ActiveRollRecord {
    roll_id: String,
    roller_id: String,
    mode: RollMode,
    target_ids: Vec<String>,
    start_tick: u64,
    pre_roll: Vec<PreRollState>,
    created_ids: Vec<String>,
}

struct ActiveDragRecord {
    die_id: String,
    player_id: String,
    interaction_id: String,
    sequence: u64,
    target: TablePoint,
}

struct RoomState {
    revision: u64,
    physics_tick: u64,
    stable_steps: u32,
    bounds: TableBounds,
    world: PhysicsWorld,
    dice: HashMap<String, DieRecord>,
    die_order: Vec<String>,
    active_rolls: HashMap<String, ActiveRollRecord>,
    active_roll_order: Vec<String>,
    active_drags: HashMap<String, ActiveDragRecord>,
    clients: HashMap<String, RoomClient>,
    connection_count: HashMap<String, usize>,
    player_by_token: HashMap<String, String>,
    token_by_player: HashMap<String, String>,
    frame_tx: watch::Sender<Option<PhysicsFrame>>,
}

impl RoomState {
    fn new(frame_tx: watch::Sender<Option<PhysicsFrame>>) -> Self {
        let mut world = PhysicsWorld::new();
        world.gravity = Vector::new(0.0, -9.81, 0.0);
        world.integration_parameters.dt = FIXED_TIME_STEP;
        world.colliders.insert(
            ColliderBuilder::halfspace(Unit::new_unchecked(Vector::new(0.0, 1.0, 0.0)))
                .friction(0.7)
                .restitution(0.35),
        );
        Self {
            revision: 0,
            physics_tick: 0,
            stable_steps: 0,
            bounds: TableBounds {
                min_x: -8.0,
                max_x: 8.0,
                min_z: -6.0,
                max_z: 6.0,
            },
            world,
            dice: HashMap::new(),
            die_order: Vec::new(),
            active_rolls: HashMap::new(),
            active_roll_order: Vec::new(),
            active_drags: HashMap::new(),
            clients: HashMap::new(),
            connection_count: HashMap::new(),
            player_by_token: HashMap::new(),
            token_by_player: HashMap::new(),
            frame_tx,
        }
    }

    async fn run(mut self, mut requests: mpsc::Receiver<RoomRequest>) {
        let mut ticker = interval(Duration::from_secs_f64(FIXED_TIME_STEP));
        ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);
        loop {
            tokio::select! {
                biased;
                request = requests.recv() => match request {
                    Some(request) => self.handle_request(request),
                    None => return,
                },
                _ = ticker.tick() => self.step(),
            }
        }
    }

    fn handle_request(&mut self, request: RoomRequest) {
        match request {
            RoomRequest::Join {
                resume_token,
                reliable,
                response,
            } => {
                let _ = response.send(self.join_client(resume_token, reliable));
            }
            RoomRequest::Leave { connection_id } => self.leave_client(&connection_id),
            RoomRequest::Command {
                connection_id,
                message,
            } => self.apply_command(&connection_id, message),
        }
    }

    fn join_client(
        &mut self,
        mut resume_token: String,
        reliable: mpsc::Sender<ServerMessage>,
    ) -> Result<JoinedClient, String> {
        let player_id = if let Some(player_id) = self.player_by_token.get(&resume_token) {
            player_id.clone()
        } else {
            let player_id = random_id("player");
            resume_token = random_id("resume");
            self.player_by_token
                .insert(resume_token.clone(), player_id.clone());
            self.token_by_player
                .insert(player_id.clone(), resume_token.clone());
            player_id
        };
        let connection_id = random_id("connection");
        self.clients.insert(
            connection_id.clone(),
            RoomClient {
                player_id: player_id.clone(),
                reliable,
            },
        );
        *self.connection_count.entry(player_id.clone()).or_default() += 1;
        Ok(JoinedClient {
            connection_id,
            welcome: Welcome {
                player_id: player_id.clone(),
                resume_token: self
                    .token_by_player
                    .get(&player_id)
                    .cloned()
                    .unwrap_or(resume_token),
                snapshot: Some(self.snapshot()),
            },
        })
    }

    fn leave_client(&mut self, connection_id: &str) {
        let Some(client) = self.clients.remove(connection_id) else {
            return;
        };
        let Some(count) = self.connection_count.get_mut(&client.player_id) else {
            return;
        };
        *count = count.saturating_sub(1);
        if *count > 0 {
            return;
        }
        self.connection_count.remove(&client.player_id);

        let held_ids: Vec<String> = self
            .active_drags
            .values()
            .filter(|drag| drag.player_id == client.player_id)
            .map(|drag| drag.die_id.clone())
            .collect();
        for die_id in held_ids {
            self.finish_drag_after_disconnect(&die_id);
        }

        let roll_ids: Vec<String> = self
            .active_roll_order
            .iter()
            .filter(|roll_id| {
                self.active_rolls
                    .get(*roll_id)
                    .is_some_and(|roll| roll.roller_id == client.player_id)
            })
            .cloned()
            .collect();
        if !roll_ids.is_empty() {
            for roll_id in roll_ids {
                self.cancel_roll(&roll_id);
            }
            self.revision += 1;
            let snapshot = self.snapshot_with_revision(self.revision);
            self.commit_event(TableEvent {
                table_id: TABLE_ID.to_owned(),
                revision: self.revision,
                payload: Some(table_event::Payload::Snapshot(snapshot)),
                source_request_id: String::new(),
                bounds: Some(self.bounds),
            });
        }
    }

    fn apply_command(&mut self, connection_id: &str, message: ClientMessage) {
        let Some(player_id) = self
            .clients
            .get(connection_id)
            .map(|client| client.player_id.clone())
        else {
            return;
        };
        if message.request_id.is_empty() {
            self.reject(
                connection_id,
                "",
                CommandRejectionCode::InvalidCommand,
                "A request ID is required.",
            );
            return;
        }
        let request_id = message.request_id;
        match message.payload {
            Some(client_message::Payload::StartRoll(command)) => {
                self.start_roll(connection_id, &player_id, &request_id, command)
            }
            Some(client_message::Payload::StartDrag(command)) => self.start_drag(
                connection_id,
                &player_id,
                &request_id,
                command.die_id,
                command.interaction_id,
                command.sequence,
                command.target,
            ),
            Some(client_message::Payload::UpdateDrag(command)) => self.update_drag(
                connection_id,
                &player_id,
                &request_id,
                command.die_id,
                command.interaction_id,
                command.sequence,
                command.target,
                false,
            ),
            Some(client_message::Payload::EndDrag(command)) => self.update_drag(
                connection_id,
                &player_id,
                &request_id,
                command.die_id,
                command.interaction_id,
                command.sequence,
                command.target,
                true,
            ),
            _ => self.reject(
                connection_id,
                &request_id,
                CommandRejectionCode::InvalidCommand,
                "Unsupported command.",
            ),
        }
    }

    fn start_roll(
        &mut self,
        connection_id: &str,
        player_id: &str,
        request_id: &str,
        command: proto::StartRollCommand,
    ) {
        if self
            .active_rolls
            .values()
            .any(|roll| roll.roller_id == player_id)
        {
            self.reject(
                connection_id,
                request_id,
                CommandRejectionCode::Conflict,
                "You already have a roll in progress.",
            );
            return;
        }
        let Some(mode) = RollMode::try_from(command.mode).ok() else {
            self.reject_invalid(connection_id, request_id, "Unknown roll mode.");
            return;
        };

        let owned_ids: Vec<String> = self
            .die_order
            .iter()
            .filter(|die_id| {
                self.dice
                    .get(*die_id)
                    .is_some_and(|die| die.owner_id == player_id)
            })
            .cloned()
            .collect();
        let target_ids = match mode {
            RollMode::AddNew => {
                if !owned_ids.is_empty() || !command.target_die_ids.is_empty() {
                    self.reject(
                        connection_id,
                        request_id,
                        CommandRejectionCode::Conflict,
                        "Your standard dice have already been created.",
                    );
                    return;
                }
                Vec::new()
            }
            RollMode::RerollExisting => {
                let unique: HashSet<&String> = command.target_die_ids.iter().collect();
                if command.target_die_ids.is_empty() || unique.len() != command.target_die_ids.len()
                {
                    self.reject_invalid(
                        connection_id,
                        request_id,
                        "A reroll requires unique target dice.",
                    );
                    return;
                }
                for die_id in &command.target_die_ids {
                    let Some(die) = self.dice.get(die_id) else {
                        self.reject(
                            connection_id,
                            request_id,
                            CommandRejectionCode::NotOwner,
                            "You may reroll only your own dice.",
                        );
                        return;
                    };
                    if die.owner_id != player_id {
                        self.reject(
                            connection_id,
                            request_id,
                            CommandRejectionCode::NotOwner,
                            "You may reroll only your own dice.",
                        );
                        return;
                    }
                    if die.motion != DieMotionState::Settled
                        || die.active_roll_id.is_some()
                        || self.active_drags.contains_key(die_id)
                    {
                        self.reject(
                            connection_id,
                            request_id,
                            CommandRejectionCode::Conflict,
                            "A requested die is busy.",
                        );
                        return;
                    }
                }
                command.target_die_ids
            }
            RollMode::Unspecified => {
                self.reject_invalid(connection_id, request_id, "Unknown roll mode.");
                return;
            }
        };

        let roll_id = random_id("roll");
        let mut rng = ChaCha20Rng::from_seed(rand::random());
        let pre_roll = target_ids
            .iter()
            .filter_map(|die_id| {
                let die = self.dice.get(die_id)?;
                let body = self.world.bodies.get(die.body)?;
                Some(PreRollState {
                    die_id: die_id.clone(),
                    pose: *body.position(),
                    face: die.face,
                    revision: die.revision,
                })
            })
            .collect::<Vec<_>>();

        let definitions: Vec<String> = if mode == RollMode::AddNew {
            STANDARD_DEFINITION_IDS
                .iter()
                .map(|value| (*value).to_owned())
                .collect()
        } else {
            target_ids
                .iter()
                .filter_map(|die_id| self.dice.get(die_id))
                .map(|die| die.definition_id.clone())
                .collect()
        };
        let final_target_ids: Vec<String> = if mode == RollMode::AddNew {
            definitions.iter().map(|_| random_id("die")).collect()
        } else {
            target_ids
        };
        let launch_positions = self.find_launch_positions(&final_target_ids);
        let mut created_ids = Vec::new();

        for (index, die_id) in final_target_ids.iter().enumerate() {
            let position = launch_positions[index];
            let pose = random_launch_pose(&mut rng, position, index);
            let linear_velocity = Vector::new(
                rng.random_range(-1.5..=1.5),
                rng.random_range(3.5..=5.0),
                rng.random_range(-1.5..=1.5),
            );
            let angular_velocity = nontrivial_angular_velocity(&mut rng, index);
            if mode == RollMode::AddNew {
                let body = RigidBodyBuilder::dynamic()
                    .pose(pose)
                    .linvel(linear_velocity)
                    .angvel(angular_velocity)
                    .linear_damping(0.14)
                    .angular_damping(0.18)
                    .ccd_enabled(true)
                    .can_sleep(true);
                let collider =
                    ColliderBuilder::cuboid(DIE_HALF_EXTENT, DIE_HALF_EXTENT, DIE_HALF_EXTENT)
                        .mass(1.0)
                        .friction(0.7)
                        .restitution(0.35);
                let (body_handle, _) = self.world.insert(body, collider);
                self.dice.insert(
                    die_id.clone(),
                    DieRecord {
                        die_id: die_id.clone(),
                        definition_id: definitions[index].clone(),
                        owner_id: player_id.to_owned(),
                        face: DieFace::Unspecified,
                        revision: self.revision + 1,
                        motion: DieMotionState::Rolling,
                        active_roll_id: Some(roll_id.clone()),
                        body: body_handle,
                    },
                );
                self.die_order.push(die_id.clone());
                created_ids.push(die_id.clone());
            } else if let Some(die) = self.dice.get_mut(die_id) {
                let body = &mut self.world.bodies[die.body];
                body.set_body_type(RigidBodyType::Dynamic, true);
                body.set_enabled_rotations(true, true, true, true);
                body.set_position(pose, true);
                body.set_linvel(linear_velocity, true);
                body.set_angvel(angular_velocity, true);
                body.enable_ccd(true);
                die.face = DieFace::Unspecified;
                die.motion = DieMotionState::Rolling;
                die.active_roll_id = Some(roll_id.clone());
                die.revision = self.revision + 1;
            }
        }

        let start_tick = self.physics_tick.saturating_add(1);
        self.active_rolls.insert(
            roll_id.clone(),
            ActiveRollRecord {
                roll_id: roll_id.clone(),
                roller_id: player_id.to_owned(),
                mode,
                target_ids: final_target_ids.clone(),
                start_tick,
                pre_roll,
                created_ids,
            },
        );
        self.active_roll_order.push(roll_id.clone());
        self.stable_steps = 0;
        self.revision += 1;
        self.update_bounds();
        let dice = final_target_ids
            .iter()
            .filter_map(|die_id| self.die_state(die_id))
            .collect();
        self.commit_event(TableEvent {
            table_id: TABLE_ID.to_owned(),
            revision: self.revision,
            payload: Some(table_event::Payload::RollStarted(RollStarted {
                roll_id,
                roller_id: player_id.to_owned(),
                mode: mode as i32,
                dice,
                start_tick,
            })),
            source_request_id: request_id.to_owned(),
            bounds: Some(self.bounds),
        });
        self.publish_frame();
    }

    #[allow(clippy::too_many_arguments)]
    fn start_drag(
        &mut self,
        connection_id: &str,
        player_id: &str,
        request_id: &str,
        die_id: String,
        interaction_id: String,
        sequence: u64,
        target: Option<TablePoint>,
    ) {
        let Some(mut target) = target else {
            self.reject_invalid(connection_id, request_id, "A drag target is required.");
            return;
        };
        if interaction_id.is_empty() || sequence != 0 || !valid_point(&target) {
            self.reject_invalid(connection_id, request_id, "The drag start is invalid.");
            return;
        }
        let Some(die) = self.dice.get(&die_id) else {
            self.reject(
                connection_id,
                request_id,
                CommandRejectionCode::NotOwner,
                "You may move only your own dice.",
            );
            return;
        };
        if die.owner_id != player_id {
            self.reject(
                connection_id,
                request_id,
                CommandRejectionCode::NotOwner,
                "You may move only your own dice.",
            );
            return;
        }
        if die.motion != DieMotionState::Settled || self.active_drags.contains_key(&die_id) {
            self.reject(
                connection_id,
                request_id,
                CommandRejectionCode::Conflict,
                "That die is busy.",
            );
            return;
        }
        target = self.snap_point(&die_id, target);
        let body_handle = die.body;
        let body = &mut self.world.bodies[body_handle];
        body.set_body_type(RigidBodyType::KinematicPositionBased, true);
        body.set_enabled_rotations(false, false, false, true);
        body.set_next_kinematic_translation(Vector::new(target.x, DRAG_HEIGHT, target.z));
        if let Some(die) = self.dice.get_mut(&die_id) {
            die.motion = DieMotionState::Dragged;
            die.revision = self.revision + 1;
        }
        self.active_drags.insert(
            die_id.clone(),
            ActiveDragRecord {
                die_id: die_id.clone(),
                player_id: player_id.to_owned(),
                interaction_id: interaction_id.clone(),
                sequence,
                target,
            },
        );
        self.revision += 1;
        self.commit_event(TableEvent {
            table_id: TABLE_ID.to_owned(),
            revision: self.revision,
            payload: Some(table_event::Payload::DragStarted(DragStarted {
                die_id,
                player_id: player_id.to_owned(),
                interaction_id,
                sequence,
                target: Some(target),
            })),
            source_request_id: request_id.to_owned(),
            bounds: Some(self.bounds),
        });
    }

    #[allow(clippy::too_many_arguments)]
    fn update_drag(
        &mut self,
        connection_id: &str,
        player_id: &str,
        request_id: &str,
        die_id: String,
        interaction_id: String,
        sequence: u64,
        target: Option<TablePoint>,
        ending: bool,
    ) {
        let Some(mut target) = target else {
            self.reject_invalid(connection_id, request_id, "A drag target is required.");
            return;
        };
        if !valid_point(&target) {
            self.reject_invalid(connection_id, request_id, "The drag target is invalid.");
            return;
        }
        let Some(active) = self.active_drags.get(&die_id) else {
            self.reject(
                connection_id,
                request_id,
                CommandRejectionCode::Conflict,
                "That drag is no longer active.",
            );
            return;
        };
        if active.player_id != player_id || active.interaction_id != interaction_id {
            self.reject(
                connection_id,
                request_id,
                CommandRejectionCode::NotOwner,
                "That drag belongs to another player or interaction.",
            );
            return;
        }
        if sequence <= active.sequence {
            self.reject(
                connection_id,
                request_id,
                CommandRejectionCode::StaleState,
                "Drag sequence numbers must increase.",
            );
            return;
        }
        target = self.snap_point(&die_id, target);
        if let Some(active) = self.active_drags.get_mut(&die_id) {
            active.sequence = sequence;
            active.target = target;
        }
        if let Some(die) = self.dice.get_mut(&die_id) {
            let body = &mut self.world.bodies[die.body];
            body.set_next_kinematic_translation(Vector::new(target.x, DRAG_HEIGHT, target.z));
            die.revision = self.revision + 1;
        }
        self.revision += 1;
        let payload = if ending {
            if let Some(die) = self.dice.get_mut(&die_id) {
                let body = &mut self.world.bodies[die.body];
                body.set_translation(Vector::new(target.x, DIE_CENTER_HEIGHT, target.z), true);
                body.set_body_type(RigidBodyType::Dynamic, true);
                body.set_enabled_rotations(false, false, false, true);
                body.set_linvel(Vector::ZERO, true);
                body.set_angvel(Vector::ZERO, true);
                die.motion = DieMotionState::Settled;
            }
            self.active_drags.remove(&die_id);
            table_event::Payload::DragEnded(DragEnded {
                die_id,
                player_id: player_id.to_owned(),
                interaction_id,
                sequence,
                target: Some(target),
            })
        } else {
            table_event::Payload::DragUpdated(DragUpdated {
                die_id,
                player_id: player_id.to_owned(),
                interaction_id,
                sequence,
                target: Some(target),
            })
        };
        self.update_bounds();
        self.commit_event(TableEvent {
            table_id: TABLE_ID.to_owned(),
            revision: self.revision,
            payload: Some(payload),
            source_request_id: request_id.to_owned(),
            bounds: Some(self.bounds),
        });
        self.publish_frame();
    }

    fn finish_drag_after_disconnect(&mut self, die_id: &str) {
        let Some(active) = self.active_drags.remove(die_id) else {
            return;
        };
        self.revision += 1;
        if let Some(die) = self.dice.get_mut(die_id) {
            let body = &mut self.world.bodies[die.body];
            body.set_translation(
                Vector::new(active.target.x, DIE_CENTER_HEIGHT, active.target.z),
                true,
            );
            body.set_body_type(RigidBodyType::Dynamic, true);
            body.set_enabled_rotations(false, false, false, true);
            body.set_linvel(Vector::ZERO, true);
            body.set_angvel(Vector::ZERO, true);
            die.motion = DieMotionState::Settled;
            die.revision = self.revision;
        }
        self.commit_event(TableEvent {
            table_id: TABLE_ID.to_owned(),
            revision: self.revision,
            payload: Some(table_event::Payload::DragEnded(DragEnded {
                die_id: active.die_id,
                player_id: active.player_id,
                interaction_id: active.interaction_id,
                sequence: active.sequence,
                target: Some(active.target),
            })),
            source_request_id: String::new(),
            bounds: Some(self.bounds),
        });
    }

    fn step(&mut self) {
        let had_interaction = !self.active_rolls.is_empty() || !self.active_drags.is_empty();
        let had_awake_body = self
            .dice
            .values()
            .any(|die| !self.world.bodies[die.body].is_sleeping());
        if !had_interaction && !had_awake_body {
            return;
        }
        for active in self.active_drags.values() {
            if let Some(die) = self.dice.get(&active.die_id) {
                self.world.bodies[die.body].set_next_kinematic_translation(Vector::new(
                    active.target.x,
                    DRAG_HEIGHT,
                    active.target.z,
                ));
            }
        }
        self.world.step();
        self.physics_tick += 1;

        if self.invalid_body_ids().is_empty() {
            self.update_bounds();
        } else {
            let roll_ids = self.active_roll_order.clone();
            for roll_id in roll_ids {
                self.cancel_roll(&roll_id);
            }
            self.revision += 1;
            let snapshot = self.snapshot_with_revision(self.revision);
            self.commit_event(TableEvent {
                table_id: TABLE_ID.to_owned(),
                revision: self.revision,
                payload: Some(table_event::Payload::Snapshot(snapshot)),
                source_request_id: String::new(),
                bounds: Some(self.bounds),
            });
            return;
        }

        if !self.active_rolls.is_empty() {
            let stable = self.dice.values().all(|die| {
                if die.motion == DieMotionState::Dragged {
                    return true;
                }
                let body = &self.world.bodies[die.body];
                body.is_sleeping()
                    || (body.linvel().length_squared() < SETTLE_SPEED * SETTLE_SPEED
                        && body.angvel().length_squared() < SETTLE_SPEED * SETTLE_SPEED)
            });
            self.stable_steps = if stable {
                (self.stable_steps + 1).min(SETTLE_STEPS)
            } else {
                0
            };
            if self.stable_steps >= SETTLE_STEPS {
                self.complete_rolls();
            }
        }

        let is_idle = self.active_rolls.is_empty()
            && self.active_drags.is_empty()
            && self
                .dice
                .values()
                .all(|die| self.world.bodies[die.body].is_sleeping());
        if self.physics_tick.is_multiple_of(FRAME_INTERVAL_TICKS) || is_idle {
            self.publish_frame();
        }
    }

    fn complete_rolls(&mut self) {
        let roll_ids = self.active_roll_order.clone();
        for roll_id in roll_ids {
            let Some(active) = self.active_rolls.remove(&roll_id) else {
                continue;
            };
            self.active_roll_order
                .retain(|candidate| candidate != &roll_id);
            self.revision += 1;
            let mut results = Vec::with_capacity(active.target_ids.len());
            for (index, die_id) in active.target_ids.iter().enumerate() {
                let Some(die) = self.dice.get_mut(die_id) else {
                    continue;
                };
                let body = &mut self.world.bodies[die.body];
                let face = upward_face(body.rotation());
                let position = body.translation();
                body.set_translation(Vector::new(position.x, DIE_CENTER_HEIGHT, position.z), true);
                body.set_rotation(face_up_rotation(face), true);
                body.set_enabled_rotations(false, false, false, true);
                body.set_linvel(Vector::ZERO, true);
                body.set_angvel(Vector::ZERO, true);
                die.face = face;
                die.motion = DieMotionState::Settled;
                die.active_roll_id = None;
                die.revision = self.revision;
                results.push(DieResult {
                    die_index: index as u32,
                    face: face as i32,
                    die_id: die_id.clone(),
                    die_definition_id: die.definition_id.clone(),
                });
            }
            self.update_bounds();
            for die in self.dice.values_mut() {
                die.revision = self.revision;
            }
            let changed = self
                .die_order
                .iter()
                .filter_map(|die_id| self.die_state(die_id))
                .collect();
            self.commit_event(TableEvent {
                table_id: TABLE_ID.to_owned(),
                revision: self.revision,
                payload: Some(table_event::Payload::RollCompleted(RollCompleted {
                    roll_id: active.roll_id,
                    roller_id: active.roller_id,
                    result: Some(RollResult {
                        simulation_version: SIMULATION_VERSION,
                        roll_id: roll_id.clone(),
                        dice: results,
                    }),
                    changed_dice: changed,
                    completed_tick: self.physics_tick,
                })),
                source_request_id: String::new(),
                bounds: Some(self.bounds),
            });
        }
        self.stable_steps = 0;
    }

    fn cancel_roll(&mut self, roll_id: &str) {
        let Some(active) = self.active_rolls.remove(roll_id) else {
            return;
        };
        self.active_roll_order
            .retain(|candidate| candidate != roll_id);
        for die_id in active.created_ids {
            if let Some(die) = self.dice.remove(&die_id) {
                self.world.remove_body(die.body);
            }
            self.die_order.retain(|candidate| candidate != &die_id);
        }
        for previous in active.pre_roll {
            if let Some(die) = self.dice.get_mut(&previous.die_id) {
                let body = &mut self.world.bodies[die.body];
                body.set_body_type(RigidBodyType::Dynamic, true);
                body.set_position(previous.pose, true);
                body.set_enabled_rotations(false, false, false, true);
                body.set_linvel(Vector::ZERO, true);
                body.set_angvel(Vector::ZERO, true);
                die.face = previous.face;
                die.revision = previous.revision;
                die.motion = DieMotionState::Settled;
                die.active_roll_id = None;
            }
        }
        self.stable_steps = 0;
    }

    fn invalid_body_ids(&self) -> Vec<String> {
        self.die_order
            .iter()
            .filter(|die_id| {
                let Some(die) = self.dice.get(*die_id) else {
                    return true;
                };
                let body = &self.world.bodies[die.body];
                let position = body.translation();
                let rotation = body.rotation();
                ![
                    position.x, position.y, position.z, rotation.x, rotation.y, rotation.z,
                    rotation.w,
                ]
                .iter()
                .all(|value| value.is_finite() && value.abs() <= WORLD_LIMIT)
            })
            .cloned()
            .collect()
    }

    fn update_bounds(&mut self) {
        if self.die_order.is_empty() {
            return;
        }
        let mut min_x = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut min_z = f64::INFINITY;
        let mut max_z = f64::NEG_INFINITY;
        for die_id in &self.die_order {
            if let Some(die) = self.dice.get(die_id) {
                let position = self.world.bodies[die.body].translation();
                min_x = min_x.min(position.x - DIE_HALF_EXTENT);
                max_x = max_x.max(position.x + DIE_HALF_EXTENT);
                min_z = min_z.min(position.z - DIE_HALF_EXTENT);
                max_z = max_z.max(position.z + DIE_HALF_EXTENT);
            }
        }
        self.bounds.min_x = self.bounds.min_x.min(min_x - BOUNDS_PADDING);
        self.bounds.max_x = self.bounds.max_x.max(max_x + BOUNDS_PADDING);
        self.bounds.min_z = self.bounds.min_z.min(min_z - BOUNDS_PADDING);
        self.bounds.max_z = self.bounds.max_z.max(max_z + BOUNDS_PADDING);
    }

    fn find_launch_positions(&self, target_ids: &[String]) -> Vec<(f64, f64)> {
        let center = self.dice_center().unwrap_or((0.0, 0.0));
        let targets: HashSet<&str> = target_ids.iter().map(String::as_str).collect();
        let obstacles: Vec<(f64, f64)> = self
            .die_order
            .iter()
            .filter(|die_id| !targets.contains(die_id.as_str()))
            .filter_map(|die_id| self.dice.get(die_id))
            .map(|die| {
                let position = self.world.bodies[die.body].translation();
                (position.x, position.z)
            })
            .collect();
        for (offset_x, offset_z) in spiral_offsets(64) {
            let patch_center = (
                center.0 + offset_x as f64 * PATCH_SPACING * 4.5,
                center.1 + offset_z as f64 * PATCH_SPACING * 3.5,
            );
            let slots = launch_slots(patch_center, target_ids.len());
            let clear = slots.iter().all(|slot| {
                obstacles.iter().all(|obstacle| {
                    (slot.0 - obstacle.0).abs() >= 1.05 || (slot.1 - obstacle.1).abs() >= 1.05
                })
            });
            if clear {
                return slots;
            }
        }
        launch_slots(center, target_ids.len())
    }

    fn dice_center(&self) -> Option<(f64, f64)> {
        let mut positions = self.die_order.iter().filter_map(|die_id| {
            let die = self.dice.get(die_id)?;
            let position = self.world.bodies[die.body].translation();
            Some((position.x, position.z))
        });
        let first = positions.next()?;
        let (mut min_x, mut max_x, mut min_z, mut max_z) = (first.0, first.0, first.1, first.1);
        for (x, z) in positions {
            min_x = min_x.min(x);
            max_x = max_x.max(x);
            min_z = min_z.min(z);
            max_z = max_z.max(z);
        }
        Some(((min_x + max_x) / 2.0, (min_z + max_z) / 2.0))
    }

    fn snap_point(&self, die_id: &str, point: TablePoint) -> TablePoint {
        let mut closest = point;
        let mut closest_distance = f64::INFINITY;
        for target_id in &self.die_order {
            if target_id == die_id {
                continue;
            }
            let Some(target_die) = self.dice.get(target_id) else {
                continue;
            };
            let target = self.world.bodies[target_die.body].translation();
            for (dx, dz) in [(1.0, 0.0), (-1.0, 0.0), (0.0, 1.0), (0.0, -1.0)] {
                let candidate = TablePoint {
                    x: target.x + dx,
                    z: target.z + dz,
                };
                let occupied = self.die_order.iter().any(|candidate_id| {
                    if candidate_id == die_id || candidate_id == target_id {
                        return false;
                    }
                    self.dice.get(candidate_id).is_some_and(|candidate_die| {
                        let position = self.world.bodies[candidate_die.body].translation();
                        (candidate.x - position.x).abs() < 1.0 - 1e-7
                            && (candidate.z - position.z).abs() < 1.0 - 1e-7
                    })
                });
                let delta_x = (point.x - candidate.x).abs();
                let delta_z = (point.z - candidate.z).abs();
                let distance = delta_x * delta_x + delta_z * delta_z;
                if !occupied && delta_x <= 0.5 && delta_z <= 0.5 && distance < closest_distance {
                    closest = candidate;
                    closest_distance = distance;
                }
            }
        }
        closest
    }

    fn die_state(&self, die_id: &str) -> Option<TableDieState> {
        let die = self.dice.get(die_id)?;
        Some(TableDieState {
            die_id: die.die_id.clone(),
            face: die.face as i32,
            transform: Some(transform_from_body(&self.world.bodies[die.body])),
            owner_player_id: die.owner_id.clone(),
            revision: die.revision,
            die_definition_id: die.definition_id.clone(),
            motion: die.motion as i32,
            active_roll_id: die.active_roll_id.clone().unwrap_or_default(),
        })
    }

    fn snapshot(&self) -> TableSnapshot {
        self.snapshot_with_revision(self.revision)
    }

    fn snapshot_with_revision(&self, revision: u64) -> TableSnapshot {
        TableSnapshot {
            table_id: TABLE_ID.to_owned(),
            revision,
            dice: self
                .die_order
                .iter()
                .filter_map(|die_id| self.die_state(die_id))
                .collect(),
            active_rolls: self
                .active_roll_order
                .iter()
                .filter_map(|roll_id| self.active_rolls.get(roll_id))
                .map(|roll| ActiveRoll {
                    roll_id: roll.roll_id.clone(),
                    roller_id: roll.roller_id.clone(),
                    mode: roll.mode as i32,
                    target_die_ids: roll.target_ids.clone(),
                    start_tick: roll.start_tick,
                })
                .collect(),
            active_drags: self
                .die_order
                .iter()
                .filter_map(|die_id| self.active_drags.get(die_id))
                .map(|drag| ActiveDrag {
                    die_id: drag.die_id.clone(),
                    player_id: drag.player_id.clone(),
                    interaction_id: drag.interaction_id.clone(),
                    sequence: drag.sequence,
                    target: Some(drag.target),
                })
                .collect(),
            physics_tick: self.physics_tick,
            bounds: Some(self.bounds),
        }
    }

    fn physics_frame(&self) -> PhysicsFrame {
        PhysicsFrame {
            tick: self.physics_tick,
            dice: self
                .die_order
                .iter()
                .filter_map(|die_id| {
                    let die = self.dice.get(die_id)?;
                    Some(DieTransform {
                        die_id: die_id.clone(),
                        transform: Some(transform_from_body(&self.world.bodies[die.body])),
                        motion: die.motion as i32,
                        revision: die.revision,
                    })
                })
                .collect(),
            bounds: Some(self.bounds),
        }
    }

    fn publish_frame(&self) {
        self.frame_tx.send_replace(Some(self.physics_frame()));
    }

    fn commit_event(&mut self, event: TableEvent) {
        let message = ServerMessage {
            payload: Some(server_message::Payload::Event(event)),
        };
        let failed: Vec<String> = self
            .clients
            .iter()
            .filter_map(|(connection_id, client)| {
                client
                    .reliable
                    .try_send(message.clone())
                    .err()
                    .map(|_| connection_id.clone())
            })
            .collect();
        for connection_id in failed {
            self.leave_client(&connection_id);
        }
    }

    fn reject(
        &self,
        connection_id: &str,
        request_id: &str,
        code: CommandRejectionCode,
        message: &str,
    ) {
        let Some(client) = self.clients.get(connection_id) else {
            return;
        };
        let _ = client.reliable.try_send(ServerMessage {
            payload: Some(server_message::Payload::Rejected(CommandRejected {
                request_id: request_id.to_owned(),
                code: code as i32,
                message: message.to_owned(),
            })),
        });
    }

    fn reject_invalid(&self, connection_id: &str, request_id: &str, message: &str) {
        self.reject(
            connection_id,
            request_id,
            CommandRejectionCode::InvalidCommand,
            message,
        );
    }
}

fn random_id(prefix: &str) -> String {
    let bytes: [u8; 24] = rand::random();
    format!("{prefix}-{}", URL_SAFE_NO_PAD.encode(bytes))
}

fn valid_point(point: &TablePoint) -> bool {
    point.x.is_finite()
        && point.z.is_finite()
        && point.x.abs() <= WORLD_LIMIT
        && point.z.abs() <= WORLD_LIMIT
}

fn launch_slots(center: (f64, f64), count: usize) -> Vec<(f64, f64)> {
    (0..count)
        .map(|index| {
            let column = (index % 4) as f64 - 1.5;
            let row = (index / 4) as f64 - 1.0;
            (
                center.0 + column * PATCH_SPACING,
                center.1 + row * PATCH_SPACING,
            )
        })
        .collect()
}

fn spiral_offsets(max_radius: i32) -> Vec<(i32, i32)> {
    let mut result = vec![(0, 0)];
    for radius in 1..=max_radius {
        for x in -radius..=radius {
            result.push((x, -radius));
            result.push((x, radius));
        }
        for z in (-radius + 1)..radius {
            result.push((-radius, z));
            result.push((radius, z));
        }
    }
    result
}

fn random_launch_pose(rng: &mut ChaCha20Rng, table_position: (f64, f64), index: usize) -> Pose {
    let quaternion = Rotation::from_xyzw(
        rng.random_range(-1.0..=1.0),
        rng.random_range(-1.0..=1.0),
        rng.random_range(-1.0..=1.0),
        rng.random_range(-1.0..=1.0),
    )
    .normalize();
    Pose::from_parts(
        Vector::new(
            table_position.0,
            rng.random_range(3.0..=5.0) + index as f64 * 0.005,
            table_position.1,
        ),
        quaternion,
    )
}

fn nontrivial_angular_velocity(rng: &mut ChaCha20Rng, index: usize) -> Vector {
    let mut value = Vector::new(
        rng.random_range(-6.0..=6.0),
        rng.random_range(-6.0..=6.0),
        rng.random_range(-6.0..=6.0),
    );
    if value.length() < 2.0 {
        value[index % 3] = if value[index % 3].is_sign_negative() {
            -2.0
        } else {
            2.0
        };
    }
    value
}

fn upward_face(rotation: &Rotation) -> DieFace {
    let faces = [
        (DieFace::One, Vector::new(0.0, 1.0, 0.0)),
        (DieFace::Six, Vector::new(0.0, -1.0, 0.0)),
        (DieFace::Two, Vector::new(1.0, 0.0, 0.0)),
        (DieFace::Five, Vector::new(-1.0, 0.0, 0.0)),
        (DieFace::Three, Vector::new(0.0, 0.0, 1.0)),
        (DieFace::Four, Vector::new(0.0, 0.0, -1.0)),
    ];
    faces
        .into_iter()
        .max_by(|(_, first), (_, second)| {
            (*rotation * *first).y.total_cmp(&(*rotation * *second).y)
        })
        .map(|(face, _)| face)
        .unwrap_or(DieFace::One)
}

fn face_up_rotation(face: DieFace) -> Rotation {
    let half_turn = std::f64::consts::FRAC_1_SQRT_2;
    let (x, y, z, w) = match face {
        DieFace::One | DieFace::Unspecified => (0.0, 0.0, 0.0, 1.0),
        DieFace::Six => (1.0, 0.0, 0.0, 0.0),
        DieFace::Two => (-0.5, -0.5, 0.5, 0.5),
        DieFace::Five => (-0.5, 0.5, -0.5, 0.5),
        DieFace::Three => (-half_turn, 0.0, 0.0, half_turn),
        DieFace::Four => (0.0, half_turn, -half_turn, 0.0),
    };
    Rotation::from_xyzw(x, y, z, w).normalize()
}

fn transform_from_body(body: &RigidBody) -> WorldTransform {
    let position = body.translation();
    let rotation = body.rotation();
    WorldTransform {
        position: Some(WorldVector3 {
            x: position.x,
            y: position.y,
            z: position.z,
        }),
        rotation: Some(WorldQuaternion {
            x: rotation.x,
            y: rotation.y,
            z: rotation.z,
            w: rotation.w,
        }),
    }
}

pub fn encode_server_message(message: &ServerMessage) -> Vec<u8> {
    message.encode_to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_room() -> RoomState {
        let (frames, _) = watch::channel(None);
        RoomState::new(frames)
    }

    fn join_test_client(room: &mut RoomState) -> (JoinedClient, mpsc::Receiver<ServerMessage>) {
        let (reliable, receiver) = mpsc::channel(RELIABLE_QUEUE_CAPACITY);
        let joined = room
            .join_client(String::new(), reliable)
            .expect("join test room");
        (joined, receiver)
    }

    fn start_standard_roll(room: &mut RoomState, joined: &JoinedClient, request_id: &str) {
        room.start_roll(
            &joined.connection_id,
            &joined.welcome.player_id,
            request_id,
            proto::StartRollCommand {
                mode: RollMode::AddNew as i32,
                target_die_ids: Vec::new(),
            },
        );
    }

    #[test]
    fn launch_patch_has_four_columns_and_three_rows() {
        let slots = launch_slots((0.0, 0.0), 12);
        assert_eq!(slots.len(), 12);
        assert!((slots[1].0 - slots[0].0 - PATCH_SPACING).abs() < 1e-12);
        assert!((slots[4].1 - slots[0].1 - PATCH_SPACING).abs() < 1e-12);
    }

    #[test]
    fn table_points_enforce_hidden_world_limit() {
        assert!(valid_point(&TablePoint { x: 10.0, z: -10.0 }));
        assert!(!valid_point(&TablePoint {
            x: WORLD_LIMIT + 1.0,
            z: 0.0,
        }));
        assert!(!valid_point(&TablePoint {
            x: f64::NAN,
            z: 0.0
        }));
    }

    #[test]
    fn face_up_rotations_round_trip() {
        for face in [
            DieFace::One,
            DieFace::Two,
            DieFace::Three,
            DieFace::Four,
            DieFace::Five,
            DieFace::Six,
        ] {
            assert_eq!(upward_face(&face_up_rotation(face)), face);
        }
    }

    #[test]
    fn seeded_launch_generation_is_repeatable() {
        let seed = [7_u8; 32];
        let mut first = ChaCha20Rng::from_seed(seed);
        let mut second = ChaCha20Rng::from_seed(seed);
        assert_eq!(
            random_launch_pose(&mut first, (2.0, -3.0), 0),
            random_launch_pose(&mut second, (2.0, -3.0), 0),
        );
        assert_eq!(
            nontrivial_angular_velocity(&mut first, 0),
            nontrivial_angular_velocity(&mut second, 0),
        );
    }

    #[test]
    fn enhanced_determinism_repeats_frames_and_faces() {
        fn simulate(seed: [u8; 32]) -> (Vec<Vec<WorldTransform>>, Vec<DieFace>) {
            let mut world = PhysicsWorld::new();
            world.gravity = Vector::new(0.0, -9.81, 0.0);
            world.integration_parameters.dt = FIXED_TIME_STEP;
            world.colliders.insert(
                ColliderBuilder::halfspace(Unit::new_unchecked(Vector::new(0.0, 1.0, 0.0)))
                    .friction(0.7)
                    .restitution(0.35),
            );
            let mut rng = ChaCha20Rng::from_seed(seed);
            let handles = launch_slots((0.0, 0.0), 12)
                .into_iter()
                .enumerate()
                .map(|(index, position)| {
                    let body = RigidBodyBuilder::dynamic()
                        .pose(random_launch_pose(&mut rng, position, index))
                        .linvel(Vector::new(
                            rng.random_range(-1.5..=1.5),
                            rng.random_range(3.5..=5.0),
                            rng.random_range(-1.5..=1.5),
                        ))
                        .angvel(nontrivial_angular_velocity(&mut rng, index))
                        .linear_damping(0.14)
                        .angular_damping(0.18)
                        .ccd_enabled(true)
                        .can_sleep(true);
                    let collider =
                        ColliderBuilder::cuboid(DIE_HALF_EXTENT, DIE_HALF_EXTENT, DIE_HALF_EXTENT)
                            .mass(1.0)
                            .friction(0.7)
                            .restitution(0.35);
                    world.insert(body, collider).0
                })
                .collect::<Vec<_>>();
            let mut frames = Vec::new();
            for tick in 1..=900 {
                world.step();
                if tick % FRAME_INTERVAL_TICKS == 0 {
                    frames.push(
                        handles
                            .iter()
                            .map(|handle| transform_from_body(&world.bodies[*handle]))
                            .collect(),
                    );
                }
            }
            let faces = handles
                .into_iter()
                .map(|handle| upward_face(world.bodies[handle].rotation()))
                .collect();
            (frames, faces)
        }

        let first = simulate([42; 32]);
        let second = simulate([42; 32]);
        assert_eq!(first, second);
        assert!(
            first
                .0
                .last()
                .is_some_and(|frame| frame.iter().all(|transform| {
                    transform
                        .position
                        .is_some_and(|position| position.x.is_finite() && position.z.is_finite())
                }))
        );
        assert!(first.1.iter().all(|face| *face != DieFace::Unspecified));
    }

    #[test]
    fn active_roll_settles_to_server_faces_and_canonical_rotations() {
        let mut room = test_room();
        let (joined, _messages) = join_test_client(&mut room);
        start_standard_roll(&mut room, &joined, "roll");

        for _ in 0..3_000 {
            room.step();
            if room.active_rolls.is_empty() {
                break;
            }
        }

        assert!(room.active_rolls.is_empty());
        assert_eq!(room.dice.len(), 12);
        assert!(room.dice.values().all(|die| {
            die.motion == DieMotionState::Settled
                && die.face != DieFace::Unspecified
                && upward_face(room.world.bodies[die.body].rotation()) == die.face
        }));
    }

    #[test]
    fn players_can_roll_concurrently_in_distinct_launch_patches() {
        let mut room = test_room();
        let (first, _first_messages) = join_test_client(&mut room);
        let (second, _second_messages) = join_test_client(&mut room);
        start_standard_roll(&mut room, &first, "first-roll");
        start_standard_roll(&mut room, &second, "second-roll");

        assert_eq!(room.active_rolls.len(), 2);
        let first_ids = room
            .active_rolls
            .values()
            .find(|roll| roll.roller_id == first.welcome.player_id)
            .expect("first roll")
            .target_ids
            .clone();
        let second_ids = room
            .active_rolls
            .values()
            .find(|roll| roll.roller_id == second.welcome.player_id)
            .expect("second roll")
            .target_ids
            .clone();
        assert!(first_ids.iter().all(|die_id| !second_ids.contains(die_id)));
        assert!(first_ids.iter().all(|first_id| {
            let first_position = room.world.bodies[room.dice[first_id].body].translation();
            second_ids.iter().all(|second_id| {
                let second_position = room.world.bodies[room.dice[second_id].body].translation();
                (first_position.x - second_position.x).abs() >= 1.05
                    || (first_position.z - second_position.z).abs() >= 1.05
            })
        }));

        start_standard_roll(&mut room, &first, "duplicate-roll");
        assert_eq!(room.active_rolls.len(), 2);
    }

    #[test]
    fn disconnect_cancels_only_that_players_roll() {
        let mut room = test_room();
        let (first, _first_messages) = join_test_client(&mut room);
        let (second, _second_messages) = join_test_client(&mut room);
        start_standard_roll(&mut room, &first, "first-roll");
        start_standard_roll(&mut room, &second, "second-roll");

        room.leave_client(&first.connection_id);

        assert_eq!(room.active_rolls.len(), 1);
        assert!(
            room.active_rolls
                .values()
                .all(|roll| roll.roller_id == second.welcome.player_id)
        );
        assert_eq!(room.dice.len(), 12);
        assert!(
            room.dice
                .values()
                .all(|die| die.owner_id == second.welcome.player_id)
        );
    }

    #[test]
    fn drag_targets_are_authoritative_and_bounds_never_shrink() {
        let mut room = test_room();
        let (joined, _messages) = join_test_client(&mut room);
        start_standard_roll(&mut room, &joined, "roll");
        room.complete_rolls();
        let die_id = room.die_order[0].clone();
        let original_bounds = room.bounds;

        room.start_drag(
            &joined.connection_id,
            &joined.welcome.player_id,
            "drag-start",
            die_id.clone(),
            "interaction".into(),
            0,
            Some(TablePoint { x: 50.0, z: 40.0 }),
        );
        room.update_drag(
            &joined.connection_id,
            &joined.welcome.player_id,
            "drag-end",
            die_id.clone(),
            "interaction".into(),
            1,
            Some(TablePoint { x: 50.0, z: 40.0 }),
            true,
        );
        let translated = room.world.bodies[room.dice[&die_id].body].translation();
        assert_eq!(
            (translated.x, translated.y, translated.z),
            (50.0, 0.5, 40.0)
        );
        assert_eq!(room.dice[&die_id].motion, DieMotionState::Settled);
        assert!(room.bounds.max_x > original_bounds.max_x);
        assert!(room.bounds.max_z > original_bounds.max_z);
        let expanded = room.bounds;

        room.world.bodies[room.dice[&die_id].body]
            .set_translation(Vector::new(0.0, DIE_CENTER_HEIGHT, 0.0), false);
        room.update_bounds();
        assert_eq!(room.bounds, expanded);
    }

    #[tokio::test]
    async fn resume_token_restores_player_identity() {
        let room = spawn_room();
        let first = room.join(String::new()).await.unwrap();
        let player_id = first.welcome.player_id.clone();
        let token = first.welcome.resume_token.clone();
        room.leave(first.connection_id).await;
        let resumed = room.join(token).await.unwrap();
        assert_eq!(resumed.welcome.player_id, player_id);
    }

    #[tokio::test]
    async fn server_allocates_the_standard_dice() {
        let room = spawn_room();
        let mut session = room.join(String::new()).await.unwrap();
        room.command(
            session.connection_id.clone(),
            ClientMessage {
                request_id: "roll".into(),
                payload: Some(client_message::Payload::StartRoll(
                    proto::StartRollCommand {
                        mode: RollMode::AddNew as i32,
                        target_die_ids: Vec::new(),
                    },
                )),
            },
        )
        .await;
        let message = session.reliable.recv().await.unwrap();
        let Some(server_message::Payload::Event(event)) = message.payload else {
            panic!("expected roll event");
        };
        let Some(table_event::Payload::RollStarted(started)) = event.payload else {
            panic!("expected roll started");
        };
        assert_eq!(started.dice.len(), 12);
        assert!(
            started
                .dice
                .iter()
                .all(|die| die.owner_player_id == session.welcome.player_id)
        );
    }
}

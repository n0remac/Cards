pub mod proto;
pub mod room;
pub mod server;

pub use room::{RoomHandle, spawn_room};
pub use server::{DiceServiceConfig, app};

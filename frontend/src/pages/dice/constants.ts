export const SIMULATION_VERSION = 5;
export const MIN_DICE = 1;
export const MAX_DICE = 10;
export const DEFAULT_DICE = 3;

export const GRAVITY = [0, -9.81, 0] as const;
export const PHYSICS_TIMESTEP = 1 / 60;
export const DIE_SIZE = 1;
export const DIE_COLLIDER_HALF_EXTENT = 0.48;
export const DIE_MASS = 1;
export const FRICTION = 0.7;
export const RESTITUTION = 0.35;
export const LINEAR_DAMPING = 0.1;
export const ANGULAR_DAMPING = 0.15;

export const SETTLE_SPEED_THRESHOLD = 0.05;
export const SETTLE_STEPS = 20;

export const TRAY_HALF_WIDTH = 7;
export const TRAY_HALF_DEPTH = 5;
export const TRAY_FLOOR_THICKNESS = 0.25;
export const TRAY_WALL_THICKNESS = 0.35;
export const TRAY_WALL_COLLIDER_HEIGHT = 8;
export const TABLE_HALF_EXTENT = 40;

export const ESCAPE_BOUNDS = {
  x: TABLE_HALF_EXTENT - DIE_SIZE,
  y: -3,
  z: TABLE_HALF_EXTENT - DIE_SIZE,
} as const;

export const SPAWN_HEIGHT_MIN = 3;
export const SPAWN_HEIGHT_MAX = 5;
export const SPAWN_JITTER = 0.14;

export const SPAWN_SLOTS = [
  [-3.8, -1.7],
  [-1.9, -1.7],
  [0, -1.7],
  [1.9, -1.7],
  [3.8, -1.7],
  [-3.8, 1.7],
  [-1.9, 1.7],
  [0, 1.7],
  [1.9, 1.7],
  [3.8, 1.7],
] as const;

export const CAMERA_DESKTOP_POSITION = [0, 24, 12] as const;
export const CAMERA_DESKTOP_FOV = 42;
export const CAMERA_MOBILE_POSITION = [0, 32, 16] as const;
export const CAMERA_MOBILE_FOV = 48;
export const CAMERA_MOBILE_ASPECT = 0.9;

export const HORIZONTAL_IMPULSE_MAX = 3;
export const VERTICAL_IMPULSE_MAX = 1.5;
export const TORQUE_MAX = 12;
export const MIN_TORQUE_MAGNITUDE = 6;
export const QUATERNION_TOLERANCE = 0.001;
export const MAX_ROLL_ID = 0xffffffff;

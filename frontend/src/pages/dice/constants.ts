export const SIMULATION_VERSION = 1;
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

export const TRAY_HALF_WIDTH = 5;
export const TRAY_HALF_DEPTH = 3.5;
export const TRAY_FLOOR_THICKNESS = 0.25;
export const TRAY_WALL_THICKNESS = 0.35;
export const TRAY_WALL_HEIGHT = 1.35;

export const ESCAPE_BOUNDS = {
  x: TRAY_HALF_WIDTH + 1,
  y: -2,
  z: TRAY_HALF_DEPTH + 1,
} as const;

export const SPAWN_HEIGHT_MIN = 3;
export const SPAWN_HEIGHT_MAX = 5;
export const SPAWN_JITTER = 0.14;

export const SPAWN_SLOTS = [
  [-3.6, -1.45],
  [-1.8, -1.45],
  [0, -1.45],
  [1.8, -1.45],
  [3.6, -1.45],
  [-3.6, 1.45],
  [-1.8, 1.45],
  [0, 1.45],
  [1.8, 1.45],
  [3.6, 1.45],
] as const;

export const HORIZONTAL_IMPULSE_MAX = 3;
export const VERTICAL_IMPULSE_MAX = 1.5;
export const TORQUE_MAX = 12;
export const MIN_TORQUE_MAGNITUDE = 6;
export const QUATERNION_TOLERANCE = 0.001;
export const MAX_ROLL_ID = 0xffffffff;

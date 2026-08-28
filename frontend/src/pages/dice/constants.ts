export const DICE_TABLE_CONFIG = {
  simulationVersion: 3,
  count: {
    minimumPerRoll: 1,
    maximumPerRoll: 10,
    defaultPerRoll: 3,
  },
  physics: {
    gravity: [0, -9.81, 0] as const,
    timeStep: 1 / 60,
    friction: 0.7,
    restitution: 0.35,
  },
  die: {
    size: 1,
    colliderHalfExtent: 0.48,
    mass: 1,
    linearDamping: 0.14,
    angularDamping: 0.18,
    dragHeight: 0.58,
  },
  arena: {
    floorThickness: 0.25,
    floorHalfExtent: 80,
    wallThickness: 0.28,
    wallHeight: 1.45,
    containmentPadding: 0.04,
    recoveryMinimumY: -2.5,
    reflectedVelocity: 0.42,
    tangentVelocity: 0.72,
    aspectKeyPrecision: 4,
  },
  camera: {
    desktopPosition: [0, 24, 12] as const,
    desktopFov: 42,
    mobilePosition: [0, 32, 16] as const,
    mobileFov: 48,
    mobileAspectBreakpoint: 0.9,
    minimumHalfTableWidth: 7.35,
  },
  roll: {
    settleSpeedThreshold: 0.05,
    settleSteps: 20,
    spawnHeightMinimum: 3,
    spawnHeightMaximum: 5,
    spawnJitter: 0.018,
    horizontalImpulseMaximum: 3,
    verticalImpulseMaximum: 1.5,
    torqueMaximum: 12,
    minimumTorqueMagnitude: 6,
    quaternionTolerance: 0.001,
    normalizedSpawnSlots: [
      [0.2, 0.32],
      [0.35, 0.32],
      [0.5, 0.32],
      [0.65, 0.32],
      [0.8, 0.32],
      [0.2, 0.58],
      [0.35, 0.58],
      [0.5, 0.58],
      [0.65, 0.58],
      [0.8, 0.58],
    ] as const,
  },
  reconciliation: {
    easing: 0.18,
    positionTolerance: 0.035,
  },
} as const;

export const SIMULATION_VERSION = DICE_TABLE_CONFIG.simulationVersion;
export const MIN_DICE = DICE_TABLE_CONFIG.count.minimumPerRoll;
export const MAX_DICE = DICE_TABLE_CONFIG.count.maximumPerRoll;
export const DEFAULT_DICE = DICE_TABLE_CONFIG.count.defaultPerRoll;

# Dice Roller

This directory contains the client-only, physics-driven D6 roller served at `/dice`. It supports 1–10 dice, uses Rapier as the authority for live transforms and final orientations, and produces replayable protobuf `RollSpec` and `RollResult` messages.

The route is lazy-loaded from `App.tsx`, so Three.js, React Three Fiber, Rapier, and the Rapier WASM loader are not part of the initial bundle for ordinary blog routes.

## Design boundaries

The feature deliberately separates durable roll data from browser rendering and physics implementation details:

```text
local random generation
        ↓
  protobuf RollSpec
        ↓
 validated startRoll()
        ↓
  Rapier simulation
        ↓
roll-wide stable window
        ↓
 protobuf RollResult
        ↓
 accessible HTML result
```

- React owns the selected count, active specification, roll phase, and final result.
- Rapier owns die positions, rotations, and velocities while a roll is active.
- `createLocalRollSpec()` is the only source of randomness.
- `startRoll(spec)` validates and executes supplied data without adding randomness.
- Faces are read only after the whole roll settles; individual dice never finalize early.
- Three.js, Rapier, React, and UI concepts do not appear in the protobuf schema.

The protobuf schema is [`proto/dice/v1/dice.proto`](../../../../proto/dice/v1/dice.proto), and the generated browser messages are in [`rpc/proto/dice/v1/dice_pb.ts`](../../rpc/proto/dice/v1/dice_pb.ts). Generated files should not be edited by hand.

## Directory map

| File | Responsibility |
| --- | --- |
| `DiceGame.tsx` | Route UI, accessible controls and results, loading/WebGL/error states, and the scene error boundary. |
| `useDiceRoll.ts` | Browser-side controller for count, active `RollSpec`, roll phase, stale completion rejection, and final `RollResult`. |
| `DiceScene.tsx` | React Three Fiber canvas, Rapier world, tray, camera, rigid-body registry, escape handling, and roll-wide settling observer. |
| `Die.tsx` | Shared die geometry/materials, pip layout, explicit cuboid collider, rigid-body registration, and applying a supplied throw. |
| `rollModel.ts` | Pure roll generation, protobuf validation, result construction, settled-event validation, ordering, and deterministic escape recovery. |
| `diceMath.ts` | Protobuf-to-physics adapters, quaternion face detection, global settling progression, and escape-bound checks. |
| `sceneLayout.ts` | Pure desktop/mobile camera selection. |
| `constants.ts` | Simulation version, physics parameters, tray dimensions, spawn slots, thresholds, bounds, and camera presets. |
| `*.test.ts` | Vitest coverage for contracts, generation, face math, settling, results, recovery, and responsive framing. |

## Roll lifecycle

1. `DiceGame` calls `controller.roll()`.
2. `useDiceRoll` increments the `rollId` and calls `createLocalRollSpec(count, rollId)`.
3. Roll generation selects predefined non-overlapping spawn slots, adds bounded jitter, creates a uniform unit quaternion, and supplies impulse and torque values.
4. Every physics input is normalized with `Math.fround()` before the protobuf message is constructed. This keeps a fresh roll and a protobuf binary round trip on the same float32 inputs.
5. `startRoll(spec)` rejects unsupported or malformed specifications, clears the previous result, and changes the phase to `rolling`.
6. `DiceScene` keys each die by `rollId:dieIndex`, registers its Rapier body, and `Die` applies the supplied translation, rotation, impulse, and torque.
7. After every fixed physics step, `RollSettlingObserver` checks every registered die. If one body is missing, moving too quickly, or recovered after an escape, the shared stable-step count resets.
8. After all dice remain below both velocity thresholds for 20 consecutive steps, the observer reads every final quaternion in the same step and emits one `RollSettledEvent`.
9. The controller rejects stale or repeated completion events, builds an indexed and sorted `RollResult`, calculates its total, and changes the phase to `settled`.

Rolling again while dice are moving creates a new roll ID and makes callbacks from the replaced roll stale. Count controls remain disabled until the current roll settles.

## Replay contract and simulation versions

`RollSpec` contains the complete initial conditions needed by this client:

- `simulation_version`
- `roll_id`
- ordered die indices
- position and rotation
- impulse and torque

The current `SIMULATION_VERSION` is `2`. A spec is accepted only when its version matches the client and when it has:

- 1–10 dice;
- unique, contiguous indices beginning at zero;
- present, finite, float32 vectors and quaternions;
- a normalized quaternion for every die; and
- a positive uint32 roll ID.

A `RollSpec` is replayable only with the matching simulation version and pinned client physics implementation. It is not a permanent cross-version lockstep guarantee. Changes to colliders, tray geometry, physics values, throw application, settling rules, or face evaluation can change outcomes and therefore require a simulation-version review. Future multiplayer should send an authoritative result alongside the spec and use local physics primarily for animation and reconciliation.

## Physics and tray

The fixed configuration is centralized in `constants.ts`:

- gravity: `[0, -9.81, 0]`;
- timestep: `1 / 60`;
- die mass: `1`;
- friction: `0.7`;
- restitution: `0.35`;
- linear damping: `0.1`;
- angular damping: `0.15`;
- CCD and sleeping enabled.

The visual die is an ivory rounded box with dark pip discs, while collision uses a separate cuboid collider. Decorative geometry therefore cannot change collision behavior.

The tray has a 14×10-unit felt play surface, an explicit floor collider, and four overlapping walnut wall colliders. The walls are intentionally high because the existing torque envelope can produce energetic throws. Camera presets use a steeper view on both desktop and narrow screens so the enlarged felt remains visible.

Ten fixed spawn slots keep dice separated before bounded jitter is applied. Spawn heights remain between 3 and 5 units.

## Settling and face mapping

Settling is a roll-level rule. On each actual Rapier step:

- every die must have linear speed below `0.05`;
- every die must have angular speed below `0.05`;
- the conditions must hold for 20 consecutive steps; and
- movement by any one die resets the shared counter to zero.

Only after that shared window completes are final faces read. This prevents a die from being reported and then changed by a later collision.

Face values use these local normals:

```text
+Y = 1    -Y = 6
+X = 2    -X = 5
+Z = 3    -Z = 4
```

`getUpwardFace()` rotates each normal by the final Rapier quaternion and selects the one with the largest dot product against world up `(0, 1, 0)`.

## Escape recovery

The enlarged tray makes recovery a fallback rather than the normal path. If a body crosses the centralized escape bounds, the roll-wide observer:

1. moves it to its predefined safe slot at height 4;
2. restores the supplied rotation;
3. clears linear/angular velocity, forces, and torque;
4. applies a reduced center-directed impulse and half of the supplied torque; and
5. resets the shared settling counter.

Recovery contains no randomness, so it remains deterministic for the active specification.

## Accessibility and failure states

The HTML interface remains usable without interpreting the 3D scene:

- count and roll controls are native buttons with visible focus styles;
- status and results use an `aria-live="polite"` region;
- results are rendered as ordered text such as `5 + 2 + 6 = 13`;
- count changes are locked while rolling;
- loading, unsupported WebGL, initialization error, idle, rolling, and settled states are distinct; and
- the Canvas is wrapped in a route-local error boundary.

## Testing and development

From the repository root:

```bash
npm test
npm run build
```

To run only this feature's tests:

```bash
npx vitest run frontend/src/pages/dice
```

The tests cover:

- all six face orientations and opposite-face conventions;
- protobuf/physics adapters;
- float32 roll generation and binary round trips;
- count, index, spawn, impulse, torque, and version validation;
- shared 20-step settling and reset behavior;
- stale/duplicate result data, ordering, and totals;
- deterministic escape recovery; and
- desktop/mobile camera framing for the enlarged tray.

When changing the feature, also manually check 1, 3, and 10 dice, rerolls during motion, face/result agreement, collisions, responsive framing, keyboard controls, and WebGL failure behavior.

## Maintenance rules

- Keep new dice-specific code in this directory unless it is a genuinely shared contract or generated artifact.
- Keep randomness in `createLocalRollSpec()` and allow an injected random source for tests.
- Never mirror per-frame Rapier transforms into React state.
- Do not finalize individual dice; preserve the roll-wide stable window.
- Build `RollResult` through the existing pure helpers so ordering and totals cannot diverge.
- Validate externally supplied specs before touching physics bodies.
- Treat `rollId` as the stale-event boundary.
- Review and usually increment `SIMULATION_VERSION` whenever a change can alter replay behavior.

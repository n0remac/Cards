# Dice table

This directory contains the persistent, phone-first D6 table at `/dice`. Rapier
owns local animation. The rolling player owns the canonical values and final
approximate placements that will eventually be shared over a live transport.

Exact physics replay is intentionally not a protocol guarantee. A `RollSpec` is
shared animation input so phones begin with similar throws. A `RollCompleted`
event replaces observer-calculated values with the roller-reported values and
reconciles normalized placements.

## Responsibilities

| File | Responsibility |
| --- | --- |
| `DiceGame.tsx` | Route presentation, loading/error state, and bottom controls. |
| `useDiceTable.ts` | UI controller and construction of local domain events. Exposes add-new, reroll, selection, drag, settlement, and remote-event commands. |
| `tableModel.ts` | Pure reducer for the persistent die map, stable ordering, active roll, snapshots, drag sequences, and reconciliation targets. |
| `tableEventAdapter.ts` | Synchronous loopback adapter with the same publish/receive boundary expected from a future network adapter. |
| `arenaLayout.ts` | Pure aspect-derived camera, edge walls, playable quadrilateral, floor/shadow bounds, normalized mapping, and containment correction. |
| `DiceArena.tsx` | Camera and Rapier floor/wall collider ownership. The floor and responsive wall bodies are separate. |
| `RollObserver.tsx` | Post-step containment, active-roll settlement, face reading, and displaced-die placement reporting. |
| `Die.tsx` | Stable Rapier body, visual, body-mode transitions, pointer dragging, and result reconciliation. |
| `rollModel.ts` | Shared animation input generation and validation plus authoritative result construction. |
| `diceMath.ts` | Face/quaternion and settlement math with no React or Rapier dependency. |

## State and events

All table mutations use revisioned protobuf `TableEvent` values. The local
adapter immediately loops those events back into the reducer; a future
WebSocket adapter can deliver the same messages without introducing a second
single-player code path.

The reducer stores dice by stable `dieId`. `dieOrder` controls rendering order,
while an active roll only identifies the bodies being watched for settlement.
Starting an add-new roll appends bodies. Starting a reroll reuses existing IDs.
Only one roll can be active, but all prior dice remain mounted and collidable.

The controller exposes `selectedDieIds`, `setSelectedDieIds()`,
`reroll(dieIds)`, and `rerollSelected()`. Selection/grouping UI is intentionally
deferred.

## Body modes

- `rolling`: dynamic, CCD enabled, all rotations enabled, and supplied throw
  impulse/torque applied once per global roll ID.
- `settled`: dynamic translation with all rotations locked. The canonical
  face-up quaternion survives collisions and dragging.
- `held`: kinematic-position-based. Pointer rays intersect a horizontal table
  plane and publish normalized drag events. Release restores a dynamic,
  rotation-locked body with zero angular velocity.

Settled dice may still slide when struck. At roll settlement, the roller reports
placements for every rolled die and any existing die displaced far enough by a
collision.

## Arena and resizing

`ArenaLayout` depends only on the viewport aspect ratio. The camera projects the
four screen corners onto the table plane, and those projections are the wall
collider centerlines. The CSS wood border is therefore the visible wall at every
screen size; the Rapier walls do not remain at a fixed center tray.

The playable quadrilateral is inset by the die radius and wall thickness. Table
positions use normalized `u/v` coordinates over this quadrilateral. On an aspect
change, settled/held dice remap from their normalized positions while rolling
dice are contained in the new shape.

Walls are intentionally short. Fast or airborne dice that cross a collider are
projected just inside the nearest playable edge and their outward velocity is
reflected and damped. A fallen die keeps its edge-relative x/z position rather
than respawning at the center.

Equivalent pixel-size changes share the same rounded aspect key, so they do not
remount the responsive wall body.

## Multiplayer contract

The protobuf schema supports:

- stable die IDs alongside roll-order indices;
- add-new and reroll-existing modes;
- normalized table positions, placements, die state, and snapshots;
- roll-start and roll-complete events with roller identity, animation input,
  authoritative values, and changed placements;
- sequenced drag start/update/end events with player and interaction identity;
- a revisioned event envelope suitable for snapshot plus event-stream sync.

Simulation version `3` is the first published version of this completed
foundation. It describes compatible animation input interpretation, not
lockstep deterministic physics.

## Verification

`npm test` covers reducer transitions, contract binary round trips, normalized
mapping properties, representative viewport ratios, all four edge walls,
containment correction, canonical face quaternions, and direct Rapier CCD/body
mode behavior. `npm run build` produces the browser bundle.

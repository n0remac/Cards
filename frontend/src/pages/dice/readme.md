# Letter dice table

This directory contains the persistent, phone-first letter-dice table at
`/dice`. The standard catalog has twelve stable die definitions and maps each
definition's written six-letter string directly to physical faces one through
six. Rapier owns local animation. The rolling player owns the canonical faces and final
approximate placements that will eventually be shared over a live transport.

Exact physics replay is intentionally not a protocol guarantee. A `RollSpec` is
shared animation input so phones begin with similar throws. A `RollCompleted`
event replaces observer-calculated faces with the roller-reported faces and
reconciles normalized placements.

## Responsibilities

| File | Responsibility |
| --- | --- |
| `DiceGame.tsx` | Route presentation, loading/error state, and bottom controls. |
| `letterDice.ts` | Pure fixed catalog, definition validation, and physical-face-to-letter resolution. |
| `tableCommands.ts` | Pure construction of first-roll, add-new, targeted-reroll, and reroll-all targets. |
| `useDiceTable.ts` | UI controller and construction of local domain events. Exposes roll-all, definition-based add-new, reroll, selection, drag, settlement, and remote-event commands. |
| `tableModel.ts` | Pure reducer for the persistent die map, stable ordering, active roll, snapshots, drag sequences, and reconciliation targets. |
| `tableEventAdapter.ts` | Synchronous loopback adapter with the same publish/receive boundary expected from a future network adapter. |
| `arenaLayout.ts` | Pure aspect-derived camera, edge walls, playable quadrilateral, visual-floor/shadow bounds, normalized mapping, and containment correction. |
| `DiceArena.tsx` | Camera, fitted visual floor, and Rapier floor/wall collider ownership. The visual receiver and physics floor are separate. |
| `RollObserver.tsx` | Post-step containment, active-roll settlement, face reading, and displaced-die placement reporting. |
| `Die.tsx` | Stable Rapier body, cached canvas letter materials, body-mode transitions, pointer dragging, and result reconciliation. |
| `dieSnapping.ts` | Pure open-edge selection for half-width drag snapping without overlapping occupied positions. |
| `letterStringDetection.ts` | Pure tolerant adjacency graph, maximal string derivation, and normalized crossword-grid layout. |
| `LetterStringObserver.tsx` | Live Rapier-position adapter that resolves playable faces and reports changed strings and shapes. |
| `rollModel.ts` | Shared animation input generation and validation plus authoritative result construction. |
| `diceMath.ts` | Face/quaternion and settlement math with no React or Rapier dependency. |

## State and events

All table mutations use revisioned protobuf `TableEvent` values. The local
adapter immediately loops those events back into the reducer; a future
WebSocket adapter can deliver the same messages without introducing a second
single-player code path.

The reducer stores dice by stable `dieId`. `dieOrder` controls rendering order,
while an active roll only identifies the bodies being watched for settlement.
Each instance keeps a stable `dieId` separate from its fixed
`dieDefinitionId`. Starting an add-new roll appends bodies. Starting a reroll
reuses existing IDs and definitions.
Only one roll can be active, but all prior dice remain mounted and collidable.

`rollAll()` creates the standard twelve-die catalog on an empty table. On a
populated table it rerolls every instance from its current normalized position,
including any extra dice added through the internal `rollNew(definitionIds)`
capability. The controller also exposes selection and targeted-reroll commands,
but selection/grouping and add-new UI are intentionally deferred.

## Body modes

- `rolling`: dynamic, CCD enabled, all rotations enabled, and supplied throw
  impulse/torque applied once per global roll ID.
- `settled`: dynamic translation with all rotations locked. The canonical
  face-up quaternion turns the top letter upright toward screen-up and survives
  collisions and dragging.
- `held`: kinematic-position-based. Pointer rays intersect a horizontal table
  plane and publish normalized drag events. Within half a die width of an open
  neighboring edge, the held die snaps into exact alignment while it is moved
  and when it is released. Release restores a dynamic, rotation-locked body
  with zero angular velocity. The canvas owns touch gestures, and native pointer
  cancellation/lost-capture events settle a held die at its last accepted
  position.

Settled dice may still slide when struck. At roll settlement, the roller reports
placements for every rolled die and any existing die displaced far enough by a
collision.

## Live letter strings

`LetterStringObserver` reads the current Rapier body positions after physics
steps, so its output follows held dice and collision-displaced settled dice
rather than relying on potentially stale normalized placements. Rolling dice and
bodies without playable faces are omitted. It only reports to React when the
detected result changes.

The pure detector builds separate horizontal and vertical adjacency graphs.
Centers must be between `0.65` and `1.35` die widths apart on the word axis and
within `0.35` die widths on the cross axis. Each connected component becomes one
maximal two-or-more-letter string; horizontal strings read left-to-right and
vertical strings read top-to-bottom. The combined directional graph also assigns
integer row and column steps to every connected die, normalizes each disconnected
formation to its own compact grid, and drives the temporary lower-left crossword
preview. Dictionary validation is intentionally deferred.

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

The shadow-receiving floor is a viewport-fitted, subdivided plane. It stays in
front of the camera and avoids interpolating shadow coordinates across the two
screen-spanning triangles of the much larger physics floor. Rapier retains its
fixed 160-by-160 floor collider independently of the rendered receiver.

Directional shadow bounds are projected into the angled light's camera space.
They cover the visible floor and dice up to the maximum throw height, including
the deeper off-center table footprint used by portrait mobile layouts.

## Multiplayer contract

The protobuf schema supports:

- stable die IDs alongside roll-order indices;
- fixed definition IDs on throw, result, and snapshot entries;
- add-new and reroll-existing modes;
- normalized table positions, placements, die state, and snapshots;
- roll-start and roll-complete events with roller identity, animation input,
  authoritative physical faces, and changed placements;
- sequenced drag start/update/end events with player and interaction identity;
- a revisioned event envelope suitable for snapshot plus event-stream sync.

Clients derive visible letters from the shared fixed catalog rather than
transmitting a redundant mutable letter. Simulation version `4` publishes this
letter-die interpretation. It describes compatible animation input meaning,
not lockstep deterministic physics.

## Verification

`npm test` covers reducer transitions, contract binary round trips, normalized
mapping properties, representative viewport ratios, all four edge walls,
containment correction, canonical face quaternions, and direct Rapier CCD/body
mode behavior. `npm run build` produces the browser bundle.

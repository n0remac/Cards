# Letter dice table

This directory contains the browser half of the shared letter-dice table at
`/dice`. Browsers render the room and send user intent; the Rust dice service is
the sole authority for physics, positions, orientations, faces, rolls, drags,
and settlement.

The service uses absolute double-precision world coordinates. Clients buffer
authoritative 20 Hz frames and render about 100 ms behind the server, so network
timing may differ while every player still converges on the same world state.

## Responsibilities

| File or directory | Responsibility |
| --- | --- |
| `DiceGame.tsx` | Route presentation, room status, roll controls, and camera actions. |
| `constants.ts` | Small view and word-detection constants shared inside the feature. |
| `table/` | Canonical client-side table model, command construction, die catalog, and controller. |
| `table/tableModel.ts` | Pure reducer for welcome snapshots and revisioned lifecycle events. |
| `table/tableCommands.ts` | Pure construction of add-new and owned-dice reroll commands. |
| `table/useDiceTable.ts` | UI controller for transport messages, pending commands, drag prediction, and ownership. |
| `sync/` | Feature-local transport adapters and authoritative-frame interpolation. |
| `sync/webSocketTableTransport.ts` | Binary protobuf WebSocket, resume-token storage, reconnects, lifecycle revision checks, and stale-frame filtering. |
| `sync/frameInterpolation.ts` | Six-tick frame buffer and position/quaternion interpolation without extrapolation. |
| `scene/` | React Three Fiber rendering, field/camera gestures, meshes, owner designs, and visual drag prediction. |
| `scene/TableCamera.ts` | Fixed-angle camera, coordinate rebasing, bounds-aware pan/zoom, and fit transitions. |
| `scene/DiceArena.tsx` | Large felt receiver centered under the local render origin; it has no walls or physics. |
| `scene/Die.tsx` | Mesh-only die rendering, ownership-gated pointer input, and world-space drag targets. |
| `scene/LetterStringObserver.tsx` | Adapter from authoritative settled die state to pure word detection. |
| `words/` | Letter-string detection, crossword validation, and the bundled dictionary adapter and asset. |

The shared protocol is
[`proto/dice/v1/dice.proto`](../../../../proto/dice/v1/dice.proto). Go and
TypeScript generated outputs are committed, and the Rust service compiles that
same schema with `prost-build`.

## Authority and synchronization

Every visitor joins one process-local room. The Rust room actor serializes
connections, commands, fixed 60 Hz Rapier simulation, snapshots, lifecycle
events, and 20 Hz complete-world frames. A private resume token in
`localStorage` restores anonymous ownership after reload; multiple tabs with the
same token share that identity.

Lifecycle events have consecutive room revisions. A client reconnects if it
observes a gap, and the next `Welcome` replaces canonical state from a complete
snapshot. Physics frames have an independent increasing tick: stale frames are
discarded and missing frames are never extrapolated. Superseded frames may be
coalesced for slow sockets, while lifecycle events remain reliable.

An empty `ADD_NEW` command asks the server to allocate the standard twelve dice.
Later rolls contain only the IDs of the local player's settled dice. The server
creates the launch transforms and velocities, simulates all cross-player
collisions, derives the final faces, snaps the final orientations, and publishes
the results. Concurrent player rolls settle together after the shared world is
quiet.

Dragging is also authoritative. The owner sees an immediate visual-only overlay
while targets are sent at no more than 30 Hz plus a final target. The service
moves a kinematic body at tick boundaries and returns it to a rotation-locked
dynamic body at drag end. Rejection, disconnect, or a replacement snapshot
clears the local prediction.

## Field and camera

The physical world has an infinite floor and no walls. Canonical table bounds
are the monotonic union of every dice AABB seen by the service, with a 16-by-12
minimum. They constrain camera targets and determine how far the user can zoom
out, but they do not create a visible or physical edge.

The camera keeps a fixed tilt and azimuth. Desktop users left-drag empty felt to
pan and wheel to zoom around the pointer. On touch devices, one finger drags an
owned die and two fingers pan and pinch; adding a second finger ends an active
die drag before the camera gesture takes over. “My dice” and “Fit table” animate
to calculated views without changing shared state. Remote activity never moves
an established local camera.

Rendering is rebased around the local camera target before values reach WebGL,
preserving GPU precision while the protocol and reducer retain absolute f64
coordinates. A large felt plane follows that render origin so no edge appears
while panning.

## Live letter strings

Only authoritative settled dice participate in word detection. The pure
detector builds horizontal and vertical adjacency graphs from absolute X/Z
centers, using the die width as its tolerance scale. It remains shared across
all owners and reports only when the derived layout changes.

The bundled `scrabbleDictionary.txt` is an exact copy of `redbo/scrabble`'s
`dictionary.txt` at commit `05748fb060b6e20480424b9113c1610066daca3c`. Its
178,691 unique uppercase A-Z words are stored one per line. The route loads and
caches the set in the browser.

## Services and verification

Start the private physics service with:

```sh
cargo run -p cards-dice-service
```

It listens on `DICE_SERVICE_ADDR` (default `127.0.0.1:8081`) and exposes
`/healthz`. The public Go server proxies `/dice/ws` to `DICE_SERVICE_URL`
(default `http://127.0.0.1:8081`) and returns 503 when that service is
unavailable.

Use the following checks before release:

```sh
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
go test ./pkg/dice .
npm test
npm run build
```

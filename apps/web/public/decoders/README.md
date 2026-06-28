# GLB decoder assets

Place Draco / KTX2 decoder files here when you start serving **compressed real GLB models**:

- **Draco:** `draco_decoder.wasm` + `draco_decoder.js` (from `three/examples/jsm/libs/draco/`)
- **KTX2 / Basis:** `basis_transcoder.wasm` + `basis_transcoder.js`

Then point the loader at this path (e.g. `useGLTF` with a configured `DRACOLoader`/`KTX2Loader`,
or `useGLTF.preload(url)` for the active vehicle).

Phase 1 ships **procedural vehicles** (`Vehicle.modelUrl = null`), so these decoders are unused
until a real `.glb` is uploaded and a vehicle's `modelUrl` is set — at which point `VehicleModel`
loads it and auto-maps meshes to parts with **no application-code changes**.

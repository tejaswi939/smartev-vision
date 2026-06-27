# Vehicle 3D models (drop folder)

Put real EV model files here as **`.glb`** (preferred — single self-contained binary).
`.gltf` + its `.bin`/textures also works if you keep them together.

Suggested naming (one file per showroom vehicle):
- `aurora-s.glb`   → Vehicle slug `aurora-s`
- `volt-gt.glb`    → Vehicle slug `volt-gt`
- `terra-x.glb`    → Vehicle slug `terra-x`

After the files are here, the loader is enabled per-vehicle by setting
`Vehicle.modelUrl = "/models/<file>.glb"` (currently `null` = procedural).

Note: real car GLBs ship with arbitrary mesh names (e.g. `Object_12`, `Body_low`).
Those won't match the part meshNames the gaze tracker keys on, so a per-model
**mesh → part mapping** is added alongside each model to keep eye-tracking + heatmaps working.
Draco/KTX2-compressed models need the decoders in `../decoders/`.

# SafeKab taxi

Turns the raw Meshy AI car (`Meshy_AI_safekab_taxi_exterior_*.glb`: one untextured,
832k-triangle mesh) into a web-ready SafeKab taxi for the **3D Model** widget.

```bash
blender -b -P integrations/blender/examples/safekab-taxi/build_taxi.py -- path/to/meshy.glb
```

Output goes to `integrations/blender/examples/safekab-taxi/dist/` (ignored by git):

| File | |
|------|-|
| `safekab-taxi.glb` | About 115k triangles, 2.7 MB. Publish it from Blender with the Refraction add-on, or upload it to the media library. |
| `safekab-taxi.blend` | The built scene, to adjust by hand or publish from. |
| `preview-*.png` | Four renders to check the result. Skip them with `--no-previews`. |

Options: `--out DIR`, `--artwork DIR`, `--target-tris N` (default 100000), `--draco` (smaller
file; needs a Blender build with Draco, which official downloads have) and `--front=-x|+x|-y|+y`
(the axis the car's nose points along in the input; Meshy exports use `-x`). A full build
takes about 35 seconds on a laptop CPU.

## What the build does

1. **Normalise.** Turns the nose to face -Y, scales the car to 4.69 m (a Skoda Octavia),
   centres it and stands the wheels on the ground.
2. **Paint parts with their own geometry.** Tyres, rims, wheel-arch liners, the grille, the
   lower intake and the roof sign are found by position and facing direction
   (`livery.Regions`) and get their own materials. Everything else is white paint.
3. **Decimate** to the target triangle count. Vertices where two materials meet are protected,
   so region outlines stay sharp.
4. **Livery as decals.** Windows, lamps, the side stripes, wordmarks, the "Pre-booked iT"
   roundels, the bonnet logo, plates and the "TAXI" lettering are thin meshes projected onto the
   body, so they follow its curves and keep crisp edges. Windows and lamps are decals too because
   the AI mesh's own triangles are too irregular for a clean painted edge.
5. **Export** the `.glb` and `.blend`, then render previews.

## Real artwork

Every livery decal is a placeholder made from Blender text and shapes until you drop a PNG
(with transparency, ideally 2048 px or more across) into [`artwork/`](artwork/README.md) with
the expected name. The next build uses it, with no code changes.

## Adjusting

All positions, sizes and colours live in [`livery.py`](livery.py), in metres in the normalised
frame (nose at -Y, +X is the car's left, ground at Z = 0):

- `COLORS`: brand colours, sampled from photos. Replace them with the official values.
- `DECALS`: what goes where. For side decals `center` is (distance along the car, height).
- `SIDE_WINDOWS`, `WINDSCREEN` and `REAR_WINDOW`: window outlines.
- `Regions`: wheel positions and the grille, intake and roof-sign zones.

These were measured on the current Meshy model. If you regenerate it, render the result, check the
side, front and rear, and re-measure what moved. An orthographic camera at 240 px per metre
makes reading positions off the image easy.

The layout rules are covered by `integrations/blender/tests/test_safekab_livery.py`
(`python3 -m unittest discover -s integrations/blender/tests`).

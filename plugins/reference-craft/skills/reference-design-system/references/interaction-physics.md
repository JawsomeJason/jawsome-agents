# Interaction physics

Finishes that respond to the pointer or the device (glare, holographic sheen, parallax) are CSS that reads a few custom properties. One small driver sets those properties; its constants are named data with a confidence. Motion timing goes through tokens the same way.

## Finishes read custom properties

The driver sets these on each attached element, and the stylesheet does everything else:

| Property | Range | Drives |
| --- | --- | --- |
| `--xx-pointer-x`, `--xx-pointer-y` | 0–100% | Where the light sits; the `background-position` of every sheen gradient |
| `--xx-tilt-x`, `--xx-tilt-y` | −1…1 | The element's rotation, stripe angles, parallax layer offsets |
| `--xx-from-center` | 0…1 | How much the finish shows, so a face-on element is calm |
| `--xx-active` | 0…1 | Glare strength: low at rest, full while held |

Build each finish from gradients, blend modes and masks over the element's own layers, never from the reference's textures. Stack them in a fixed order (frame, art, frame finish, text, front effects) and write that order in the reference doc, because a finish placed one layer too high covers the text.

## The driver

A classic script with no dependencies, exposing an attach function that returns a detach function:

- Pointer input: aim at the pointer's position inside the element while it hovers or is pressed; return to centre on leave or release.
- Device tilt: read orientation relative to the pose when tilt was enabled, clamp to a comfortable wrist turn (about 16 degrees), and map it onto the same properties. Platforms that gate orientation behind a user gesture need a request function called from a tap.
- Smoothing: one spring per property, stepped once per animation frame, and stop the frame loop once every spring has settled, so idle elements cost nothing.

```js
// per frame, per property
v += (target - x) * k;
v *= 1 - d;
x += v;
```

Use two constant sets: a quick follow while interacting and a slower release after, because a held object tracks the hand and settles when let go.

## Constants as data

Keep the constants in a motion data file beside the tokens, each with a confidence:

```json
{
  "springs": {
    "follow": { "k": 0.12, "d": 0.32, "confidence": "estimate" },
    "release": { "k": 0.035, "d": 0.18, "confidence": "estimate" },
    "tilt": {
      "clampDeg": 16,
      "relativeToActivation": true,
      "confidence": "estimate"
    },
    "idleShimmer": false
  }
}
```

The driver's constants must match the file; a test or the build can read both and compare. Record `idleShimmer` explicitly when the reference moves only with input, because an always-on shimmer is the first thing a well-meaning edit adds.

## Reduced motion

Under `prefers-reduced-motion: reduce` the driver sets one fixed, off-axis pose once and never animates, so the finish stays visible but still. Store that pose in the motion file. Zero motion with the finish hidden is a loss of information, not an accommodation.

## Motion tokens

Durations and easings are tokens (`dur-instant` through `dur-reveal`, `ease-out`, `ease-in-out`, a small-overshoot `ease-pop`, `ease-in` for exits), and every animation in the system names one. Per-animation timings (screen transitions, reveal beats, hint delays) live in the motion data file with a confidence each:

- `measured` when read frame by frame from a recording at a known frame rate,
- `observed` when described in words without numbers, then tuned to the description,
- `estimate` when no source exists.

State must never wait on an animation, and a long press or a second tap finishes the current one, so motion never stands between the user and the product.

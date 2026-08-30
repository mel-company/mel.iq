#!/usr/bin/env python3
"""
Re-encodes the generation mascot GIFs for the web.

The originals are 960x960, 151 frames, and 9.3 MB / 12.6 MB. They are shown in
a modal that opens a second after a click, at roughly 180px, so almost all of
that weight is spent on pixels and frames nobody sees — and on a slow
connection the animation arrives after the phase it illustrates is over.

Three things do the work here:

- **Un-diffing.** The source uses GIF transparency for inter-frame diffing, so
  reading frame N directly gives only the pixels that changed. Each frame is
  composited onto a running canvas first; skipping this silently produces a
  stack of fragments.
- **Cropping to content.** Both birds sit inside ~200px of empty margin.
- **Transparency, kept.** The artwork has no background of its own, which is
  what lets it sit on the modal's ground. GIF only has 1-bit alpha, so the
  alpha channel is thresholded and one palette slot is reserved for it — and
  `disposal=2` is then mandatory, because with any other disposal the
  transparent pixels would show the previous frame's bird rather than the page.

Usage:  python3 scripts/optimise-bird-gifs.py <source-dir> [output-dir]

Source files are never modified; point it at wherever the originals live.
"""

import os
import sys

from PIL import Image, ImageSequence

NAMES = ["bird-design", "bird-code"]

# Tuned so each file lands near half a megabyte: ~11fps and a 200px tall
# subject, which is 1x-to-2x of the size the modal renders it at.
HEIGHT = 200
FRAME_STEP = 3
COLORS = 64


def composited_frames(path):
    """Frames as complete images, undoing the source's transparency diffing."""
    source = Image.open(path)
    canvas = Image.new("RGBA", source.size, (0, 0, 0, 0))
    frames = []
    for frame in ImageSequence.Iterator(source):
        canvas.alpha_composite(frame.convert("RGBA"))
        frames.append(canvas.copy())
    return frames, source.info.get("duration", 30)


def content_box(frames):
    """The union of every frame's opaque area, so the crop never clips motion."""
    box = None
    for frame in frames:
        bounds = frame.getchannel("A").getbbox()
        if not bounds:
            continue
        box = bounds if box is None else (
            min(box[0], bounds[0]), min(box[1], bounds[1]),
            max(box[2], bounds[2]), max(box[3], bounds[3]),
        )
    return box


def optimise(src, dst):
    frames, duration = composited_frames(src)
    box = content_box(frames)
    if box:
        frames = [f.crop(box) for f in frames]

    frames = frames[::FRAME_STEP]
    width = round(frames[0].width * HEIGHT / frames[0].height)
    frames = [f.resize((width, HEIGHT), Image.LANCZOS) for f in frames]

    # The last palette slot is the transparent one, so quantise to one fewer.
    transparent = COLORS - 1
    encoded = []
    for frame in frames:
        mask = frame.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
        paletted = frame.convert("RGB").quantize(colors=transparent, method=Image.MEDIANCUT)
        paletted.paste(transparent, mask.point(lambda v: 255 - v))
        encoded.append(paletted)

    encoded[0].save(
        dst,
        save_all=True,
        append_images=encoded[1:],
        duration=duration * FRAME_STEP,
        loop=0,
        optimize=True,
        disposal=2,
        transparency=transparent,
    )
    return len(encoded), (width, HEIGHT), os.path.getsize(dst)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    source_dir = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else source_dir

    for name in NAMES:
        src = os.path.join(source_dir, f"{name}.gif")
        if not os.path.exists(src):
            print(f"skip {name}: {src} not found")
            continue
        before = os.path.getsize(src)
        count, size, after = optimise(src, os.path.join(out_dir, f"{name}.gif"))
        print(
            f"{name}: {before / 1024 / 1024:.1f} MB -> {after / 1024:.0f} KB "
            f"({count} frames, {size[0]}x{size[1]})"
        )


if __name__ == "__main__":
    main()

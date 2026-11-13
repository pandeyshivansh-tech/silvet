import { useEffect, useRef } from "react";

/**
 * Page background (landing, sign-in): a fine warp-and-weft weave that only shows around the pointer, like
 * cloth catching the light — the selvedge idea from the mark, not decoration. At rest the page is unchanged.
 * Fixed to the viewport behind everything, so it is the same everywhere on the page; opaque panels (garment
 * frames, the Midnight panel, cards) sit above it, so it never shows over or behind a garment.
 * Pointer-fine devices only; off under reduced motion; draws only while the pointer is near or settling.
 * The canvas is only the patch around the pointer and travels on a GPU transform, so a 5K screen never
 * clears and refills a full-screen bitmap every frame.
 * Neutral Line colour (never a brand colour), so it never tints the garments beside it.
 */
const gap = 14, radius = 180, lift = 5, size = 2 * (radius + lift + 2);

export function WeaveField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const colour = getComputedStyle(document.documentElement).getPropertyValue("--color-line-strong").trim() || "rgb(33 26 43 / 0.28)";
    let ratio = 1, frame = 0;
    const target = { x: -999, y: -999, a: 0 }, now = { x: -999, y: -999, a: 0 };

    const resize = () => {
      ratio = Math.min(devicePixelRatio, 2);
      canvas.width = canvas.height = size * ratio;
    };
    // Each thread bows away from the pointer; strength and opacity fall off with distance.
    const thread = (fixed: number, horizontal: boolean) => {
      const from = Math.max(0, (horizontal ? now.x : now.y) - radius), to = (horizontal ? now.x : now.y) + radius;
      context.beginPath();
      for (let t = from; t <= to; t += 6) {
        const x = horizontal ? t : fixed, y = horizontal ? fixed : t;
        const d = Math.hypot(x - now.x, y - now.y), f = Math.max(0, 1 - d / radius);
        const push = f * f * lift * Math.sign((horizontal ? y - now.y : x - now.x) || 1);
        const px = horizontal ? x : x + push, py = horizontal ? y + push : y;
        if (t === from) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.stroke();
    };
    const draw = () => {
      frame = 0;
      now.x += (target.x - now.x) * 0.18; now.y += (target.y - now.y) * 0.18; now.a += (target.a - now.a) * 0.12;
      // Draw in viewport coordinates (the weave stays fixed to the screen), inside a patch that follows the pointer.
      const left = Math.round(now.x) - size / 2, top = Math.round(now.y) - size / 2;
      canvas.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      context.setTransform(ratio, 0, 0, ratio, -left * ratio, -top * ratio);
      context.clearRect(left, top, size, size);
      if (now.a > 0.01) {
        const glow = context.createRadialGradient(now.x, now.y, 0, now.x, now.y, radius);
        context.strokeStyle = colour; context.lineWidth = 0.75; context.globalAlpha = now.a;
        for (let y = Math.floor((now.y - radius) / gap) * gap; y < now.y + radius; y += gap) thread(y, true);
        for (let x = Math.floor((now.x - radius) / gap) * gap; x < now.x + radius; x += gap) thread(x, false);
        // Fade the patch to nothing at its edge.
        glow.addColorStop(0, "rgba(0,0,0,1)"); glow.addColorStop(1, "rgba(0,0,0,0)");
        context.globalAlpha = 1; context.globalCompositeOperation = "destination-in";
        context.fillStyle = glow; context.fillRect(left, top, size, size);
        context.globalCompositeOperation = "source-over";
      }
      if (Math.abs(target.a - now.a) > 0.005 || Math.hypot(target.x - now.x, target.y - now.y) > 0.5) frame = requestAnimationFrame(draw);
    };
    const kick = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target.x = event.clientX; target.y = event.clientY; target.a = 1;
      if (now.a < 0.01) { now.x = target.x; now.y = target.y; }
      kick();
    };
    const leave = () => { target.a = 0; kick(); };

    resize();
    // Scrolling moves the page under a still pointer: let the patch settle away rather than slide with it.
    const scroll = () => { target.a = 0; kick(); };
    addEventListener("resize", resize);
    addEventListener("pointermove", move, { passive: true });
    addEventListener("scroll", scroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize); removeEventListener("pointermove", move); removeEventListener("scroll", scroll);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" style={{ width: size, height: size }} className="pointer-events-none fixed top-0 left-0 -z-10 will-change-transform" />;
}

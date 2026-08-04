import { useEffect, useMemo, useState } from "react";

interface ScreenWindowOverlayProps {
  borderRadius?: number;
  padding?: number; // distance from screen edges to the window (left/right/bottom)
  topInset?: number; // distance from top edge to the window — defaults to `padding`
  borderColor?: string;
}

export function ScreenWindowOverlay({
  borderRadius = 16,
  padding = 24,
  topInset,
  borderColor = "#ffffff",
}: ScreenWindowOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { width, height } = size;
  const top = topInset ?? padding;
  const winX = padding;
  const winY = top;
  const winW = width - padding * 2;
  const winH = height - top - padding;
  const r = borderRadius;

  const clipPath = useMemo(() => {
    if (width === 0 || height === 0) return undefined;

    const outer = `M0,0 H${width} V${height} H0 Z`;

    const inner = `
      M${winX + r},${winY}
      H${winX + winW - r}
      A${r},${r} 0 0 1 ${winX + winW},${winY + r}
      V${winY + winH - r}
      A${r},${r} 0 0 1 ${winX + winW - r},${winY + winH}
      H${winX + r}
      A${r},${r} 0 0 1 ${winX},${winY + winH - r}
      V${winY + r}
      A${r},${r} 0 0 1 ${winX + r},${winY}
      Z
    `.replace(/\s+/g, " ");

    return `path(evenodd, '${outer} ${inner}')`;
  }, [width, height, winX, winY, winW, winH, r]);

  if (!clipPath) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className="absolute inset-0 backdrop-blur-md" style={{ clipPath }} />

      <svg className="absolute inset-0 w-full h-full">
        <rect
          x={winX}
          y={winY}
          width={winW}
          height={winH}
          rx={r}
          ry={r}
          fill="none"
          stroke={borderColor}
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
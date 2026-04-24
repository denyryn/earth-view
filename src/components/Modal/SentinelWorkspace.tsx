import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { bboxHeightKm, bboxWidthKm, formatApproxDistance } from "@/lib/geo";
import type { BoundingBox } from "@/types/imagery";

type SentinelViewport = {
  scale: number;
  x: number;
  y: number;
};

type SentinelWorkspaceProps = {
  imageUrl: string;
  bbox: BoundingBox;
  onViewportChange?: (viewport: SentinelViewport) => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 8;

export function SentinelWorkspace({
  imageUrl,
  bbox,
  onViewportChange,
}: SentinelWorkspaceProps) {
  const [viewport, setViewport] = useState<SentinelViewport>({ scale: 1, x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);

  const dimensions = useMemo(() => {
    const width = bboxWidthKm(bbox);
    const height = bboxHeightKm(bbox);

    return {
      width,
      height,
      pixelSizeMeters: Math.max(width, height) * 1000 / 1024,
    };
  }, [bbox]);

  function updateViewport(next: SentinelViewport) {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
    const panLimit = (clampedScale - 1) * 420;
    const clamped = {
      scale: clampedScale,
      x: Math.min(panLimit, Math.max(-panLimit, next.x)),
      y: Math.min(panLimit, Math.max(-panLimit, next.y)),
    };

    setViewport(clamped);
    onViewportChange?.(clamped);
  }

  function resetViewport() {
    updateViewport({ scale: 1, x: 0, y: 0 });
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <img
        src={imageUrl}
        alt=""
        data-testid="sentinel-image"
        draggable={false}
        onWheel={(event) => {
          event.preventDefault();
          const direction = event.deltaY > 0 ? -1 : 1;
          updateViewport({
            ...viewport,
            scale: viewport.scale * (direction > 0 ? 1.12 : 0.9),
          });
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStart({
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            originX: viewport.x,
            originY: viewport.y,
          });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }

          updateViewport({
            ...viewport,
            x: dragStart.originX + event.clientX - dragStart.x,
            y: dragStart.originY + event.clientY - dragStart.y,
          });
        }}
        onPointerUp={() => setDragStart(null)}
        onPointerCancel={() => setDragStart(null)}
        className="h-full w-full cursor-grab select-none object-cover active:cursor-grabbing"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "center",
        }}
      />

      <div className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-xs text-white/85 backdrop-blur">
        Sentinel-2 workspace
      </div>
      <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-md border border-white/10 bg-black/65 px-3 py-2 text-xs text-white/80 backdrop-blur">
        <span>{formatApproxDistance(Math.max(dimensions.width, dimensions.height) / 111)} view</span>
        <span>~{dimensions.pixelSizeMeters.toFixed(1)}m/px request</span>
        <span>{viewport.scale.toFixed(1)}x client zoom</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={resetViewport}
        className="absolute right-3 top-3 bg-black/55 text-white hover:bg-black/75 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  );
}

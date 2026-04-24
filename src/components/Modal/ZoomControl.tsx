import { ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  degreesToZoomPercent,
  formatApproxDistance,
  IMAGERY_ZOOM_MAX_DEGREES,
  IMAGERY_ZOOM_MIN_DEGREES,
  zoomPercentToDegrees,
} from "@/lib/geo";

type ZoomControlProps = {
  value: number;
  previewValue?: number;
  onPreviewChange?: (value: number) => void;
  onCommit: (value: number) => void;
};

export function ZoomControl({
  value,
  previewValue,
  onPreviewChange,
  onCommit,
}: ZoomControlProps) {
  const [draftValue, setDraftValue] = useState(value);
  const visibleValue = previewValue ?? draftValue;
  const sliderValue = degreesToZoomPercent(visibleValue);

  useEffect(() => {
    setDraftValue(value);
    onPreviewChange?.(value);
  }, [onPreviewChange, value]);

  function commitDraft() {
    onCommit(visibleValue);
  }

  function updateDraft(nextValue: number) {
    setDraftValue(nextValue);
    onPreviewChange?.(nextValue);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="imagery-zoom" className="inline-flex items-center gap-2">
          <ZoomIn className="h-3.5 w-3.5" />
          Image Zoom
        </Label>
        <div className="text-xs text-muted-foreground">
          {formatApproxDistance(visibleValue)} wide
        </div>
      </div>
      <input
        id="imagery-zoom"
        type="range"
        min={0}
        max={100}
        step={1}
        value={sliderValue}
        onChange={(event) => updateDraft(zoomPercentToDegrees(Number(event.target.value)))}
        onPointerUp={commitDraft}
        onKeyUp={commitDraft}
        onBlur={commitDraft}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{formatApproxDistance(IMAGERY_ZOOM_MAX_DEGREES)}</span>
        <span>{formatApproxDistance(IMAGERY_ZOOM_MIN_DEGREES)}</span>
      </div>
    </div>
  );
}

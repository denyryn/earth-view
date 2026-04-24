import { ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ZOOM_LEVELS } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { ZoomLevel } from "@/types/imagery";

type ZoomControlProps = {
  value: ZoomLevel;
  onChange: (value: ZoomLevel) => void;
};

const zoomOrder: ZoomLevel[] = ["continental", "regional", "local", "pinpoint"];

export function ZoomControl({ value, onChange }: ZoomControlProps) {
  return (
    <div className="space-y-2">
      <Label className="inline-flex items-center gap-2">
        <ZoomIn className="h-3.5 w-3.5" />
        Scale
      </Label>
      <div className="grid grid-cols-2 rounded-md border border-input bg-background/50 p-1 sm:grid-cols-4">
        {zoomOrder.map((zoom) => (
          <Button
            key={zoom}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(zoom)}
            className={cn(
              "h-8 px-2 text-xs",
              value === zoom && "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {ZOOM_LEVELS[zoom].label}
          </Button>
        ))}
      </div>
    </div>
  );
}

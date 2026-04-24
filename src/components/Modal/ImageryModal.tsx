import { LoaderCircle, MapPinned, Satellite } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bboxFromPoint, formatCoordinates, ZOOM_LEVELS } from "@/lib/geo";
import { formatLongDate } from "@/lib/dates";
import { getImageryProvider } from "@/providers/registry";
import { useAppStore } from "@/store/useAppStore";
import { DatePicker } from "./DatePicker";
import { LayerSwitcher } from "./LayerSwitcher";
import { ZoomControl } from "./ZoomControl";

export function ImageryModal() {
  const {
    selectedPoint,
    modalOpen,
    date,
    layerId,
    zoomLevel,
    closeModal,
    setDate,
    setLayer,
    setZoomLevel,
  } = useAppStore();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = getImageryProvider(layerId);
  const bbox = useMemo(() => {
    if (!selectedPoint) {
      return null;
    }

    return bboxFromPoint(selectedPoint.lat, selectedPoint.lon, ZOOM_LEVELS[zoomLevel].size);
  }, [selectedPoint, zoomLevel]);

  useEffect(() => {
    if (!modalOpen || !bbox) {
      return;
    }

    let cancelled = false;
    setImageLoading(true);
    setError(null);

    provider
      .fetchImage({ bbox, date, width: 1024, height: 1024 })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (typeof result === "string") {
          setImageUrl(result);
          return;
        }

        setImageUrl(URL.createObjectURL(result));
      })
      .catch(() => {
        if (!cancelled) {
          setError("Imagery unavailable for this selection.");
          setImageLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bbox, date, modalOpen, provider]);

  const coordinates = selectedPoint
    ? formatCoordinates(selectedPoint.lat, selectedPoint.lon)
    : "";

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent data-testid="imagery-modal">
        <div className="grid max-h-[92dvh] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative min-h-[360px] bg-black lg:min-h-[680px]">
            {imageUrl && (
              <img
                key={imageUrl}
                src={imageUrl}
                alt=""
                data-testid="gibs-image"
                className="h-full w-full object-cover"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setError("Imagery unavailable for this selection.");
                  setImageLoading(false);
                }}
              />
            )}
            {(imageLoading || !imageUrl) && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-8 text-center text-sm text-muted-foreground">
                {error}
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto border-t border-border bg-card p-5 lg:border-l lg:border-t-0">
            <DialogHeader className="pr-7">
              <DialogTitle className="flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-primary" />
                {coordinates}
              </DialogTitle>
              <DialogDescription>{formatLongDate(date)}</DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border bg-background/45 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Satellite className="h-4 w-4 text-primary" />
                {provider.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {provider.satellite} · {provider.resolution}m nominal
              </div>
            </div>

            <LayerSwitcher value={layerId} onValueChange={setLayer} />
            <DatePicker value={date} onChange={setDate} />
            <ZoomControl value={zoomLevel} onChange={setZoomLevel} />
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

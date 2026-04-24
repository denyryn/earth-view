import { ArrowLeft, LoaderCircle, MapPinned, Satellite, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bboxFromPoint,
  bboxHeightKm,
  bboxWidthKm,
  clamp,
  formatApproxDistance,
  formatCoordinates,
  normalizeLongitude,
} from "@/lib/geo";
import { formatLongDate } from "@/lib/dates";
import { getImageryProvider } from "@/providers/registry";
import { useAppStore } from "@/store/useAppStore";
import type { BoundingBox } from "@/types/imagery";
import { DatePicker } from "./DatePicker";
import { ImageryInfoButton, ImageryInfoModal } from "./ImageryInfoModal";
import { LayerSwitcher } from "./LayerSwitcher";
import { SentinelWorkspace } from "./SentinelWorkspace";
import { ZoomControl } from "./ZoomControl";

type ModalMode = "regional" | "sentinel";

type SentinelState = {
  imageUrl: string;
  bbox: BoundingBox;
} | null;

const SENTINEL_DEFAULT_SIZE_DEGREES = 0.09;

export function ImageryModal() {
  const {
    selectedPoint,
    modalOpen,
    date,
    layerId,
    imageryZoomDegrees,
    closeModal,
    setDate,
    setLayer,
    setImageryZoomDegrees,
    recenterPoint,
  } = useAppStore();
  const imagePaneRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewZoomDegrees, setPreviewZoomDegrees] = useState(imageryZoomDegrees);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("regional");
  const [sentinelState, setSentinelState] = useState<SentinelState>(null);
  const [sentinelLoading, setSentinelLoading] = useState(false);
  const [sentinelError, setSentinelError] = useState<string | null>(null);
  const [regionalPan, setRegionalPan] = useState({ x: 0, y: 0 });
  const [regionalDragStart, setRegionalDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);

  const provider = getImageryProvider(layerId);
  const bbox = useMemo(() => {
    if (!selectedPoint) {
      return null;
    }

    return bboxFromPoint(selectedPoint.lat, selectedPoint.lon, imageryZoomDegrees);
  }, [imageryZoomDegrees, selectedPoint]);

  useEffect(() => {
    if (!modalOpen || !bbox) {
      return;
    }

    let cancelled = false;
    setImageLoading(true);
    setError(null);
    setRegionalPan({ x: 0, y: 0 });
    setRegionalDragStart(null);
    setMode("regional");
    setSentinelState(null);
    setSentinelError(null);

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

  useEffect(() => {
    if (modalOpen) {
      setPreviewZoomDegrees(imageryZoomDegrees);
    }
  }, [imageryZoomDegrees, modalOpen]);

  const coordinates = selectedPoint
    ? formatCoordinates(selectedPoint.lat, selectedPoint.lon)
    : "";
  const imagePreviewScale = imageryZoomDegrees / previewZoomDegrees;
  const displayedImageLabel = provider.name;

  async function renderSentinelImage() {
    if (!bbox || !selectedPoint) {
      return;
    }

    const sentinelBbox = bboxFromPoint(
      selectedPoint.lat,
      selectedPoint.lon,
      Math.min(imageryZoomDegrees, SENTINEL_DEFAULT_SIZE_DEGREES),
    );

    setSentinelLoading(true);
    setSentinelError(null);

    try {
      const response = await fetch("/api/sentinel-image", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bbox: sentinelBbox,
          date,
          width: 1024,
          height: 1024,
        }),
      });

      if (!response.ok) {
        let message = "Sentinel-2 imagery is unavailable for this area/date.";

        try {
          const body = (await response.json()) as { error?: string };
          message = body.error ?? message;
        } catch {
          message = await response.text();
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      setSentinelState({
        imageUrl: URL.createObjectURL(blob),
        bbox: sentinelBbox,
      });
      setMode("sentinel");
    } catch (requestError) {
      setSentinelError(
        requestError instanceof Error
          ? requestError.message
          : "Sentinel-2 image request failed.",
      );
    } finally {
      setSentinelLoading(false);
    }
  }

  function exitSentinelMode() {
    setMode("regional");
    setSentinelError(null);
  }

  function commitRegionalPan(nextPan = regionalPan) {
    if (!bbox || !selectedPoint) {
      setRegionalPan({ x: 0, y: 0 });
      return;
    }

    const rect = imagePaneRef.current?.getBoundingClientRect();

    if (!rect || (Math.abs(nextPan.x) < 4 && Math.abs(nextPan.y) < 4)) {
      setRegionalPan({ x: 0, y: 0 });
      return;
    }

    const scale = imagePreviewScale || 1;
    const lonSpan = (bbox.maxLon - bbox.minLon) / scale;
    const latSpan = (bbox.maxLat - bbox.minLat) / scale;
    const nextLat = clamp(selectedPoint.lat + (nextPan.y / rect.height) * latSpan, -85, 85);
    const nextLon = normalizeLongitude(selectedPoint.lon - (nextPan.x / rect.width) * lonSpan);

    setRegionalPan({ x: 0, y: 0 });
    recenterPoint(nextLat, nextLon);
  }

  const sentinelWidth = sentinelState ? bboxWidthKm(sentinelState.bbox) : 0;
  const sentinelHeight = sentinelState ? bboxHeightKm(sentinelState.bbox) : 0;
  const sentinelNativeMeters = sentinelState
    ? (Math.max(sentinelWidth, sentinelHeight) * 1000) / 1024
    : 0;

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent data-testid="imagery-modal">
        <div className="grid max-h-[92dvh] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            ref={imagePaneRef}
            className="relative min-h-[360px] overflow-hidden bg-black lg:min-h-[680px]"
          >
            {mode === "sentinel" && sentinelState ? (
              <SentinelWorkspace imageUrl={sentinelState.imageUrl} bbox={sentinelState.bbox} />
            ) : imageUrl ? (
              <img
                key={imageUrl}
                src={imageUrl}
                alt=""
                data-testid="gibs-image"
                draggable={false}
                className="h-full w-full cursor-grab select-none object-cover transition-transform duration-75 active:cursor-grabbing"
                style={{
                  transform: `translate(${regionalPan.x}px, ${regionalPan.y}px) scale(${imagePreviewScale})`,
                  transformOrigin: "center",
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setRegionalDragStart({
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    originX: regionalPan.x,
                    originY: regionalPan.y,
                  });
                }}
                onPointerMove={(event) => {
                  if (!regionalDragStart || regionalDragStart.pointerId !== event.pointerId) {
                    return;
                  }

                  setRegionalPan({
                    x: regionalDragStart.originX + event.clientX - regionalDragStart.x,
                    y: regionalDragStart.originY + event.clientY - regionalDragStart.y,
                  });
                }}
                onPointerUp={(event) => {
                  const nextPan = regionalDragStart
                    ? {
                        x: regionalDragStart.originX + event.clientX - regionalDragStart.x,
                        y: regionalDragStart.originY + event.clientY - regionalDragStart.y,
                      }
                    : regionalPan;

                  setRegionalDragStart(null);
                  commitRegionalPan(nextPan);
                }}
                onPointerCancel={() => {
                  setRegionalDragStart(null);
                  setRegionalPan({ x: 0, y: 0 });
                }}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setError("Imagery unavailable for this selection.");
                  setImageLoading(false);
                }}
              />
            ) : null}
            {(imageLoading || !imageUrl) && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {sentinelLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-background/80 px-3 py-2 text-sm shadow-xl backdrop-blur">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  Rendering Sentinel-2
                </div>
              </div>
            )}
            {imageUrl && mode === "regional" && (
              <div className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-xs text-white/85 backdrop-blur">
                {displayedImageLabel}
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
                {mode === "sentinel" ? "Sentinel-2 L2A" : provider.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {mode === "sentinel"
                  ? "Copernicus · 10m visible bands"
                  : `${provider.satellite} · ${provider.resolution}m nominal`}
              </div>
            </div>

            {mode === "sentinel" && sentinelState ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={exitSentinelMode}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to regional view
                </Button>

                <div className="rounded-md border border-border bg-background/45 p-4 text-sm text-muted-foreground">
                  <div className="mb-2 font-medium text-foreground">Sentinel workspace</div>
                  <div>Area: {formatApproxDistance(Math.max(sentinelWidth, sentinelHeight) / 111)} wide</div>
                  <div>Request scale: ~{sentinelNativeMeters.toFixed(1)}m/px</div>
                  <div className="mt-3 leading-relaxed">
                    Drag the image to pan. Use wheel or trackpad scroll to zoom client-side. A
                    later refine action can request a new Sentinel image for the current view.
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={renderSentinelImage}
                    disabled={sentinelLoading || !bbox}
                    className="w-full"
                  >
                    {sentinelLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Render Sentinel-2 high-res
                  </Button>
                  {sentinelError && (
                    <p className="text-xs leading-relaxed text-destructive">{sentinelError}</p>
                  )}
                </div>

                <LayerSwitcher
                  value={layerId}
                  onValueChange={setLayer}
                  action={<ImageryInfoButton onClick={() => setInfoOpen(true)} />}
                />
                <DatePicker value={date} onChange={setDate} />
                <ZoomControl
                  value={imageryZoomDegrees}
                  previewValue={previewZoomDegrees}
                  onPreviewChange={setPreviewZoomDegrees}
                  onCommit={setImageryZoomDegrees}
                />
              </>
            )}
          </aside>
        </div>
      </DialogContent>
      <ImageryInfoModal open={infoOpen} onOpenChange={setInfoOpen} />
    </Dialog>
  );
}

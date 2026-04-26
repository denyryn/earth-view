import { ArrowLeft, Film, LoaderCircle, MapPinned, Satellite, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatApproxDistance, formatCoordinates } from "@/lib/geo";
import {
  formatExactCaptureTime,
  formatGibsCaptureTime,
  formatSentinelCaptureTime,
} from "@/lib/captureTime";
import { sentinelVariants } from "@/lib/sentinelVariants";
import { getImageryProvider, imageryProviders } from "@/providers/registry";
import { useAppStore } from "@/store/useAppStore";
import { DatePicker } from "./DatePicker";
import { ImageryInfoButton, ImageryInfoModal } from "./ImageryInfoModal";
import {
  TIME_LAPSE_SPEEDS,
} from "./hooks/imageryModalHelpers";
import type { ModalMode } from "./hooks/types";
import { useModalPaneSize } from "./hooks/useModalPaneSize";
import { useObjectUrls } from "./hooks/useObjectUrls";
import { useRegionalImagery } from "./hooks/useRegionalImagery";
import { useSentinelImagery } from "./hooks/useSentinelImagery";
import { useTimeLapse } from "./hooks/useTimeLapse";
import { LayerSwitcher } from "./LayerSwitcher";
import { SentinelWorkspace } from "./SentinelWorkspace";
import { TimeLapseModal } from "./TimeLapseModal";

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
  const [infoOpen, setInfoOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("regional");
  const provider = getImageryProvider(layerId);
  const selectedLon = selectedPoint?.lon;
  const isRegionalRadar = provider.id === "sentinel-1-radar";
  const regionalLoadingMessage = provider.loadingMessage ?? "Loading imagery";
  const regionalUpdatingMessage = provider.loadingMessage
    ? `Updating. ${provider.loadingMessage}`
    : "Updating";
  const { imagePaneRef, imagePaneSize, setImagePaneRef } = useModalPaneSize(modalOpen);
  const { createObjectUrl, revokeObjectUrl } = useObjectUrls();
  const regionalImagery = useRegionalImagery({
    selectedPoint,
    modalOpen,
    mode,
    date,
    provider,
    imageryZoomDegrees,
    imagePaneRef,
    imagePaneSize,
    setImageryZoomDegrees,
    recenterPoint,
    createObjectUrl,
    revokeObjectUrl,
  });
  const sentinelImagery = useSentinelImagery({
    selectedPoint,
    modalOpen,
    mode,
    setMode,
    date,
    bbox: regionalImagery.bbox,
    imageryZoomDegrees,
    imagePaneRef,
    createObjectUrl,
    revokeObjectUrl,
  });
  const resetSentinel = sentinelImagery.resetSentinel;
  const timeLapse = useTimeLapse({
    bbox: regionalImagery.bbox,
    date,
    provider,
    sentinelState: sentinelImagery.sentinelState,
    sentinelViewport: sentinelImagery.sentinelViewport,
    createObjectUrl,
    revokeObjectUrl,
  });

  useEffect(() => {
    if (!modalOpen || !regionalImagery.bbox || mode === "sentinel") {
      return;
    }

    resetSentinel();
  }, [modalOpen, mode, regionalImagery.bbox, resetSentinel]);

  useEffect(() => {
    if (!modalOpen || mode !== "regional") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const index = Number(event.key) - 1;

      if (!Number.isInteger(index) || index < 0 || index >= imageryProviders.length) {
        return;
      }

      event.preventDefault();
      setLayer(imageryProviders[index].id);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, mode, setLayer]);

  const coordinates = selectedPoint
    ? formatCoordinates(selectedPoint.lat, selectedPoint.lon)
    : "";
  const regionalCaptureLabel = formatGibsCaptureTime(date, provider.id, selectedLon);
  const regionalProviderCaptureLabel = provider.id === "sentinel-1-radar"
    ? formatSentinelCaptureTime(date, "s1-radar", selectedLon)
    : regionalCaptureLabel;
  const sentinelCaptureLabel = formatSentinelCaptureTime(
    date,
    sentinelImagery.renderedSentinelVariant.id,
    selectedLon,
  );
  const captureLabel =
    mode === "sentinel" && sentinelImagery.sentinelState?.sceneDateTime
      ? formatExactCaptureTime(sentinelImagery.sentinelState.sceneDateTime)
      : mode === "sentinel"
        ? sentinelCaptureLabel
        : regionalProviderCaptureLabel;

  function handleOpenChange(open: boolean) {
    if (open) {
      return;
    }

    resetSentinel();
    closeModal();
  }

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="imagery-modal">
        <div className="grid max-h-[92dvh] grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            ref={setImagePaneRef}
            className="relative min-h-[360px] overflow-hidden bg-black lg:min-h-[680px]"
          >
            {mode === "sentinel" && sentinelImagery.sentinelState ? (
              <SentinelWorkspace
                imageUrl={sentinelImagery.sentinelState.imageUrl}
                bbox={sentinelImagery.sentinelState.bbox}
                onViewportChange={sentinelImagery.setSentinelViewport}
                onPanCommit={(viewport) => void sentinelImagery.commitSentinelPan(viewport)}
              />
            ) : regionalImagery.imageUrl ? (
              <img
                key={regionalImagery.imageUrl}
                src={regionalImagery.imageUrl}
                alt=""
                data-testid="gibs-image"
                draggable={false}
                className="h-full w-full cursor-grab select-none object-cover active:cursor-grabbing"
                style={{
                  transform: `translate(${regionalImagery.regionalPan.x}px, ${regionalImagery.regionalPan.y}px) scale(${regionalImagery.imagePreviewScale})`,
                  transformOrigin: "center",
                  transition:
                    regionalImagery.regionalDragStart || regionalImagery.imageLoading
                      ? "none"
                      : "transform 160ms ease-out",
                }}
                onWheel={regionalImagery.zoomRegionalImage}
                onPointerDown={(event) => {
                  if (event.shiftKey) {
                    const point = regionalImagery.pointFromRegionalEvent(event);

                    if (point) {
                      void sentinelImagery.renderSentinelImage(point);
                    }

                    return;
                  }

                  event.currentTarget.setPointerCapture(event.pointerId);
                  regionalImagery.setRegionalDragStart({
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    originX: regionalImagery.committedRegionalPan.x,
                    originY: regionalImagery.committedRegionalPan.y,
                  });
                }}
                onPointerMove={(event) => {
                  if (
                    !regionalImagery.regionalDragStart ||
                    regionalImagery.regionalDragStart.pointerId !== event.pointerId
                  ) {
                    return;
                  }

                  regionalImagery.setRegionalPan({
                    x: regionalImagery.regionalDragStart.originX + event.clientX - regionalImagery.regionalDragStart.x,
                    y: regionalImagery.regionalDragStart.originY + event.clientY - regionalImagery.regionalDragStart.y,
                  });
                }}
                onPointerUp={(event) => {
                  const nextPan = regionalImagery.regionalDragStart
                    ? {
                        x: regionalImagery.regionalDragStart.originX + event.clientX - regionalImagery.regionalDragStart.x,
                        y: regionalImagery.regionalDragStart.originY + event.clientY - regionalImagery.regionalDragStart.y,
                      }
                    : regionalImagery.regionalPan;

                  regionalImagery.setRegionalDragStart(null);
                  regionalImagery.commitRegionalPan(nextPan);
                }}
                onPointerCancel={() => {
                  regionalImagery.setRegionalDragStart(null);
                  regionalImagery.setRegionalPan(regionalImagery.committedRegionalPan);
                }}
                onLoad={() => regionalImagery.setImageLoading(false)}
                onError={() => {
                  regionalImagery.setError("Imagery unavailable for this selection.");
                  regionalImagery.setImageLoading(false);
                }}
              />
            ) : null}
            {!regionalImagery.imageUrl && regionalImagery.imageLoading && !regionalImagery.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-background/80 px-3 py-2 text-sm shadow-xl backdrop-blur">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  {regionalLoadingMessage}
                </div>
              </div>
            )}
            {regionalImagery.imageUrl && regionalImagery.imageLoading && mode === "regional" && !regionalImagery.error && (
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/65 px-2.5 py-1.5 text-xs text-white/85 shadow-xl backdrop-blur">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
                {isRegionalRadar
                  ? regionalImagery.updateReason === "positioning"
                    ? "Updating positioning"
                    : "Updating resolution"
                  : regionalUpdatingMessage}
              </div>
            )}
            {sentinelImagery.sentinelLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-background/80 px-3 py-2 text-sm shadow-xl backdrop-blur">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  Rendering {sentinelImagery.selectedSentinelVariant.name}
                </div>
              </div>
            )}
            {regionalImagery.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-8 text-center text-sm text-muted-foreground">
                {regionalImagery.error}
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto border-t border-border bg-card p-5 lg:border-l lg:border-t-0">
            <DialogHeader className="pr-7">
              <DialogTitle className="flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-primary" />
                {coordinates}
              </DialogTitle>
              <DialogDescription>{captureLabel}</DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border bg-background/45 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Satellite className="h-4 w-4 text-primary" />
                {mode === "sentinel" ? sentinelImagery.renderedSentinelVariant.name : provider.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {mode === "sentinel"
                  ? `Copernicus · ${sentinelImagery.renderedSentinelVariant.resolution}m ${sentinelImagery.renderedSentinelVariant.category}`
                  : `${provider.satellite} · ${provider.resolution}m nominal${
                      provider.requiresAuth ? " · Copernicus" : ""
                    }`}
              </div>
            </div>

            {mode === "sentinel" && sentinelImagery.sentinelState ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sentinelImagery.exitSentinelMode}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to regional view
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="sentinel-variant" className="inline-flex items-center gap-2">
                    <Satellite className="h-3.5 w-3.5" />
                    Sentinel layer
                  </Label>
                  <Select
                    value={sentinelImagery.sentinelVariantId}
                    onValueChange={(value) => void sentinelImagery.changeSentinelVariant(value)}
                  >
                    <SelectTrigger id="sentinel-variant">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sentinelVariants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.shortName} · {variant.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {sentinelImagery.selectedSentinelVariant.caveat}
                  </p>
                </div>

                <DatePicker value={date} onChange={setDate} />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void timeLapse.loadSentinelTimeLapse(7)}
                    disabled={timeLapse.timeLapseLoading || !sentinelImagery.sentinelState}
                    className="w-full"
                  >
                    {timeLapse.timeLapseLoading && timeLapse.timeLapseMode === 7 ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Film className="h-4 w-4" />
                    )}
                    7 scenes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void timeLapse.loadSentinelTimeLapse(30)}
                    disabled={timeLapse.timeLapseLoading || !sentinelImagery.sentinelState}
                    className="w-full"
                  >
                    {timeLapse.timeLapseLoading && timeLapse.timeLapseMode === 30 ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Film className="h-4 w-4" />
                    )}
                    30 scenes
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void timeLapse.loadSentinelFiveYearTimeLapse()}
                  disabled={timeLapse.timeLapseLoading || !sentinelImagery.sentinelState}
                  className="w-full"
                >
                  {timeLapse.timeLapseLoading && timeLapse.timeLapseMode === "5y" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Film className="h-4 w-4" />
                  )}
                  Last 5 years
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={sentinelImagery.refineSentinelView}
                  disabled={sentinelImagery.sentinelLoading || !sentinelImagery.canRefineSentinel}
                  className="w-full"
                >
                  {sentinelImagery.sentinelLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Refine current Sentinel view
                </Button>

                <div className="rounded-md border border-border bg-background/45 p-4 text-sm text-muted-foreground">
                  <div className="mb-2 font-medium text-foreground">Sentinel workspace</div>
                  <div>Area: {formatApproxDistance(Math.max(sentinelImagery.sentinelWidth, sentinelImagery.sentinelHeight) / 111)} wide</div>
                  <div>
                    Request scale: ~{sentinelImagery.sentinelNativeMeters.toFixed(1)}m/px
                    {sentinelImagery.sentinelNativeMeters < sentinelImagery.renderedSentinelVariant.resolution
                      ? " (native limit)"
                      : ""}
                  </div>
                  <div className="mt-3 leading-relaxed">
                    Drag the image to pan. Use wheel or trackpad scroll to zoom client-side. A
                    later refine action can request a new image for the current view.
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void sentinelImagery.renderSentinelImage()}
                    disabled={sentinelImagery.sentinelLoading || !regionalImagery.bbox}
                    className="w-full"
                  >
                    {sentinelImagery.sentinelLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Render Sentinel-2 high-res
                  </Button>
                  {sentinelImagery.sentinelError && (
                    <p className="text-xs leading-relaxed text-destructive">{sentinelImagery.sentinelError}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void (
                      isRegionalRadar
                        ? timeLapse.loadRegionalSentinelRadarTimeLapse(7)
                        : timeLapse.loadTimeLapse(7)
                    )}
                    disabled={timeLapse.timeLapseLoading || !regionalImagery.bbox}
                    className="w-full"
                  >
                    {timeLapse.timeLapseLoading && timeLapse.timeLapseMode === 7 ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Film className="h-4 w-4" />
                    )}
                    {isRegionalRadar ? "7 scenes" : "7 days"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void (
                      isRegionalRadar
                        ? timeLapse.loadRegionalSentinelRadarTimeLapse(30)
                        : timeLapse.loadTimeLapse(30)
                    )}
                    disabled={timeLapse.timeLapseLoading || !regionalImagery.bbox}
                    className="w-full"
                  >
                    {timeLapse.timeLapseLoading && timeLapse.timeLapseMode === 30 ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Film className="h-4 w-4" />
                    )}
                    {isRegionalRadar ? "30 scenes" : "30 days"}
                  </Button>
                </div>

                <LayerSwitcher
                  value={layerId}
                  onValueChange={setLayer}
                  action={<ImageryInfoButton onClick={() => setInfoOpen(true)} />}
                />
                <DatePicker value={date} onChange={setDate} />
              </>
            )}
          </aside>
        </div>
      </DialogContent>
      <ImageryInfoModal open={infoOpen} onOpenChange={setInfoOpen} />
      <TimeLapseModal
        open={timeLapse.timeLapseOpen}
        onOpenChange={timeLapse.setTimeLapseOpen}
        frames={timeLapse.timeLapseFrames}
        loading={timeLapse.timeLapseLoading}
        loadingProgress={timeLapse.timeLapseLoadingProgress}
        error={timeLapse.timeLapseError}
        title={
          mode === "sentinel"
            ? `${sentinelImagery.renderedSentinelVariant.name} · ${
                timeLapse.timeLapseMode === "5y" ? "Last 5 years" : `${timeLapse.timeLapseMode} scenes`
              }`
            : isRegionalRadar
              ? `${provider.name} · ${timeLapse.timeLapseMode} scenes`
            : `${provider.name} · ${timeLapse.timeLapseMode} days`
        }
        frameCountLabel={mode === "sentinel" || isRegionalRadar ? "scene frames" : undefined}
        frameIntervalMs={TIME_LAPSE_SPEEDS[timeLapse.timeLapseMode]}
        allowSequenceDownload={mode === "sentinel" || isRegionalRadar}
      />
    </Dialog>
  );
}

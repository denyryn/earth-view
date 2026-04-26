import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  bboxFromPoint,
  bboxHeightKm,
  bboxWidthKm,
  clamp,
  normalizeLongitude,
} from "@/lib/geo";
import { getSentinelVariant, sentinelVariants } from "@/lib/sentinelVariants";
import type { BoundingBox } from "@/types/imagery";
import type { SentinelViewport } from "../SentinelWorkspace";
import {
  SENTINEL_DEFAULT_SIZE_DEGREES,
  SENTINEL_RENDER_SIZE,
  sentinelTimeLapseBboxKey,
} from "./imageryModalHelpers";
import type { ManagedObjectUrl, ModalMode, SentinelScene, SentinelState } from "./types";

type SelectedPoint = {
  lat: number;
  lon: number;
};

type SentinelImageryOptions = ManagedObjectUrl & {
  selectedPoint: SelectedPoint | null;
  modalOpen: boolean;
  mode: ModalMode;
  setMode: (mode: ModalMode) => void;
  date: string;
  bbox: BoundingBox | null;
  imageryZoomDegrees: number;
  imagePaneRef: RefObject<HTMLDivElement | null>;
};

export function useSentinelImagery({
  selectedPoint,
  modalOpen,
  mode,
  setMode,
  date,
  bbox,
  imageryZoomDegrees,
  imagePaneRef,
  createObjectUrl,
  revokeObjectUrl,
}: SentinelImageryOptions) {
  const sentinelDateRefreshScopeRef = useRef<string | null>(null);
  const [sentinelVariantId, setSentinelVariantId] = useState(sentinelVariants[0].id);
  const [sentinelState, setSentinelState] = useState<SentinelState>(null);
  const [sentinelLoading, setSentinelLoading] = useState(false);
  const [sentinelError, setSentinelError] = useState<string | null>(null);
  const [sentinelViewport, setSentinelViewport] = useState<SentinelViewport>({
    scale: 1,
    x: 0,
    y: 0,
  });

  const selectedSentinelVariant = getSentinelVariant(sentinelVariantId);
  const renderedSentinelVariant = getSentinelVariant(sentinelState?.variantId);

  function expandBboxToNativeLimit(inputBbox: BoundingBox, nativeMeters: number) {
    const widthKm = bboxWidthKm(inputBbox);
    const heightKm = bboxHeightKm(inputBbox);
    const currentMaxKm = Math.max(widthKm, heightKm);
    const minNativeKm = (nativeMeters * SENTINEL_RENDER_SIZE) / 1000;

    if (currentMaxKm >= minNativeKm || currentMaxKm <= 0) {
      return inputBbox;
    }

    const scale = minNativeKm / currentMaxKm;
    const centerLat = (inputBbox.minLat + inputBbox.maxLat) / 2;
    const centerLon = normalizeLongitude((inputBbox.minLon + inputBbox.maxLon) / 2);
    const nextLatSpan = (inputBbox.maxLat - inputBbox.minLat) * scale;
    const nextLonSpan = (inputBbox.maxLon - inputBbox.minLon) * scale;

    return {
      minLat: clamp(centerLat - nextLatSpan / 2, -85, 85),
      maxLat: clamp(centerLat + nextLatSpan / 2, -85, 85),
      minLon: clamp(centerLon - nextLonSpan / 2, -180, 180),
      maxLon: clamp(centerLon + nextLonSpan / 2, -180, 180),
    };
  }

  const fetchLatestSentinelScene = useCallback(async (sentinelBbox: BoundingBox, variantId: string) => {
    const variant = getSentinelVariant(variantId);
    const response = await fetch("/api/sentinel-scenes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        bbox: sentinelBbox,
        date,
        variantId: variant.id,
        limit: 1,
        lookbackDays: variant.requestWindowDays,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const { scenes } = (await response.json()) as { scenes?: SentinelScene[] };
    return scenes?.[0] ?? null;
  }, [date]);

  const requestSentinelImage = useCallback(async (
    sentinelBbox: BoundingBox,
    variantId = sentinelVariantId,
  ) => {
    if (!selectedPoint) {
      return;
    }

    const variant = getSentinelVariant(variantId);
    setSentinelVariantId(variant.id);
    setSentinelLoading(true);
    setSentinelError(null);

    try {
      const scene = await fetchLatestSentinelScene(sentinelBbox, variant.id);
      const response = await fetch("/api/sentinel-image", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bbox: sentinelBbox,
          date,
          sceneDateTime: scene?.dateTime,
          variantId: variant.id,
          width: SENTINEL_RENDER_SIZE,
          height: SENTINEL_RENDER_SIZE,
        }),
      });

      if (!response.ok) {
        let message = `${variant.name} imagery is unavailable for this area/date.`;

        try {
          const body = (await response.json()) as { error?: string };
          message = body.error ?? message;
        } catch {
          message = await response.text();
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const imageUrl = createObjectUrl(blob);
      sentinelDateRefreshScopeRef.current = [
        date,
        variant.id,
        sentinelTimeLapseBboxKey(sentinelBbox),
      ].join("|");
      setSentinelState((previous) => {
        revokeObjectUrl(previous?.imageUrl);

        return {
          imageUrl,
          bbox: sentinelBbox,
          variantId: variant.id,
          sceneDateTime: scene?.dateTime,
        };
      });
      setSentinelVariantId(variant.id);
      setSentinelViewport({ scale: 1, x: 0, y: 0 });
      setMode("sentinel");
    } catch (requestError) {
      setSentinelError(
        requestError instanceof Error
          ? requestError.message
          : `${variant.name} image request failed.`,
      );
    } finally {
      setSentinelLoading(false);
    }
  }, [
    createObjectUrl,
    date,
    fetchLatestSentinelScene,
    revokeObjectUrl,
    selectedPoint,
    sentinelVariantId,
    setMode,
  ]);

  useEffect(() => {
    if (!modalOpen || mode !== "sentinel" || !sentinelState) {
      sentinelDateRefreshScopeRef.current = null;
      return;
    }

    if (sentinelLoading) {
      return;
    }

    const nextScope = [
      date,
      sentinelState.variantId,
      sentinelTimeLapseBboxKey(sentinelState.bbox),
    ].join("|");

    if (sentinelDateRefreshScopeRef.current === nextScope) {
      return;
    }

    sentinelDateRefreshScopeRef.current = nextScope;
    void requestSentinelImage(sentinelState.bbox, sentinelState.variantId);
  }, [date, modalOpen, mode, requestSentinelImage, sentinelLoading, sentinelState]);

  async function renderSentinelImage(center = selectedPoint) {
    if (!bbox || !center) {
      return;
    }

    const defaultSentinelVariant = sentinelVariants[0];
    await requestSentinelImage(
      expandBboxToNativeLimit(
        bboxFromPoint(
          center.lat,
          center.lon,
          Math.min(imageryZoomDegrees, SENTINEL_DEFAULT_SIZE_DEGREES),
        ),
        defaultSentinelVariant.resolution,
      ),
      defaultSentinelVariant.id,
    );
  }

  function sentinelBboxForViewport(viewport: SentinelViewport, respectNativeLimit = false) {
    if (!sentinelState) {
      return null;
    }

    const rect = imagePaneRef.current?.getBoundingClientRect();

    if (!rect) {
      return sentinelState.bbox;
    }

    const sourceBbox = sentinelState.bbox;
    const sourceLat = (sourceBbox.minLat + sourceBbox.maxLat) / 2;
    const sourceLon = normalizeLongitude((sourceBbox.minLon + sourceBbox.maxLon) / 2);
    const scale = viewport.scale || 1;
    const lonSpan = sourceBbox.maxLon - sourceBbox.minLon;
    const latSpan = sourceBbox.maxLat - sourceBbox.minLat;
    const nextLonSpan = lonSpan / scale;
    const nextLatSpan = latSpan / scale;
    const nextLat = clamp(
      sourceLat + (viewport.y / (rect.height * scale)) * latSpan,
      -85,
      85,
    );
    const nextLon = normalizeLongitude(
      sourceLon - (viewport.x / (rect.width * scale)) * lonSpan,
    );

    const nextBbox = {
      minLat: clamp(nextLat - nextLatSpan / 2, -85, 85),
      maxLat: clamp(nextLat + nextLatSpan / 2, -85, 85),
      minLon: clamp(nextLon - nextLonSpan / 2, -180, 180),
      maxLon: clamp(nextLon + nextLonSpan / 2, -180, 180),
    };

    return respectNativeLimit
      ? expandBboxToNativeLimit(nextBbox, renderedSentinelVariant.resolution)
      : nextBbox;
  }

  async function commitSentinelPan(viewport: SentinelViewport) {
    if (sentinelLoading || !sentinelState) {
      return;
    }

    const variantId = sentinelState.variantId;
    const nextBbox = sentinelBboxForViewport(viewport, true);

    if (!nextBbox) {
      return;
    }

    await requestSentinelImage(nextBbox, variantId);
  }

  async function refineSentinelView() {
    if (sentinelLoading || !sentinelState) {
      return;
    }

    const variantId = sentinelState.variantId;
    const nextBbox = sentinelBboxForViewport(sentinelViewport, true);

    if (!nextBbox) {
      return;
    }

    await requestSentinelImage(nextBbox, variantId);
  }

  async function changeSentinelVariant(nextVariantId: string) {
    setSentinelVariantId(nextVariantId);

    if (sentinelLoading || !sentinelState) {
      return;
    }

    const nextVariant = getSentinelVariant(nextVariantId);
    await requestSentinelImage(
      expandBboxToNativeLimit(sentinelState.bbox, nextVariant.resolution),
      nextVariant.id,
    );
  }

  function exitSentinelMode() {
    setMode("regional");
    setSentinelError(null);
  }

  const resetSentinel = useCallback(() => {
    setMode("regional");
    setSentinelState((previous) => {
      revokeObjectUrl(previous?.imageUrl);
      return null;
    });
    setSentinelError(null);
    setSentinelViewport({ scale: 1, x: 0, y: 0 });
  }, [revokeObjectUrl, setMode]);

  const sentinelWidth = sentinelState ? bboxWidthKm(sentinelState.bbox) : 0;
  const sentinelHeight = sentinelState ? bboxHeightKm(sentinelState.bbox) : 0;
  const sentinelNativeMeters = sentinelState
    ? (Math.max(sentinelWidth, sentinelHeight) * 1000) / SENTINEL_RENDER_SIZE
    : 0;
  const refinedSentinelBbox = sentinelState
    ? sentinelBboxForViewport(sentinelViewport, true)
    : null;
  const refinedSentinelMeters = refinedSentinelBbox
    ? (Math.max(bboxWidthKm(refinedSentinelBbox), bboxHeightKm(refinedSentinelBbox)) * 1000) /
      SENTINEL_RENDER_SIZE
    : 0;
  const canRefineSentinel =
    sentinelViewport.scale > 1.01 &&
    refinedSentinelBbox !== null &&
    Math.abs(refinedSentinelMeters - sentinelNativeMeters) > 0.2;

  return {
    sentinelVariantId,
    selectedSentinelVariant,
    renderedSentinelVariant,
    sentinelState,
    sentinelLoading,
    sentinelError,
    sentinelViewport,
    sentinelWidth,
    sentinelHeight,
    sentinelNativeMeters,
    canRefineSentinel,
    setSentinelViewport,
    renderSentinelImage,
    commitSentinelPan,
    refineSentinelView,
    changeSentinelVariant,
    exitSentinelMode,
    resetSentinel,
  };
}

import { clamp } from "@/lib/geo";
import type { BoundingBox } from "@/types/imagery";
import type { SentinelScene } from "./types";

export const SENTINEL_DEFAULT_SIZE_DEGREES = 0.09;
export const SENTINEL_RENDER_SIZE = 1024;
export const SENTINEL_SCENE_LOOKBACK_DAYS = 730;
export const SENTINEL_SCENE_SEARCH_LIMIT = 100;
export const SENTINEL_FIVE_YEAR_LOOKBACK_DAYS = 366;
export const SENTINEL_YEAR_SCENE_SAMPLE_SIZE = 6;
export const SENTINEL_YEAR_SCENE_SEARCH_LIMIT = 80;
export const SENTINEL_FRAME_CONCURRENCY = 5;
export const TIME_LAPSE_SPEEDS = {
  7: 650,
  30: 180,
  "5y": 260,
};

export function bboxFromSpans(
  lat: number,
  lon: number,
  latSpan: number,
  lonSpan: number,
): BoundingBox {
  return {
    minLat: clamp(lat - latSpan / 2, -85, 85),
    maxLat: clamp(lat + latSpan / 2, -85, 85),
    minLon: clamp(lon - lonSpan / 2, -180, 180),
    maxLon: clamp(lon + lonSpan / 2, -180, 180),
  };
}

export function sentinelTimeLapseBboxKey(bbox: BoundingBox) {
  return [
    bbox.minLat,
    bbox.minLon,
    bbox.maxLat,
    bbox.maxLon,
  ]
    .map((value) => value.toFixed(6))
    .join(",");
}

export function isoDateFromDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addUtcYears(value: Date, years: number) {
  const next = new Date(value);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

export function selectEvenlySpacedScenes(scenes: SentinelScene[], count: number) {
  const sortedScenes = scenes
    .slice()
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  if (sortedScenes.length <= count) {
    return sortedScenes;
  }

  const selectedScenes: SentinelScene[] = [];
  const usedIndexes = new Set<number>();

  for (let index = 0; index < count; index += 1) {
    const targetIndex = Math.round((index * (sortedScenes.length - 1)) / (count - 1));
    let nearestIndex = targetIndex;

    while (usedIndexes.has(nearestIndex) && nearestIndex < sortedScenes.length - 1) {
      nearestIndex += 1;
    }

    while (usedIndexes.has(nearestIndex) && nearestIndex > 0) {
      nearestIndex -= 1;
    }

    usedIndexes.add(nearestIndex);
    selectedScenes.push(sortedScenes[nearestIndex]);
  }

  return selectedScenes.sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
  );
}

export function preloadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = url;
  });
}

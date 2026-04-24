import { Vector3 } from "three";
import type { BoundingBox, ZoomLevel } from "@/types/imagery";

export const ZOOM_LEVELS: Record<ZoomLevel, { label: string; size: number }> = {
  continental: { label: "Continental", size: 10 },
  regional: { label: "Regional", size: 2 },
  local: { label: "Local", size: 0.2 },
  pinpoint: { label: "Pinpoint", size: 0.05 },
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function pointToLatLon(point: Vector3, radius = 1) {
  const normalized = point.clone().normalize();
  const lat = 90 - (Math.acos(clamp(normalized.y / radius, -1, 1)) * 180) / Math.PI;
  const lon = ((Math.atan2(normalized.z, -normalized.x) * 180) / Math.PI + 540) % 360 - 180;

  return { lat, lon };
}

export function latLonToVector(lat: number, lon: number, radius = 1) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);

  return new Vector3(
    -radius * cosLat * Math.cos(lonRad),
    radius * Math.sin(latRad),
    radius * cosLat * Math.sin(lonRad),
  );
}

export function bboxFromPoint(lat: number, lon: number, size: number): BoundingBox {
  const half = size / 2;

  return {
    minLat: clamp(lat - half, -85, 85),
    maxLat: clamp(lat + half, -85, 85),
    minLon: clamp(lon - half, -180, 180),
    maxLon: clamp(lon + half, -180, 180),
  };
}

export function formatCoordinates(lat: number, lon: number) {
  const latSuffix = lat >= 0 ? "N" : "S";
  const lonSuffix = lon >= 0 ? "E" : "W";

  return `${Math.abs(lat).toFixed(2)}°${latSuffix}, ${Math.abs(lon).toFixed(2)}°${lonSuffix}`;
}

import type { ImageryProvider, ImageryRequest } from "@/types/imagery";

type SentinelImageError = {
  error?: string;
};

export class SentinelRadarProvider implements ImageryProvider {
  id = "sentinel-1-radar";
  layerId?: string;
  name = "Sentinel-1 Radar";
  satellite = "Sentinel-1";
  category = "Radar";
  resolution = 10;
  requiresAuth = true;
  summary =
    "Copernicus Sentinel-1 synthetic aperture radar rendered for the current regional view.";
  bestFor =
    "Cloudy scenes, night-capable surface context, floods, water boundaries, urban texture, and roughness changes.";
  caveat =
    "Radar is not photographic and uses the latest available pass near the selected date, so it can differ from same-day optical layers.";
  loadingMessage = "Sentinel-1 radar data takes longer to load.";

  async fetchImage(params: ImageryRequest) {
    const response = await fetch("/api/sentinel-image", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        bbox: params.bbox,
        date: params.date,
        variantId: "s1-radar",
        width: params.width,
        height: params.height,
      }),
    });

    if (!response.ok) {
      let message = "Sentinel-1 radar imagery is unavailable for this area/date.";

      try {
        const body = (await response.json()) as SentinelImageError;
        message = body.error ?? message;
      } catch {
        message = await response.text();
      }

      throw new Error(message);
    }

    return response.blob();
  }
}

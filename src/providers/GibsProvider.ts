import type { BoundingBox, ImageryProvider, ImageryRequest } from "@/types/imagery";

const GIBS_WMS_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

type GibsLayerConfig = {
  id: string;
  layerId: string;
  name: string;
  satellite: string;
  resolution: number;
};

function bboxParam(bbox: BoundingBox) {
  return [bbox.minLat, bbox.minLon, bbox.maxLat, bbox.maxLon]
    .map((value) => Number(value.toFixed(4)))
    .join(",");
}

export function buildGibsWmsUrl(layerId: string, params: ImageryRequest) {
  const search = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: layerId,
    CRS: "EPSG:4326",
    TIME: params.date,
    WIDTH: String(params.width),
    HEIGHT: String(params.height),
    BBOX: bboxParam(params.bbox),
    FORMAT: "image/png",
    TRANSPARENT: "FALSE",
  });

  return `${GIBS_WMS_URL}?${search.toString()}`;
}

export function buildGlobalGibsTextureUrl(date: string) {
  return buildGibsWmsUrl("VIIRS_SNPP_CorrectedReflectance_TrueColor", {
    date,
    width: 2048,
    height: 1024,
    bbox: {
      minLat: -90,
      minLon: -180,
      maxLat: 90,
      maxLon: 180,
    },
  });
}

export class GibsProvider implements ImageryProvider {
  id: string;
  layerId: string;
  name: string;
  satellite: string;
  resolution: number;
  requiresAuth = false;

  constructor(config: GibsLayerConfig) {
    this.id = config.id;
    this.layerId = config.layerId;
    this.name = config.name;
    this.satellite = config.satellite;
    this.resolution = config.resolution;
  }

  async fetchImage(params: ImageryRequest) {
    return buildGibsWmsUrl(this.layerId, params);
  }
}

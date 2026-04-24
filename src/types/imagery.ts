export type BoundingBox = {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
};

export type ZoomLevel = "continental" | "regional" | "local" | "pinpoint";

export type ImageryRequest = {
  bbox: BoundingBox;
  date: string;
  width: number;
  height: number;
};

export interface ImageryProvider {
  id: string;
  layerId: string;
  name: string;
  satellite: string;
  resolution: number;
  requiresAuth: boolean;
  fetchImage(params: ImageryRequest): Promise<string | Blob>;
}

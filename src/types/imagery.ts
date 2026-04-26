export type BoundingBox = {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
};

export type ImageryRequest = {
  bbox: BoundingBox;
  date: string;
  width: number;
  height: number;
};

export interface ImageryProvider {
  id: string;
  layerId?: string;
  name: string;
  satellite: string;
  category: string;
  resolution: number;
  requiresAuth: boolean;
  summary: string;
  bestFor: string;
  caveat: string;
  loadingMessage?: string;
  fetchImage(params: ImageryRequest): Promise<string | Blob>;
}

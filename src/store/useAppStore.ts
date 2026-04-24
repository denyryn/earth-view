import { create } from "zustand";
import { getYesterdayIso } from "@/lib/dates";
import {
  DEFAULT_IMAGERY_ZOOM_DEGREES,
  IMAGERY_ZOOM_MAX_DEGREES,
  IMAGERY_ZOOM_MIN_DEGREES,
  clamp,
} from "@/lib/geo";

type SelectedPoint = {
  lat: number;
  lon: number;
};

type GlobeView = {
  lat: number;
  lon: number;
  latSpan: number;
  lonSpan: number;
  distance: number;
  atMaxZoom: boolean;
};

type GlobeFocusRequest = {
  lat: number;
  lon: number;
  immediate: boolean;
  nonce: number;
};

type AppState = {
  selectedPoint: SelectedPoint | null;
  globeView: GlobeView | null;
  globeFocusRequest: GlobeFocusRequest | null;
  modalOpen: boolean;
  date: string;
  layerId: string;
  imageryZoomDegrees: number;
  selectPoint: (lat: number, lon: number, zoomDegrees?: number) => void;
  recenterPoint: (lat: number, lon: number) => void;
  setGlobeView: (view: GlobeView) => void;
  focusGlobeAt: (
    lat: number,
    lon: number,
    options?: { immediate?: boolean; syncView?: boolean },
  ) => void;
  closeModal: () => void;
  setDate: (date: string) => void;
  setLayer: (id: string) => void;
  setImageryZoomDegrees: (degrees: number) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedPoint: null,
  globeView: null,
  globeFocusRequest: null,
  modalOpen: false,
  date: getYesterdayIso(),
  layerId: "viirs-snpp",
  imageryZoomDegrees: DEFAULT_IMAGERY_ZOOM_DEGREES,
  selectPoint: (lat, lon, zoomDegrees) =>
    set((state) => ({
      selectedPoint: { lat, lon },
      modalOpen: true,
      imageryZoomDegrees:
        zoomDegrees === undefined
          ? state.imageryZoomDegrees
          : clamp(zoomDegrees, IMAGERY_ZOOM_MIN_DEGREES, IMAGERY_ZOOM_MAX_DEGREES),
    })),
  recenterPoint: (lat, lon) => set({ selectedPoint: { lat, lon } }),
  setGlobeView: (globeView) => set({ globeView }),
  focusGlobeAt: (lat, lon, options) =>
    set((state) => ({
      globeFocusRequest: {
        lat,
        lon,
        immediate: options?.immediate ?? false,
        nonce: (state.globeFocusRequest?.nonce ?? 0) + 1,
      },
      globeView: (options?.syncView ?? true) && state.globeView
        ? {
            ...state.globeView,
            lat,
            lon,
          }
        : state.globeView,
    })),
  closeModal: () => set({ modalOpen: false }),
  setDate: (date) => set({ date }),
  setLayer: (layerId) => set({ layerId }),
  setImageryZoomDegrees: (imageryZoomDegrees) => set({ imageryZoomDegrees }),
}));

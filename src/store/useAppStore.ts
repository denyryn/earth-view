import { create } from "zustand";
import { getYesterdayIso } from "@/lib/dates";
import { DEFAULT_IMAGERY_ZOOM_DEGREES } from "@/lib/geo";

type SelectedPoint = {
  lat: number;
  lon: number;
};

type AppState = {
  selectedPoint: SelectedPoint | null;
  modalOpen: boolean;
  date: string;
  layerId: string;
  imageryZoomDegrees: number;
  selectPoint: (lat: number, lon: number) => void;
  closeModal: () => void;
  setDate: (date: string) => void;
  setLayer: (id: string) => void;
  setImageryZoomDegrees: (degrees: number) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedPoint: null,
  modalOpen: false,
  date: getYesterdayIso(),
  layerId: "viirs-snpp",
  imageryZoomDegrees: DEFAULT_IMAGERY_ZOOM_DEGREES,
  selectPoint: (lat, lon) => set({ selectedPoint: { lat, lon }, modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
  setDate: (date) => set({ date }),
  setLayer: (layerId) => set({ layerId }),
  setImageryZoomDegrees: (imageryZoomDegrees) => set({ imageryZoomDegrees }),
}));

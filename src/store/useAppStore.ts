import { create } from "zustand";
import { getYesterdayIso } from "@/lib/dates";
import type { ZoomLevel } from "@/types/imagery";

type SelectedPoint = {
  lat: number;
  lon: number;
};

type AppState = {
  selectedPoint: SelectedPoint | null;
  modalOpen: boolean;
  date: string;
  layerId: string;
  zoomLevel: ZoomLevel;
  selectPoint: (lat: number, lon: number) => void;
  closeModal: () => void;
  setDate: (date: string) => void;
  setLayer: (id: string) => void;
  setZoomLevel: (zoomLevel: ZoomLevel) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedPoint: null,
  modalOpen: false,
  date: getYesterdayIso(),
  layerId: "viirs-snpp",
  zoomLevel: "regional",
  selectPoint: (lat, lon) => set({ selectedPoint: { lat, lon }, modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
  setDate: (date) => set({ date }),
  setLayer: (layerId) => set({ layerId }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
}));

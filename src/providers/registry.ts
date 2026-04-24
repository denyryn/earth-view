import { GibsProvider } from "./GibsProvider";

export const imageryProviders = [
  new GibsProvider({
    id: "modis-terra",
    layerId: "MODIS_Terra_CorrectedReflectance_TrueColor",
    name: "MODIS Terra",
    satellite: "Terra",
    resolution: 250,
  }),
  new GibsProvider({
    id: "modis-aqua",
    layerId: "MODIS_Aqua_CorrectedReflectance_TrueColor",
    name: "MODIS Aqua",
    satellite: "Aqua",
    resolution: 250,
  }),
  new GibsProvider({
    id: "viirs-snpp",
    layerId: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    name: "VIIRS SNPP",
    satellite: "Suomi NPP",
    resolution: 375,
  }),
  new GibsProvider({
    id: "viirs-noaa20",
    layerId: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    name: "VIIRS NOAA-20",
    satellite: "NOAA-20",
    resolution: 375,
  }),
];

export function getImageryProvider(id: string) {
  return imageryProviders.find((provider) => provider.id === id) ?? imageryProviders[0];
}

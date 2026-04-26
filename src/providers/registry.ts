import { GibsProvider } from "./GibsProvider";
import { SentinelProvider } from "./SentinelProvider";

export const imageryProviders = [
  new GibsProvider({
    id: "modis-terra",
    layerId: "MODIS_Terra_CorrectedReflectance_TrueColor",
    name: "MODIS Terra",
    satellite: "Terra",
    category: "True color",
    resolution: 250,
    summary: "Morning-pass MODIS true-color imagery, roughly what human eyes would see from orbit.",
    bestFor: "Long-running archive, cloud patterns, smoke, snow, broad land and ocean context.",
    caveat: "Moderate resolution only; city-scale zooms will soften quickly.",
  }),
  new GibsProvider({
    id: "modis-aqua",
    layerId: "MODIS_Aqua_CorrectedReflectance_TrueColor",
    name: "MODIS Aqua",
    satellite: "Aqua",
    category: "True color",
    resolution: 250,
    summary: "Afternoon-pass MODIS true-color imagery that complements Terra's morning view.",
    bestFor: "Comparing same-day cloud cover and lighting against Terra.",
    caveat: "Same moderate-resolution tradeoff as Terra; often cloud-limited.",
  }),
  new GibsProvider({
    id: "viirs-snpp",
    layerId: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    name: "VIIRS SNPP",
    satellite: "Suomi NPP",
    category: "True color",
    resolution: 375,
    summary: "Modern VIIRS true-color imagery from Suomi NPP with daily global coverage.",
    bestFor: "Recent broad-area imagery, storms, wildfire smoke, snow, sea ice, and land/ocean context.",
    caveat: "Nominal resolution is coarser than MODIS, but coverage and recency are strong.",
  }),
  new GibsProvider({
    id: "viirs-noaa20",
    layerId: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    name: "VIIRS NOAA-20",
    satellite: "NOAA-20",
    category: "True color",
    resolution: 375,
    summary: "Alternate VIIRS true-color view from NOAA-20.",
    bestFor: "Another daily pass when SNPP is cloudy, late, or visually less useful.",
    caveat: "Still moderate-resolution and not building- or street-level.",
  }),
  new GibsProvider({
    id: "viirs-snpp-swir",
    layerId: "VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1",
    name: "VIIRS SNPP SWIR",
    satellite: "Suomi NPP",
    category: "False color",
    resolution: 375,
    summary: "Shortwave-infrared false color that makes burn scars and some smoke/cloud differences easier to read.",
    bestFor: "Wildfires, burn scars, flooded areas, snow/ice/cloud separation, and vegetation contrast.",
    caveat: "Colors are analytic rather than natural; it can look strange until you learn the palette.",
  }),
  new GibsProvider({
    id: "viirs-snpp-cloud-snow",
    layerId: "VIIRS_SNPP_CorrectedReflectance_BandsM3-I3-M11",
    name: "VIIRS SNPP Cloud/Snow",
    satellite: "Suomi NPP",
    category: "False color",
    resolution: 375,
    summary: "Visible, near-infrared, and shortwave-infrared composite tuned for cloud, snow, ice, and land-surface contrast.",
    bestFor: "Separating snow or ice from clouds and seeing water/vegetation differences.",
    caveat: "Best interpreted comparatively; it is not meant to look photographic.",
  }),
  new GibsProvider({
    id: "viirs-noaa20-swir",
    layerId: "VIIRS_NOAA20_CorrectedReflectance_BandsM11-I2-I1",
    name: "VIIRS NOAA-20 SWIR",
    satellite: "NOAA-20",
    category: "False color",
    resolution: 375,
    summary: "NOAA-20 shortwave-infrared false color, useful as an alternate pass to SNPP.",
    bestFor: "Fire, burn scar, flood, snow, ice, and vegetation contrast on another VIIRS platform.",
    caveat: "False-color interpretation takes a moment; this is analysis imagery, not natural color.",
  }),
  new SentinelProvider({ id: "sentinel-2-true-color", variantId: "s2-true-color" }),
  new SentinelProvider({ id: "sentinel-2-false-color", variantId: "s2-false-color" }),
  new SentinelProvider({ id: "sentinel-2-swir", variantId: "s2-swir" }),
  new SentinelProvider({ id: "sentinel-1-radar", variantId: "s1-radar" }),
];

export const modalImageryProviders = [
  ...imageryProviders.filter((provider) => provider.sentinelVariantId),
  ...imageryProviders.filter((provider) => !provider.sentinelVariantId),
];

export function getImageryProvider(id: string) {
  return imageryProviders.find((provider) => provider.id === id) ?? imageryProviders[0];
}

import * as THREE from "three";
import {
  loadWorldAtlas,
  getCountryCentroidByCode,
  type CountryFeature,
  type CountryFeatureCollection,
} from "@/data/worldAtlas";
import { getCountryByCode } from "@/data/countries";
import type { Country } from "@/lib/types";

export const GLOBE_RADIUS = 100;
export const HEATMAP_KEY = "__heat__";

const INDIA_FILL = "#FDBA74";
const PAKISTAN_FILL = "#22C55E";

function buildAlpha2ToCountryMap(
  fc: CountryFeatureCollection
): Map<string, CountryFeature> {
  const map = new Map<string, CountryFeature>();
  for (const feature of fc.features) {
    const alpha2 = feature.properties?.iso_a2;
    if (alpha2 && alpha2 !== "-99" && alpha2.length === 2) {
      map.set(alpha2.toUpperCase(), feature);
    }
  }
  return map;
}

export function buildGlobePolygons(
  fc: CountryFeatureCollection,
  heatData?: Record<string, number>,
  heatMax = 1
): CountryFeatureCollection {
  const out: CountryFeature[] = [];

  for (const feature of fc.features) {
    const clone: CountryFeature = {
      type: "Feature",
      properties: { ...feature.properties },
      geometry: feature.geometry,
    };
    const code = (clone.properties.iso_a2 || "").toUpperCase();
    const heat = code && heatData ? heatData[code] ?? 0 : 0;
    (clone.properties as Record<string, unknown>)[HEATMAP_KEY] = heat;
    (clone.properties as Record<string, unknown>)["__color__"] = resolveDefaultCountryColor(
      code,
      heat,
      heatMax
    );
    out.push(clone);
  }

  return { type: "FeatureCollection", features: out };
}

export function resolveDefaultCountryColor(
  code: string,
  heat: number,
  heatMax: number
): string {
  if (code === "IN") return INDIA_FILL;
  if (code === "PK") return PAKISTAN_FILL;

  if (heat > 0 && heatMax > 0) {
    const ratio = heat / heatMax;
    if (ratio < 0.1) return "#DCFCE7";
    if (ratio < 0.25) return "#BBF7D0";
    if (ratio < 0.4) return "#FEF08A";
    if (ratio < 0.55) return "#FDE047";
    if (ratio < 0.7) return "#FB923C";
    if (ratio < 0.85) return "#F97316";
    return "#EF4444";
  }

  const country = getCountryByCode(code);
  return country?.color || "#22C55E";
}

export function resolveCountryColor(
  feature: CountryFeature,
  args: {
    selectedCountry: string | null;
    highlightedCountry: string | null;
    hoveredCode: string | null;
  }
): string {
  const code = (feature.properties?.iso_a2 || "").toUpperCase();
  if (code === "IN") return INDIA_FILL;
  if (code === "PK") return PAKISTAN_FILL;

  if (args.selectedCountry === code) return "#F97316";
  if (args.highlightedCountry === code) return "#EF4444";
  if (args.hoveredCode === code) return "#FB923C";
  const fallback = (feature.properties as Record<string, unknown>)["__color__"] as
    | string
    | undefined;
  return fallback || "#475569";
}

export function countryCentroidLatLng(country: Country): { lat: number; lng: number } {
  const centroid = getCountryCentroidByCode(country.code);
  if (centroid) return centroid;

  const viewCx = 410;
  const viewCy = 165;
  const viewLonPerUnit = 360 / 640;
  const viewLatPerUnit = 180 / 310;

  return {
    lng: (country.coordinates.x - viewCx) * viewLonPerUnit,
    lat: (viewCy - country.coordinates.y) * viewLatPerUnit,
  };
}

export function latLngToVec3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function loadGlobeAtlas() {
  return loadWorldAtlas();
}
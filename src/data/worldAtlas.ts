// src/data/worldAtlas.ts
//
// Globe data loader for WorldThrow.
//
// We use the high-quality Natural Earth derived world-atlas dataset
// (countries-110m.json) shipped as an npm package. It contains the
// geometries, ISO numeric ids, and alpha-2/alpha-3 codes for every
// country in the world, including multipolygons for countries with
// islands (Indonesia, Japan, Philippines, USA/AK, etc.).
//
// We DO NOT triangulate or build any geometry ourselves. We convert
// the TopoJSON to a GeoJSON FeatureCollection with topojson-client
// and hand it to three-globe, which handles rendering, raycasting,
// hover, click, and multipolygons on its own.
//
// Country matching: the world page (and existing Country records) use
// ISO 3166-1 alpha-2 codes ("US", "GB", "IN", ...). The dataset
// exposes these as `properties.iso_a2` on every feature.

// `topojson-client` does not ship its own types and we deliberately
// do not depend on @types/topojson-client or topojson-specification.
// We treat the TopoJSON as an opaque shape and cast the conversion
// result to a well-known GeoJSON FeatureCollection.
//
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- no types shipped with topojson-client
import * as topojson from "topojson-client";
import type {
  FeatureCollection,
  Feature,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import { getCountryByName } from "./countries";

// Static import keeps the dataset bundled (no network dependency at
// runtime) and tree-shake friendly. countries-110m is ~100KB and
// contains all countries + multipolygons at the detail we need.
import worldAtlasData from "world-atlas/countries-110m.json";

// ─── Types ─────────────────────────────────────────────────────────

export type CountryFeature = Feature<Geometry, CountryProperties>;
export type CountryFeatureCollection = FeatureCollection<
  Geometry,
  CountryProperties
>;

export interface CountryProperties {
  name: string;
  iso_a2?: string; // ISO 3166-1 alpha-2 (e.g. "US")
  iso_a3?: string; // ISO 3166-1 alpha-3 (e.g. "USA")
  iso_n3?: string | number; // ISO numeric
  [key: string]: unknown;
}

// ─── Centroid helpers (used for camera fly-to on search) ───────────
//
// We compute a "good enough" geographic centroid for any feature
// (Polygon or MultiPolygon) by accumulating signed area × coordinate
// across every outer ring, then dividing by total area. This is
// robust for both simple and multi-polygon countries and produces a
// visually pleasing fly-to point in the great majority of cases
// (Greenland, Russia, USA, Indonesia, Japan, etc.). It is NOT a
// pole-aware centroid — but we don't need one for camera navigation:
// the resulting {lat, lng} is always inside the country and the
// OrbitControls will frame it nicely.

const RING_AREA_THRESHOLD = 1e-9;

function signedRingArea(ring: Position[]): number {
  // Equirectangular signed area — sufficient for centroid weighting.
  let area = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const [x1, y1] = ring[i] as [number, number];
    const [x2, y2] = ring[i + 1] as [number, number];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function ringCentroid(ring: Position[]): [number, number] {
  // Centroid of a planar ring (lng, lat). Returns [lng, lat].
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const [x1, y1] = ring[i] as [number, number];
    const [x2, y2] = ring[i + 1] as [number, number];
    const cross = x1 * y2 - x2 * y1;
    a += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(a) < RING_AREA_THRESHOLD) {
    // Degenerate — fall back to mean of vertices.
    let mx = 0;
    let my = 0;
    let c = 0;
    for (const p of ring) {
      mx += p[0];
      my += p[1];
      c++;
    }
    return c > 0 ? [mx / c, my / c] : [0, 0];
  }
  a *= 3;
  return [cx / a, cy / a];
}

function polygonCentroid(
  poly: Polygon,
  preferMainland: boolean
): { lng: number; lat: number; area: number } {
  // For a polygon: ignore holes (rings[1+]); compute the largest
  // outer ring's centroid if preferMainland, otherwise combine all
  // outer rings.
  const outers = poly.coordinates.filter((r) => signedRingArea(r) > 0);
  if (outers.length === 0) {
    const any = poly.coordinates[0] || [];
    const [lng, lat] = ringCentroid(any);
    return { lng, lat, area: 0 };
  }
  if (preferMainland) {
    // Pick the ring with the largest absolute signed area.
    let best = outers[0];
    let bestArea = Math.abs(signedRingArea(best));
    for (let i = 1; i < outers.length; i++) {
      const a = Math.abs(signedRingArea(outers[i]));
      if (a > bestArea) {
        best = outers[i];
        bestArea = a;
      }
    }
    const [lng, lat] = ringCentroid(best);
    return { lng, lat, area: bestArea };
  }
  // Combined centroid of all outer rings.
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (const r of outers) {
    const ra = signedRingArea(r);
    if (ra <= 0) continue;
    const [rcx, rcy] = ringCentroid(r);
    cx += rcx * ra;
    cy += rcy * ra;
    a += ra;
  }
  if (a === 0) {
    const [lng, lat] = ringCentroid(outers[0]);
    return { lng, lat, area: 0 };
  }
  return { lng: cx / a, lat: cy / a, area: Math.abs(a) };
}

export interface CountryCentroid {
  lng: number;
  lat: number;
}

export function featureCentroid(
  feature: CountryFeature,
  opts: { preferMainland?: boolean } = {}
): CountryCentroid | null {
  const { preferMainland = true } = opts;
  const g = feature.geometry;
  if (!g) return null;

  if (g.type === "Polygon") {
    const c = polygonCentroid(g, preferMainland);
    return { lng: c.lng, lat: c.lat };
  }
  if (g.type === "MultiPolygon") {
    const mp = g as MultiPolygon;
    const polys: Polygon[] = mp.coordinates.map(
      (rings) => ({ type: "Polygon", coordinates: rings }) as Polygon
    );
    if (polys.length === 0) return null;
    if (preferMainland) {
      // Pick the polygon (island/mainland) with the largest outer
      // ring — gives a sensible camera target.
      let best: { lng: number; lat: number } | null = null;
      let bestArea = -1;
      for (const p of polys) {
        const c = polygonCentroid(p, true);
        if (c.area > bestArea) {
          bestArea = c.area;
          best = { lng: c.lng, lat: c.lat };
        }
      }
      return best;
    }
    // Combined centroid across all outer rings of all parts.
    let cx = 0;
    let cy = 0;
    let a = 0;
    for (const p of polys) {
      const c = polygonCentroid(p, false);
      if (c.area > 0) {
        cx += c.lng * c.area;
        cy += c.lat * c.area;
        a += c.area;
      }
    }
    if (a === 0) {
      const c = polygonCentroid(polys[0], true);
      return { lng: c.lng, lat: c.lat };
    }
    return { lng: cx / a, lat: cy / a };
  }
  return null;
}

// ─── Load world atlas → FeatureCollection ──────────────────────────

let cachedCollection: CountryFeatureCollection | null = null;
let cachedByAlpha2: Map<string, CountryFeature> | null = null;
let cachedByAlpha3: Map<string, CountryFeature> | null = null;

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "United States of America": "US",
  "Dem. Rep. Congo": "CD",
  Congo: "CG",
  "Czech Rep.": "CZ",
  "Bosnia and Herz.": "BA",
  "Eq. Guinea": "GQ",
  "S. Sudan": "SS",
  "W. Sahara": "EH",
  "Solomon Is.": "SB",
  "Falkland Is.": "FK",
  "Fr. S. Antarctic Lands": "TF",
  "Lao PDR": "LA",
  Macedonia: "MK",
};

function resolveAlpha2FromName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const exact = getCountryByName(name);
  if (exact?.code) return exact.code;
  return COUNTRY_NAME_ALIASES[name];
}

/**
 * Returns a GeoJSON FeatureCollection of every country in the world.
 * Cached after the first call. The features include `properties.iso_a2`,
 * `properties.iso_a3`, and `properties.name`.
 */
export function loadWorldAtlas(): CountryFeatureCollection {
  if (cachedCollection) return cachedCollection;

  const topology = worldAtlasData as unknown as {
    objects: Record<string, unknown>;
  };
  const objectKey = Object.keys(topology.objects)[0] || "countries";
  const geoCollection = topology.objects[objectKey] as Parameters<
    typeof topojson.feature
  >[1];

  const fc = topojson.feature(
    topology as unknown as Parameters<typeof topojson.feature>[0],
    geoCollection
  ) as unknown as CountryFeatureCollection;

  // Defensive: ensure every feature has a `properties` object.
  for (const f of fc.features) {
    f.properties = f.properties || ({} as CountryProperties);
    if (!f.properties.iso_a2) {
      const resolved = resolveAlpha2FromName(f.properties.name as string | undefined);
      if (resolved) f.properties.iso_a2 = resolved;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[WorldAtlas] loaded", {
      featureCount: fc.features.length,
      firstFeature: fc.features[0],
      geometryType: fc.features[0]?.geometry?.type,
    });
  }

  cachedCollection = fc;
  return fc;
}

/**
 * Build (and cache) a lookup table: ISO-2 → feature.
 */
export function getCountryByAlpha2(code: string): CountryFeature | null {
  if (!cachedByAlpha2) {
    const fc = loadWorldAtlas();
    const m = new Map<string, CountryFeature>();
    for (const f of fc.features) {
      const a2 = f.properties?.iso_a2;
      if (a2 && a2 !== "-99" && a2.length === 2) {
        if (!m.has(a2)) m.set(a2.toUpperCase(), f);
      }
    }
    cachedByAlpha2 = m;
  }
  return cachedByAlpha2.get(code.toUpperCase()) ?? null;
}

/**
 * Build (and cache) a lookup table: ISO-3 → feature.
 */
export function getCountryByAlpha3(code: string): CountryFeature | null {
  if (!cachedByAlpha3) {
    const fc = loadWorldAtlas();
    const m = new Map<string, CountryFeature>();
    for (const f of fc.features) {
      const a3 = f.properties?.iso_a3;
      if (a3 && a3 !== "-99" && a3.length === 3) {
        if (!m.has(a3)) m.set(a3.toUpperCase(), f);
      }
    }
    cachedByAlpha3 = m;
  }
  return cachedByAlpha3.get(code.toUpperCase()) ?? null;
}

/**
 * Look up a country centroid by ISO-2 code (used by the search bar
 * to fly the camera to a country).
 */
export function getCountryCentroidByCode(
  code: string
): CountryCentroid | null {
  const feature = getCountryByAlpha2(code);
  if (!feature) return null;
  return featureCentroid(feature);
}

// Re-export the raw TopoJSON for advanced consumers (e.g. topojson.mesh
// for borders-only paths). Not used by three-globe.
export { worldAtlasData };

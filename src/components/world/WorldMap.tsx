"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { COUNTRIES, getCountryByCode } from "@/data/countries";
import type { Country } from "@/lib/types";

// ---------- Types ----------

interface WorldMapProps {
  onCountryClick: (countryCode: string) => void;
  onBackgroundClick?: () => void;
  selectedCountry: string | null;
  heatData?: Record<string, number>;
  highlightedCountry?: string | null;
}

// ---------- Projection ----------

// The original 2D SVG used a viewBox of "100 10 610 320" with content roughly
// covering longitudes -180..180 and latitudes ~80..-60. We map the centroid
// (country.coordinates) to a lat/lng so the 3D globe can orient and fly to
// each country. The polygon points from `path` are also projected so that
// we can draw the country shape on the sphere.
const VIEW_CX = 410; // visual longitude center (x in SVG coords)
const VIEW_CY = 165; // visual latitude center (y in SVG coords)
const VIEW_LON_PER_UNIT = 360 / 640; // ~0.5625 deg per unit
const VIEW_LAT_PER_UNIT = 180 / 310; // ~0.58 deg per unit

const GLOBE_RADIUS = 1.5;
const COUNTRY_LIFT = 0.006; // raise country slightly above sphere to avoid z-fight

function svgToLatLng(x: number, y: number): { lat: number; lng: number } {
  const lng = (x - VIEW_CX) * VIEW_LON_PER_UNIT;
  const lat = (VIEW_CY - y) * VIEW_LAT_PER_UNIT;
  return { lat, lng };
}

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Parse a simple SVG path of the form:
//   M x,y L x,y L x,y ... Z
// into an array of [x, y] tuples.
function parseSvgPath(d: string): [number, number][] {
  const out: [number, number][] = [];
  const tokens = d.match(/[MLZ]|-?\d+(?:\.\d+)?/g);
  if (!tokens) return out;
  let i = 0;
  let cmd = "";
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "M" || t === "L" || t === "Z") {
      cmd = t;
      i += 1;
      if (cmd === "Z") continue;
      continue;
    }
    if (cmd === "M" || cmd === "L") {
      const x = parseFloat(tokens[i]);
      const y = parseFloat(tokens[i + 1]);
      if (!Number.isNaN(x) && !Number.isNaN(y)) out.push([x, y]);
      i += 2;
    } else {
      i += 1;
    }
  }
  return out;
}

// Build a BufferGeometry representing the country polygon lifted onto the
// sphere. The polygon is triangulated using the fan-from-centroid technique
// which works well for convex-ish 2D shapes projected onto a sphere.
function buildCountryGeometry(country: Country): THREE.BufferGeometry {
  const points = parseSvgPath(country.path);
  if (points.length < 3) {
    // Fallback to a tiny disc at the country centroid
    const c = svgToLatLng(country.coordinates.x, country.coordinates.y);
    const positions: number[] = [];
    const segs = 16;
    for (let i = 0; i < segs; i++) {
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 1) / segs) * Math.PI * 2;
      const p1 = latLngToVec3(c.lat, c.lng, GLOBE_RADIUS + COUNTRY_LIFT);
      const tangent = latLngToVec3(c.lat, c.lng + 2, GLOBE_RADIUS);
      const bitangent = latLngToVec3(c.lat + 2, c.lng, GLOBE_RADIUS);
      const t = new THREE.Vector3().subVectors(tangent, p1).normalize();
      const b = new THREE.Vector3().subVectors(bitangent, p1).normalize();
      const v1 = p1.clone().add(t.clone().multiplyScalar(Math.cos(a1) * 0.02))
        .add(b.clone().multiplyScalar(Math.sin(a1) * 0.02));
      const v2 = p1.clone().add(t.clone().multiplyScalar(Math.cos(a2) * 0.02))
        .add(b.clone().multiplyScalar(Math.sin(a2) * 0.02));
      positions.push(p1.x, p1.y, p1.z, v2.x, v2.y, v2.z, v1.x, v1.y, v1.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }

  // Compute centroid in lat/lng space for fan triangulation.
  const latlngs = points.map(([x, y]) => svgToLatLng(x, y));
  let cLat = 0;
  let cLng = 0;
  for (const p of latlngs) {
    cLat += p.lat;
    cLng += p.lng;
  }
  cLat /= latlngs.length;
  cLng /= latlngs.length;

  const center = latLngToVec3(cLat, cLng, GLOBE_RADIUS + COUNTRY_LIFT);
  const verts = latlngs.map((p) => latLngToVec3(p.lat, p.lng, GLOBE_RADIUS + COUNTRY_LIFT));

  const positions: number[] = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    positions.push(center.x, center.y, center.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// Country centroid in lat/lng (cached)
function countryCentroidLatLng(country: Country): { lat: number; lng: number } {
  return svgToLatLng(country.coordinates.x, country.coordinates.y);
}

// ---------- Heatmap color resolver (mirrors the original SVG logic) ----------

function resolveCountryColor(country: Country, args: {
  selectedCountry: string | null;
  highlightedCountry: string | null;
  heatData?: Record<string, number>;
  heatMax: number;
}): string {
  const { selectedCountry, highlightedCountry, heatData, heatMax } = args;
  if (selectedCountry === country.code) return "#F97316";
  if (highlightedCountry === country.code) return "#EF4444";
  if (heatData && heatData[country.code] !== undefined && heatMax > 0) {
    const ratio = heatData[country.code] / heatMax;
    if (ratio < 0.1) return "#DCFCE7";
    if (ratio < 0.25) return "#BBF7D0";
    if (ratio < 0.4) return "#FEF08A";
    if (ratio < 0.55) return "#FDE047";
    if (ratio < 0.7) return "#FB923C";
    if (ratio < 0.85) return "#F97316";
    return "#EF4444";
  }
  return country.color;
}

// ---------- Sub-components ----------

interface CountryMeshProps {
  country: Country;
  geometry: THREE.BufferGeometry;
  color: string;
  isSelected: boolean;
  isHighlighted: boolean;
  isHovered: boolean;
  onHover: (code: string | null) => void;
  onClick: (code: string) => void;
}

function CountryMesh({
  country,
  geometry,
  color,
  isSelected,
  isHighlighted,
  isHovered,
  onHover,
  onClick,
}: CountryMeshProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Animate the emissive glow on selection or hover. The geometry already
  // bakes in COUNTRY_LIFT (and the hover/select lift is added below) so the
  // mesh sits at the world origin and the geometry carries the actual shape.
  useFrame(() => {
    if (!matRef.current) return;
    const targetEmissive = isSelected ? 0.55 : isHighlighted ? 0.4 : isHovered ? 0.25 : 0.08;
    matRef.current.emissiveIntensity += (targetEmissive - matRef.current.emissiveIntensity) * 0.18;
  });

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(country.code);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(country.code);
      }}
    >
      <meshStandardMaterial
        ref={matRef}
        color={color}
        roughness={0.65}
        metalness={0.05}
        emissive={isSelected ? "#FB923C" : isHighlighted ? "#EF4444" : color}
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}

// Outline ring around selected country, drawn as a thin sphere of dots.
interface CountryRingProps {
  country: Country;
  isSelected: boolean;
}

function CountryRing({ country, isSelected }: CountryRingProps) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (!ref.current) return;
    const target = isSelected ? 1 : 0;
    const current = ref.current.scale.x;
    const next = current + (target - current) * 0.18;
    ref.current.scale.setScalar(next);
  });

  const { lat, lng } = countryCentroidLatLng(country);
  const center = latLngToVec3(lat, lng, GLOBE_RADIUS + 0.045);

  // Build a ring perpendicular to the radial direction.
  const normal = center.clone().normalize();
  const tangent = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
  if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
  const bitangent = normal.clone().cross(tangent).normalize();

  const radius = 0.08;
  const segments = 64;
  const positions: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const p = center
      .clone()
      .add(tangent.clone().multiplyScalar(Math.cos(a) * radius))
      .add(bitangent.clone().multiplyScalar(Math.sin(a) * radius));
    positions.push(p.x, p.y, p.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  return (
    <group ref={ref} scale={0}>
      <line>
        <primitive attach="geometry" object={geo} />
        <lineBasicMaterial color="#FB923C" transparent opacity={0.9} />
      </line>
    </group>
  );
}

// Auto-rotate group, with idle detection handled at the parent level.
function AutoRotate({
  groupRef,
  enabled,
  speed = 0.06, // radians per second
}: {
  groupRef: React.RefObject<THREE.Group>;
  enabled: boolean;
  speed?: number;
}) {
  useFrame((_state, delta) => {
    if (!enabled) return;
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * speed;
  });
  return null;
}

// Smooth camera fly-to. Each call to `flyTo(lat, lng, distance)` animates the
// OrbitControls target and the camera position towards a view of the given
// lat/lng. The animation runs once per `target` change.
function CameraRig({
  target,
  distance,
  controlsRef,
}: {
  target: { lat: number; lng: number } | null;
  distance: number;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const anim = useRef<{
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTgt: THREE.Vector3;
    toTgt: THREE.Vector3;
    t: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    if (!target) return;
    const desiredTgt = latLngToVec3(target.lat, target.lng, 0);
    const dir = desiredTgt.clone().normalize();
    const desiredPos = dir.clone().multiplyScalar(distance);

    anim.current = {
      fromPos: camera.position.clone(),
      toPos: desiredPos,
      fromTgt: controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0),
      toTgt: desiredTgt,
      t: 0,
      active: true,
    };
  }, [target?.lat, target?.lng, distance, camera, controlsRef]);

  useFrame((_state, delta) => {
    const a = anim.current;
    if (!a || !a.active) return;
    a.t = Math.min(1, a.t + delta * 0.9); // ~1.1s ease
    const ease = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
    camera.position.lerpVectors(a.fromPos, a.toPos, ease);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(a.fromTgt, a.toTgt, ease);
      controlsRef.current.update();
    }
    if (a.t >= 1) a.active = false;
  });

  return null;
}

// Internal globe scene
function GlobeScene({
  selectedCountry,
  highlightedCountry,
  heatData,
  heatMax,
  hoveredCode,
  setHoveredCode,
  onCountryClick,
  onBackgroundClick,
  flyTo,
  autoRotate,
}: {
  selectedCountry: string | null;
  highlightedCountry: string | null;
  heatData?: Record<string, number>;
  heatMax: number;
  hoveredCode: string | null;
  setHoveredCode: (c: string | null) => void;
  onCountryClick: (code: string) => void;
  onBackgroundClick: () => void;
  flyTo: { lat: number; lng: number } | null;
  autoRotate: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const controlsRef = useRef<any>(null);

  // Pre-compute country geometries once.
  const countryData = useMemo(() => {
    return COUNTRIES.map((c) => ({
      country: c,
      geometry: buildCountryGeometry(c),
    }));
  }, []);

  // Default camera looks at Africa/Europe, slightly tilted.
  useEffect(() => {
    // No-op; the Canvas initial camera position handles default view.
  }, []);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 5]} intensity={1.05} color="#ffffff" />
      <directionalLight position={[-5, -2, -3]} intensity={0.35} color="#7DD3FC" />

      <group ref={groupRef}>
        {/* Ocean sphere */}
        <mesh
          onClick={(e) => {
            // Only fire when clicking the ocean directly, not a country
            if ((e.object as THREE.Mesh).userData?.isOcean) onBackgroundClick();
          }}
          userData={{ isOcean: true }}
        >
          <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
          <meshStandardMaterial
            color="#0B1E3A"
            roughness={0.9}
            metalness={0.0}
            emissive="#0A1A36"
            emissiveIntensity={0.35}
          />
        </mesh>

        {/* Subtle atmosphere shell */}
        <mesh scale={1.04}>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshBasicMaterial
            color="#3B82F6"
            transparent
            opacity={0.06}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* Country meshes */}
        {countryData.map(({ country, geometry }) => {
          const color = resolveCountryColor(country, {
            selectedCountry,
            highlightedCountry,
            heatData,
            heatMax,
          });
          const isSelected = selectedCountry === country.code;
          const isHighlighted = highlightedCountry === country.code;
          const isHovered = hoveredCode === country.code;
          return (
            <CountryMesh
              key={country.code}
              country={country}
              geometry={geometry}
              color={color}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              isHovered={isHovered}
              onHover={setHoveredCode}
              onClick={onCountryClick}
            />
          );
        })}

        {/* Outline ring for the selected country */}
        {selectedCountry && (() => {
          const c = getCountryByCode(selectedCountry);
          if (!c) return null;
          return <CountryRing country={c} isSelected />;
        })()}

        {/* Latitude/longitude grid lines (very subtle) */}
        <GridLines />

        <AutoRotate groupRef={groupRef} enabled={autoRotate} speed={0.05} />
      </group>

      <CameraRig target={flyTo} distance={GLOBE_RADIUS * 3.2} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        minDistance={GLOBE_RADIUS * 2.6}
        maxDistance={GLOBE_RADIUS * 8}
        onStart={() => onBackgroundClick?.()} // any orbit gesture also deselects on touch if we want; left for now
      />
    </>
  );
}

function GridLines() {
  const positions: number[] = [];
  const r = GLOBE_RADIUS + 0.002;
  // Latitudes
  for (const lat of [-60, -30, 0, 30, 60]) {
    const segs = 96;
    for (let i = 0; i < segs; i++) {
      const a1 = (i / segs) * 360 - 180;
      const a2 = ((i + 1) / segs) * 360 - 180;
      const p1 = latLngToVec3(lat, a1, r);
      const p2 = latLngToVec3(lat, a2, r);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }
  // Longitudes
  for (const lng of [-120, -60, 0, 60, 120]) {
    const segs = 64;
    for (let i = 0; i < segs; i++) {
      const la1 = (i / segs) * 180 - 90;
      const la2 = ((i + 1) / segs) * 180 - 90;
      const p1 = latLngToVec3(la1, lng, r);
      const p2 = latLngToVec3(la2, lng, r);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  return (
    <lineSegments>
      <primitive attach="geometry" object={geo} />
      <lineBasicMaterial color="#FFFFFF" transparent opacity={0.08} />
    </lineSegments>
  );
}

// ---------- Idle detection ----------

function useIdle(resumeAfterMs = 4000) {
  const [idle, setIdle] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      setIdle(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), resumeAfterMs);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "wheel",
      "touchstart",
      "touchmove",
      "keydown",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [resumeAfterMs]);

  return idle;
}

// ---------- Public component ----------

export function WorldMap({
  onCountryClick,
  onBackgroundClick,
  selectedCountry,
  heatData,
  highlightedCountry,
}: WorldMapProps) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const idle = useIdle(4500);

  // When `highlightedCountry` changes (from the search box), fly to it.
  useEffect(() => {
    if (!highlightedCountry) {
      setFlyTo(null);
      return;
    }
    const c = getCountryByCode(highlightedCountry);
    if (!c) return;
    const { lat, lng } = countryCentroidLatLng(c);
    setFlyTo({ lat, lng });
  }, [highlightedCountry]);

  const heatMax = useMemo(() => {
    if (!heatData) return 1;
    return Math.max(...Object.values(heatData), 1);
  }, [heatData]);

  // Default camera: tilted view of Africa/Europe, far enough that the entire
  // globe (including its atmosphere shell) is always fully visible regardless
  // of aspect ratio. At FOV 45 with distance ~5.1, the visible vertical
  // half-extent is tan(22.5)*5.1 ≈ 2.11, comfortably larger than the
  // atmosphere radius of 1.56.
  const initialCamera: [number, number, number] = [
    -1.5, // x
    2.0,  // y
    4.5,  // z
  ];

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: initialCamera, fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <GlobeScene
            selectedCountry={selectedCountry}
            highlightedCountry={highlightedCountry ?? null}
            heatData={heatData}
            heatMax={heatMax}
            hoveredCode={hoveredCode}
            setHoveredCode={setHoveredCode}
            onCountryClick={onCountryClick}
            onBackgroundClick={() => {
              // Treat orbit-on-ocean as a soft deselect signal
              onBackgroundClick?.();
            }}
            flyTo={flyTo}
            autoRotate={idle && !hoveredCode && !selectedCountry}
          />
        </Suspense>
      </Canvas>

      {/* Country label tooltip rendered as HTML overlay (in world coordinates → projected to screen) */}
      <HoverLabel code={hoveredCode} />
    </div>
  );
}

function HoverLabel({ code }: { code: string | null }) {
  if (!code) return null;
  const c = getCountryByCode(code);
  if (!c) return null;
  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-slate-900/85 border border-white/10 shadow-lg backdrop-blur-sm"
      style={{ top: "12%" }}
    >
      {c.flag} {c.name}
    </div>
  );
}

export default WorldMap;

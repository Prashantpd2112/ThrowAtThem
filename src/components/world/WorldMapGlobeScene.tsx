"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { getCountryByCode } from "@/data/countries";
import type { Country } from "@/lib/types";
import { featureCentroid } from "@/data/worldAtlas";
import {
  GLOBE_RADIUS,
  buildGlobePolygons,
  countryCentroidLatLng,
  latLngToVec3,
  loadGlobeAtlas,
  resolveCountryColor,
} from "./worldMapUtils";

export interface WorldMapGlobeSceneProps {
  selectedCountry: string | null;
  highlightedCountry: string | null;
  heatData?: Record<string, number>;
  heatMax: number;
  hoveredCode: string | null;
  setHoveredCode: (code: string | null) => void;
  onCountryClick: (code: string) => void;
  onBackgroundClick?: () => void;
  flyTo: { lat: number; lng: number } | null;
  autoRotate: boolean;
}

function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

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
    const desiredTarget = latLngToVec3(target.lat, target.lng, 0);
    const direction = desiredTarget.clone().normalize();
    const desiredPosition = direction.clone().multiplyScalar(distance);
    anim.current = {
      fromPos: camera.position.clone(),
      toPos: desiredPosition,
      fromTgt: controlsRef.current
        ? controlsRef.current.target.clone()
        : new THREE.Vector3(0, 0, 0),
      toTgt: desiredTarget,
      t: 0,
      active: true,
    };
  }, [target?.lat, target?.lng, distance, camera, controlsRef]);

  useFrame((_state, delta) => {
    const animation = anim.current;
    if (!animation || !animation.active) return;
    animation.t = Math.min(1, animation.t + delta * 0.9);
    const eased =
      animation.t < 0.5
        ? 2 * animation.t * animation.t
        : 1 - Math.pow(-2 * animation.t + 2, 2) / 2;
    camera.position.lerpVectors(animation.fromPos, animation.toPos, eased);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(animation.fromTgt, animation.toTgt, eased);
      controlsRef.current.update();
    }
    if (animation.t >= 1) animation.active = false;
  });

  return null;
}

function AutoRotate({
  groupRef,
  enabled,
  speed = 0.06,
}: {
  groupRef: React.RefObject<THREE.Group>;
  enabled: boolean;
  speed?: number;
}) {
  useFrame((_state, delta) => {
    if (!enabled || !groupRef.current) return;
    groupRef.current.rotation.y += delta * speed;
  });
  return null;
}

function AtmosphereShells() {
  return (
    <>
      <mesh scale={1.06}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#3B82F6"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.015}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshBasicMaterial
          color="#60A5FA"
          transparent
          opacity={0.08}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function GridLines() {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const radius = GLOBE_RADIUS + 0.5;

    for (const lat of [-60, -30, 0, 30, 60]) {
      const segments = 96;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * 360 - 180;
        const a2 = ((i + 1) / segments) * 360 - 180;
        const p1 = latLngToVec3(lat, a1, radius);
        const p2 = latLngToVec3(lat, a2, radius);
        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    }

    for (const lng of [-120, -60, 0, 60, 120]) {
      const segments = 64;
      for (let i = 0; i < segments; i++) {
        const la1 = (i / segments) * 180 - 90;
        const la2 = ((i + 1) / segments) * 180 - 90;
        const p1 = latLngToVec3(la1, lng, radius);
        const p2 = latLngToVec3(la2, lng, radius);
        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments>
      <primitive attach="geometry" object={geometry} />
      <lineBasicMaterial color="#FFFFFF" transparent opacity={0.06} />
    </lineSegments>
  );
}

function CountryRing({ country, isSelected }: { country: Country; isSelected: boolean }) {
  const ref = useRef<THREE.Group>(null!);

  const geometry = useMemo(() => {
    const { lat, lng } = countryCentroidLatLng(country);
    const center = latLngToVec3(lat, lng, GLOBE_RADIUS + 2);
    const normal = center.clone().normalize();
    const tangent = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
    if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
    const bitangent = normal.clone().cross(tangent).normalize();

    const radius = 6;
    const segments = 64;
    const positions: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const point = center
        .clone()
        .add(tangent.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(bitangent.clone().multiplyScalar(Math.sin(angle) * radius));
      positions.push(point.x, point.y, point.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [country]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    if (!ref.current) return;
    const target = isSelected ? 1 : 0;
    const current = ref.current.scale.x;
    ref.current.scale.setScalar(current + (target - current) * 0.18);
  });

  return (
    <group ref={ref} scale={0}>
      <line>
        <primitive attach="geometry" object={geometry} />
        <lineBasicMaterial color="#FB923C" transparent opacity={0.9} />
      </line>
    </group>
  );
}

function Globe({
  polygons,
  labelsData,
  labelsVisible,
  selectedCountry,
  highlightedCountry,
  hoveredCode,
  setHoveredCode,
  onCountryClick,
  onBackgroundClick,
  groupRef,
}: {
  polygons: ReturnType<typeof buildGlobePolygons>;
  labelsData: Array<{ text: string; lat: number; lng: number; code: string }>;
  labelsVisible: boolean;
  selectedCountry: string | null;
  highlightedCountry: string | null;
  hoveredCode: string | null;
  setHoveredCode: (code: string | null) => void;
  onCountryClick: (code: string) => void;
  onBackgroundClick?: () => void;
  groupRef: React.RefObject<THREE.Group>;
}) {
  const globeRef = useRef<any>(null);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointerNdc = useRef(new THREE.Vector2());
  const resolveIntersectionCode = useCallback((intersection: THREE.Intersection) => {
    let object: THREE.Object3D | null = intersection.object;
    while (object) {
      const globeObjType = (object as any).__globeObjType as string | undefined;
      if (globeObjType === "label" || globeObjType === "html") {
        object = object.parent;
        continue;
      }

      const data = object as THREE.Object3D & { __data?: { properties?: { iso_a2?: string } } };
      const code = data.__data?.properties?.iso_a2;
      if (code) return code.toUpperCase();
      object = object.parent;
    }
    return null;
  }, []);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const globe = globeRef.current;
      if (!globe) return null;

      const rect = gl.domElement.getBoundingClientRect();
      pointerNdc.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc.current, camera);
      const hits = raycaster.intersectObjects(globe.children, true);
      const hit = hits.find((intersection) => resolveIntersectionCode(intersection));
      const code = hit ? resolveIntersectionCode(hit) : null;

      if (code) {
        setHoveredCode(code);
        document.body.style.cursor = "pointer";
      } else {
        setHoveredCode(null);
        document.body.style.cursor = "auto";
      }

      return code;
    },
    [camera, gl, raycaster, resolveIntersectionCode, setHoveredCode]
  );

  useEffect(() => {
    const globe: any = new ThreeGlobe({ animateIn: false })
      .showGlobe(true)
      .showAtmosphere(false)
      .showGraticules(false)
      .polygonsData(
        polygons.features as unknown as GeoJSON.Feature<
          GeoJSON.Geometry,
          Record<string, unknown>
        >[]
      )
      .polygonAltitude((d: object) => {
        const code = (d as { properties?: { iso_a2?: string } }).properties?.iso_a2?.toUpperCase();
        if (code && code === selectedCountry) return 0.025;
        if (code && code === highlightedCountry) return 0.02;
        if (code && code === hoveredCode) return 0.015;
        return 0.01;
      })
      .polygonCapColor((d: object) =>
        (d as { properties?: { iso_a2?: string } }).properties?.iso_a2?.toUpperCase() === selectedCountry
          ? "#F97316"
          : (d as { properties?: { iso_a2?: string } }).properties?.iso_a2?.toUpperCase() === highlightedCountry
            ? "#EF4444"
            : (d as { properties?: { iso_a2?: string } }).properties?.iso_a2?.toUpperCase() === hoveredCode
              ? "#FFFFFF"
              : "#22C55E"
      )
      .polygonSideColor(() => "#ffffff")
      .polygonStrokeColor((d: object) => {
        const code = (d as { properties?: { iso_a2?: string } }).properties?.iso_a2;
        const normalized = (code || "").toUpperCase();
        if (normalized === selectedCountry) return "#FFFFFF";
        if (normalized === highlightedCountry) return "#FCA5A5";
        if (normalized === hoveredCode) return "#FFFFFF";
        return "#FFFFFF";
      })
      .labelsData(labelsVisible ? labelsData : [])
      .labelLat((d: object) => (d as { lat: number }).lat)
      .labelLng((d: object) => (d as { lng: number }).lng)
      .labelText((d: object) => (d as { text: string }).text)
      .labelColor(() => "#FFFFFF")
      .labelSize(() => 0.45)
      .labelAltitude(() => 0.02)
      .labelResolution(2)
      .labelIncludeDot(false)
      .labelsData(labelsVisible ? labelsData : []);

    globe.polygonCapMaterial(
      () =>
        new THREE.MeshStandardMaterial({
          color: "#22C55E",
          transparent: false,
          opacity: 1,
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        })
    );

    const sphere = globe.getObjectByName("globe-sphere") as THREE.Mesh | undefined;
    if (sphere && sphere.material instanceof THREE.MeshStandardMaterial) {
      sphere.material.color = new THREE.Color("#031025");
      sphere.material.roughness = 0.85;
      sphere.material.metalness = 0.05;
      sphere.material.emissive = new THREE.Color("#0a1a36");
      sphere.material.emissiveIntensity = 0.45;
    }

    globe.scale.setScalar(GLOBE_RADIUS / 100);
    if (groupRef.current) {
      groupRef.current.add(globe);
    }
    globeRef.current = globe;

    console.log("[WorldMap] globe initialized", {
      polygonCount: polygons.features.length,
      firstPolygon: polygons.features[0],
      firstGeometryType: polygons.features[0]?.geometry?.type,
    });

    const domElement = gl.domElement;
    const handlePointerMove = (event: PointerEvent) => {
      updateFromPointer(event.clientX, event.clientY);
    };
    const handlePointerLeave = () => {
      setHoveredCode(null);
      document.body.style.cursor = "auto";
    };
    const handleClick = (event: PointerEvent) => {
      const code = updateFromPointer(event.clientX, event.clientY);
      if (code) onCountryClick(code);
      else onBackgroundClick?.();
    };

    domElement.addEventListener("pointermove", handlePointerMove);
    domElement.addEventListener("pointerleave", handlePointerLeave);
    domElement.addEventListener("click", handleClick);

    return () => {
      domElement.removeEventListener("pointermove", handlePointerMove);
      domElement.removeEventListener("pointerleave", handlePointerLeave);
      domElement.removeEventListener("click", handleClick);
      if (groupRef.current) {
        groupRef.current.remove(globe);
      }
      disposeObject3D(globe);
      globeRef.current = null;
      document.body.style.cursor = "auto";
    };
  }, [groupRef, gl, camera, onBackgroundClick, onCountryClick, updateFromPointer, setHoveredCode]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.polygonsData(
      polygons.features as unknown as GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>[]
    );
  }, [polygons]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.polygonCapColor((d: object) =>
      resolveCountryColor(d as never, {
        selectedCountry,
        highlightedCountry,
        hoveredCode,
      })
    );
    globe.polygonStrokeColor((d: object) => {
      const code = (d as { properties?: { iso_a2?: string } }).properties?.iso_a2;
      const normalized = (code || "").toUpperCase();
      if (normalized === selectedCountry) return "#FFFFFF";
      if (normalized === highlightedCountry) return "#FCA5A5";
      if (normalized === hoveredCode) return "#FFFFFF";
      return "#FFFFFF";
    });
    globe.polygonAltitude((d: object) => {
      const code = (d as { properties?: { iso_a2?: string } }).properties?.iso_a2;
      if (code && code.toUpperCase() === selectedCountry) return 0.025;
      if (code && code.toUpperCase() === highlightedCountry) return 0.02;
      if (code && code.toUpperCase() === hoveredCode) return 0.015;
      return 0.01;
    });
  }, [selectedCountry, highlightedCountry, hoveredCode]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.labelsData(labelsVisible ? labelsData : []);
  }, [labelsData, labelsVisible]);

  return null;
}

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
}: WorldMapGlobeSceneProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const controlsRef = useRef<any>(null);
  const atlas = useMemo(() => loadGlobeAtlas(), []);
  const polygons = useMemo(() => buildGlobePolygons(atlas, heatData, heatMax), [atlas, heatData, heatMax]);
  const labelsData = useMemo(
    () =>
      atlas.features
        .filter((feature) => feature.properties?.iso_a2 && feature.properties.name)
        .map((feature) => {
          const centroid = featureCentroid(feature);
          if (!centroid) return null;
          return {
            code: (feature.properties?.iso_a2 || "").toUpperCase(),
            text: String(feature.properties?.name || ""),
            lat: centroid.lat,
            lng: centroid.lng,
          };
        })
        .filter((item): item is { code: string; text: string; lat: number; lng: number } => Boolean(item)),
    [atlas]
  );
  const [labelsVisible, setLabelsVisible] = useState(false);

  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    const distance = controls ? controls.target.distanceTo(camera.position) : camera.position.length();
    const nextVisible = distance <= GLOBE_RADIUS * 2.7;
    setLabelsVisible((current: boolean) => (current === nextVisible ? current : nextVisible));
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[200, 120, 200]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-200, -80, -150]} intensity={0.45} color="#7DD3FC" />
      <directionalLight position={[0, -250, 0]} intensity={0.25} color="#3B82F6" />

      <group ref={groupRef}>
        <Globe
          polygons={polygons}
          labelsData={labelsData}
          labelsVisible={labelsVisible}
          selectedCountry={selectedCountry}
          highlightedCountry={highlightedCountry}
          hoveredCode={hoveredCode}
          setHoveredCode={setHoveredCode}
          onCountryClick={onCountryClick}
          onBackgroundClick={onBackgroundClick}
          groupRef={groupRef}
        />
        <AtmosphereShells />
        <GridLines />
        {selectedCountry && (() => {
          const country = getCountryByCode(selectedCountry);
          if (!country) return null;
          return <CountryRing country={country} isSelected />;
        })()}
        <AutoRotate groupRef={groupRef} enabled={autoRotate} speed={0.05} />
      </group>

      <CameraRig target={flyTo} distance={GLOBE_RADIUS * 3.2} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.6}
        zoomSpeed={1.0}
        minDistance={GLOBE_RADIUS * 1.01}
        maxDistance={GLOBE_RADIUS * 20}
        onStart={() => onBackgroundClick?.()}
      />
    </>
  );
}

export default function WorldMapGlobeScene(props: WorldMapGlobeSceneProps) {
  return (
    <Canvas
      camera={{ position: [-150, 200, 550], fov: 50, near: 0.1, far: 5000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <GlobeScene {...props} />
    </Canvas>
  );
}
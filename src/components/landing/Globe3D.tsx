"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function AnimatedGlobe() {
  const GLOBE_RADIUS = 2.2;
  const CONTINENT_SCALE = 0.22;
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = GLOBE_RADIUS + 0.2 + Math.random() * 0.3;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  const toXYZ = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;

  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
};
  

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#87CEEB" />

      <group ref={groupRef}>
        {/* Glow ring */}
        <mesh rotation-x={Math.PI / 2} position={[0, -0.2, 0]}>
          <ringGeometry
            args={[GLOBE_RADIUS + 0.2, GLOBE_RADIUS + 0.6, 64]}
          />
          <meshBasicMaterial
            color="#87CEEB"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Main Globe */}
      <Sphere
        ref={meshRef}
        args={[GLOBE_RADIUS, 74, 74]}
        position={[0, 0, 0]}
      >
        <MeshDistortMaterial
          color="#4A90D9"
          attach="material"
          distort={0.25}
          speed={1.5}
          roughness={0.3}
          metalness={0.2}
          emissive="#4A90D9"
          emissiveIntensity={0.1}
        />
      </Sphere>

      {/* Continent patches */}
      {[
        { position: [-0.65,  0.55,  2.02], color: "#4CAF50", scale: 0.35 }, // North America
        { position: [ 0.70,  0.40,  2.02], color: "#FF9800", scale: 0.28 }, // Europe
        { position: [-0.30, -0.65,  2.08], color: "#66BB6A", scale: 0.42 }, // South America
        { position: [ 1.05, -0.20,  1.90], color: "#FFD700", scale: 0.26 }, // Africa
        { position: [-1.05,  0.45,  1.82], color: "#FF6B6B", scale: 0.30 }, // Greenland
        { position: [ 0.45, -0.90,  1.95], color: "#FFB74D", scale: 0.20 }, // Australia
        { position: [ 1.45,  0.55,  1.55], color: "#81C784", scale: 0.24 }, // Asia edge
        { position: [-0.15,  1.00,  1.90], color: "#E57373", scale: 0.18 }, // Arctic
        { position: [-1.35, -0.25,  1.60], color: "#FF8A65", scale: 0.26 }, // Pacific island
      ].map((patch, i) => (
        <mesh key={i} position={patch.position as [number, number, number]}>
          <sphereGeometry args={[patch.scale, 16, 16]} />
          <meshStandardMaterial
            color={patch.color}
            transparent
            opacity={0.7}
            roughness={0.6}
          />
        </mesh>
      ))}

      {/* Floating particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#87CEEB"
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate={false}
      />
    </>
  );
}

export function Globe3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        resize={{ offsetSize: true }}
        onCreated={({ gl }) => {
          // Handle WebGL context loss — don't crash, silently recover
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            console.warn("[Globe3D] WebGL context lost — rendering paused");
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            console.info("[Globe3D] WebGL context restored");
          });
        }}
      >
        <AnimatedGlobe />
      </Canvas>
    </div>
  );
}

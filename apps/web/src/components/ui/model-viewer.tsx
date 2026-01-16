"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  Environment,
  useGLTF,
  PresentationControls,
} from "@react-three/drei";
import * as THREE from "three";

// Animated floating shapes when no model is provided
function FloatingShapes() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={group}>
      {/* Central cube */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial
            color="#6366f1"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </Float>

      {/* Orbiting spheres */}
      <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[2.5, 1, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color="#ec4899"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </Float>

      <Float speed={2.5} rotationIntensity={0.5} floatIntensity={1.5}>
        <mesh position={[-2, -0.5, 1]}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial
            color="#22d3ee"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </Float>

      {/* Torus */}
      <Float speed={1.5} rotationIntensity={2} floatIntensity={1}>
        <mesh position={[-1.5, 1.5, -1]} rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[0.6, 0.2, 16, 32]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      </Float>

      {/* Small cubes */}
      <Float speed={4} rotationIntensity={1} floatIntensity={2}>
        <mesh position={[1.5, -1.5, 0.5]} rotation={[0.5, 0.5, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial
            color="#10b981"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </Float>

      <Float speed={3.5} rotationIntensity={1.5} floatIntensity={1}>
        <mesh position={[0, 2, -0.5]} rotation={[0.3, 0.7, 0]}>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial
            color="#f43f5e"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      </Float>
    </group>
  );
}

// 3D Model component (for when a GLB file is provided)
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
}

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
}

export function ModelViewer({
  modelUrl,
  className = "",
}: ModelViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 100 } }}
      >
        <Suspense fallback={null}>
          {/* Lighting - enhanced for visibility on light background */}
          <ambientLight intensity={0.8} />
          <spotLight
            position={[10, 10, 10]}
            angle={0.15}
            penumbra={1}
            intensity={1.5}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} />

          {/* Environment for reflections - background disabled */}
          <Environment preset="city" background={false} />

          {/* Interactive controls */}
          <PresentationControls
            global
            rotation={[0.1, 0.1, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
          >
            {modelUrl ? <Model url={modelUrl} /> : <FloatingShapes />}
          </PresentationControls>

          {/* Orbit controls - disabled autoRotate to prevent shift with CSS transforms */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

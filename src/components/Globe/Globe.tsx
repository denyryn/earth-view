import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildGlobalGibsTextureUrl } from "@/providers/GibsProvider";
import { useAppStore } from "@/store/useAppStore";
import { Earth } from "./Earth";
import { Starfield } from "./Starfield";

function AdaptiveControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    const distance = camera.position.distanceTo(controls.target);
    const zoomProgress = Math.min(1, Math.max(0, (distance - 1.06) / (6 - 1.06)));

    controls.rotateSpeed = 0.04 + zoomProgress * 0.32;
    controls.panSpeed = 0.04 + zoomProgress * 0.2;
    controls.zoomSpeed = 0.24 + zoomProgress * 0.26;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableDamping
      dampingFactor={0.08}
      minDistance={1.06}
      maxDistance={6}
      rotateSpeed={0.24}
      zoomSpeed={0.38}
      panSpeed={0.14}
    />
  );
}

export function Globe() {
  const date = useAppStore((state) => state.date);
  const selectPoint = useAppStore((state) => state.selectPoint);
  const textureUrl = buildGlobalGibsTextureUrl(date);

  return (
    <div className="absolute inset-0" data-testid="globe-stage">
      <Canvas
        camera={{ position: [0, 0, 3.35], fov: 42, near: 0.01, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#05070d"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 2.8, 2.2]} intensity={1.8} />
        <directionalLight position={[-3, -1.8, -3]} intensity={0.2} color="#ffffff" />
        <Starfield />
        <Suspense fallback={null}>
          <Earth textureUrl={textureUrl} onSelect={selectPoint} />
        </Suspense>
        <AdaptiveControls />
      </Canvas>
    </div>
  );
}

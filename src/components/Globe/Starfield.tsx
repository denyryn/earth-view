import { useMemo } from "react";
import { Points } from "@react-three/drei";
import { AdditiveBlending } from "three";

export function Starfield() {
  const positions = useMemo(() => {
    const points = new Float32Array(6500 * 3);

    for (let index = 0; index < points.length; index += 3) {
      const radius = 8 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      points[index] = radius * Math.sin(phi) * Math.cos(theta);
      points[index + 1] = radius * Math.cos(phi);
      points[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    return points;
  }, []);

  return (
    <Points positions={positions} stride={3} frustumCulled={false}>
      <pointsMaterial
        transparent
        color="#d7f5ff"
        size={0.012}
        sizeAttenuation
        opacity={0.62}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </Points>
  );
}

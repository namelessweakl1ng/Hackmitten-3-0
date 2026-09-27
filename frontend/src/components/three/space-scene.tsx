"use client";

import * as THREE from "three";
import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Stars } from "@react-three/drei";

// Detect mobile / low-power devices for graceful fallback
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () =>
      setIsMobile(
        window.matchMedia("(max-width: 768px)").matches ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLACK HOLE — dark sphere with accretion disk and gravitational lensing glow
// ─────────────────────────────────────────────────────────────────────────────

function BlackHole({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const diskRef = useRef<THREE.Mesh>(null);
  const horizonRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const p = scrollProgress.current;
    if (groupRef.current) {
      // Camera approaches the black hole as user scrolls — scale grows, but
      // plateaus at ~2.0 so it stops growing infinitely.
      const scale = Math.min(2.0, 1 + p * 1.2);
      groupRef.current.scale.setScalar(scale);
      // Subtle rotation
      groupRef.current.rotation.z += delta * 0.02;
    }
    if (diskRef.current) {
      diskRef.current.rotation.z -= delta * (0.25 + p * 0.6);
      // Tilt towards camera as we approach
      diskRef.current.rotation.x = Math.PI / 2.4 + p * 0.2;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + p * 0.55;
    }
    if (horizonRef.current) {
      const mat = horizonRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  // Accretion disk geometry — torus with custom shader-like material via vertex colors
  const diskGeo = useMemo(() => {
    const geo = new THREE.RingGeometry(1.2, 3.6, 96, 1);
    return geo;
  }, []);

  const diskMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uRed: { value: new THREE.Color("#D83A43") },
        uDeepRed: { value: new THREE.Color("#8B1E24") },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vDist;
        void main() {
          vUv = uv;
          vDist = length(position.xy);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying float vDist;
        uniform float uTime;
        uniform vec3 uRed;
        uniform vec3 uDeepRed;
        // simple hash noise
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        void main() {
          // Normalized radius (0 inner, 1 outer)
          float r = (vDist - 1.2) / (3.6 - 1.2);
          // Angular streaks
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float streaks = noise(vec2(angle * 6.0 + uTime * 0.4, r * 4.0));
          streaks = pow(streaks, 1.5);
          // Color: hot red near center, deep red outer
          vec3 col = mix(uRed, uDeepRed, r);
          col = mix(col, vec3(1.0), pow(1.0 - r, 6.0) * 0.5); // bright inner edge
          // Falloff
          float alpha = (1.0 - r) * 0.95 * streaks;
          alpha *= smoothstep(0.0, 0.15, r) * smoothstep(1.0, 0.85, r);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    return mat;
  }, []);

  useFrame((state) => {
    (diskMat.uniforms.uTime.value as number) = state.clock.elapsedTime;
  });

  return (
    <group ref={groupRef}>
      {/* Event horizon — pure black sphere */}
      <mesh ref={horizonRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.95} />
      </mesh>
      {/* Photon ring glow */}
      <mesh ref={glowRef} scale={1.08}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#D83A43" transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>
      {/* Accretion disk */}
      <mesh ref={diskRef} geometry={diskGeo} material={diskMat} />
      {/* Faint outer halo */}
      <mesh scale={1.6}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#8B1E24" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE FIELD — drifting cosmic dust + stars
// ─────────────────────────────────────────────────────────────────────────────

function ParticleField({
  scrollProgress,
  count,
  radius,
  speed,
}: {
  scrollProgress: React.MutableRefObject<number>;
  count: number;
  radius: number;
  speed: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // distribute in a sphere shell
      const r = radius * (0.4 + Math.random() * 0.6); // eslint-disable-line react-hooks/purity
      const theta = Math.random() * Math.PI * 2; // eslint-disable-line react-hooks/purity
      const phi = Math.acos(2 * Math.random() - 1); // eslint-disable-line react-hooks/purity
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const p = scrollProgress.current;
    ref.current.rotation.y += delta * (speed * 0.1 + p * speed * 0.3);
    ref.current.rotation.x += delta * (speed * 0.05);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        sizeAttenuation
        color="#F2F2F2"
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA RIG — driven by scroll progress
// ─────────────────────────────────────────────────────────────────────────────

function CameraRig({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.5, 8));
  useFrame(() => {
    const p = scrollProgress.current;
    // Camera starts at z=8 and approaches z=3 (closer to black hole at origin).
    // Clamp the z position so the camera stops approaching after a certain
    // point — preventing an endless "fly into the black hole" feel.
    // z=8 → z=3 over the first 60% of scroll, then holds at z=3.
    const clampedZ = Math.max(3, 8 - p * 5);
    // Y drift: also clamped so the camera doesn't drift infinitely.
    const clampedY = Math.min(0.5, 0.5 - p * 0.4) + 0; // -0.4*p clamped at p=1 → 0.1
    target.current.set(0, clampedY, clampedZ);
    camera.position.lerp(target.current, 0.06);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export default function SpaceScene({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();
  // If reduced motion or no WebGL — render a static gradient fallback instead
  const [webglOk, setWebglOk] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // One-time WebGL capability check (deferred to avoid synchronous setState in effect body)
    const id = window.setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (!gl) setWebglOk(false);
      } catch {
        setWebglOk(false);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (reduced || !webglOk) {
    return (
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, #151515 0%, #080808 45%, #030303 100%)",
        }}
      />
    );
  }

  const particleCount = isMobile ? 600 : 2500;
  const starCount = isMobile ? 1500 : 5000;
  const enablePostFX = !isMobile;

  return (
    <Canvas
      dpr={isMobile ? 1 : [1, 2]}
      gl={{ antialias: !isMobile, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.5, 8], fov: 55, near: 0.1, far: 100 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <color attach="background" args={["#030303"]} />
      <fog attach="fog" args={["#030303", 6, 18]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#D83A43" />
      <pointLight position={[5, 5, 5]} intensity={0.4} color="#ffffff" />

      <CameraRig scrollProgress={scrollProgress} />

      <Stars radius={50} depth={50} count={starCount} factor={4} saturation={0} fade speed={0.5} />

      <ParticleField scrollProgress={scrollProgress} count={particleCount} radius={12} speed={0.6} />
      <ParticleField scrollProgress={scrollProgress} count={Math.floor(particleCount / 3)} radius={6} speed={1.2} />

      <BlackHole scrollProgress={scrollProgress} />

      {enablePostFX && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={0.7} mipmapBlur />
          <Vignette eskil={false} offset={0.3} darkness={0.85} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

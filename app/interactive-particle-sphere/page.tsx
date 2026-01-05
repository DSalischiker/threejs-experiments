'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

function ParticleSphere() {
  const pointsRef = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouseWorld = useRef(new THREE.Vector3());
  const [explosionCenter, setExplosionCenter] = useState<THREE.Vector3 | null>(null);
  const [explosionForce, setExplosionForce] = useState(0);
  const mouseDownPos = useRef(new THREE.Vector2());
  const mouseUpPos = useRef(new THREE.Vector2());

  const { originalPositions, particles } = useMemo(() => {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const original = new Float32Array(count * 3);
    const radius = 1;

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      original[i * 3] = x;
      original[i * 3 + 1] = y;
      original[i * 3 + 2] = z;
    }

    return { originalPositions: original, particles: positions };
  }, []);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    return new THREE.CanvasTexture(canvas);
  }, []);

  const handlePointerDown = (e: any) => {
    mouseDownPos.current.set(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: any) => {
    mouseUpPos.current.set(e.clientX, e.clientY);
    const distance = mouseDownPos.current.distanceTo(mouseUpPos.current);
    
    // Only trigger explosion if mouse didn't move much (not dragging)
    if (distance < 5 && sphereRef.current) {
      raycaster.setFromCamera(
        new THREE.Vector2(
          (e.clientX / window.innerWidth) * 2 - 1,
          -(e.clientY / window.innerHeight) * 2 + 1
        ),
        camera
      );
      const intersects = raycaster.intersectObject(sphereRef.current);
      
      if (intersects.length > 0) {
        setExplosionCenter(intersects[0].point.clone());
        setExplosionForce(1);
      }
    }
  };

  useFrame((state) => {
    if (!pointsRef.current || !sphereRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    // Use raycaster to get intersection with invisible sphere
    raycaster.setFromCamera(state.pointer, camera);
    const intersects = raycaster.intersectObject(sphereRef.current);
    
    if (intersects.length > 0) {
      mouseWorld.current.copy(intersects[0].point);
    }

    // Decay explosion force
    if (explosionForce > 0) {
      setExplosionForce(prev => Math.max(0, prev - 0.025));
    }

    const interactionRadius = 0.5;
    const explosionRadius = 0.7;
    const pushStrength = 0.1;
    const returnSpeed = 0.05;

    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;
      
      const particlePos = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      const originalPos = new THREE.Vector3(
        originalPositions[i3],
        originalPositions[i3 + 1],
        originalPositions[i3 + 2]
      );

      // Explosion effect - only affect nearby particles
      if (explosionForce > 0 && explosionCenter) {
        const distanceToExplosion = originalPos.distanceTo(explosionCenter);
        
        if (distanceToExplosion < explosionRadius) {
          const direction = originalPos.clone().sub(explosionCenter).normalize();
          const falloff = 1 - (distanceToExplosion / explosionRadius);
          const explosionAmount = explosionForce * falloff * 0.8;
          
          positions[i3] = originalPos.x + direction.x * explosionAmount;
          positions[i3 + 1] = originalPos.y + direction.y * explosionAmount;
          positions[i3 + 2] = originalPos.z + direction.z * explosionAmount;
          continue;
        }
      }

      // Mouse interaction
      const distance = particlePos.distanceTo(mouseWorld.current);

      if (distance < interactionRadius && intersects.length > 0) {
        // Push particles outward along their radial direction from sphere center
        const radialDirection = originalPos.clone().normalize();
        const pushAmount = (1 - distance / interactionRadius) * pushStrength;
        
        positions[i3] += radialDirection.x * pushAmount;
        positions[i3 + 1] += radialDirection.y * pushAmount;
        positions[i3 + 2] += radialDirection.z * pushAmount;
      } else {
        // Return to original position
        positions[i3] += (originalPos.x - positions[i3]) * returnSpeed;
        positions[i3 + 1] += (originalPos.y - positions[i3 + 1]) * returnSpeed;
        positions[i3 + 2] += (originalPos.z - positions[i3 + 2]) * returnSpeed;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      {/* Invisible sphere for raycasting */}
      <mesh ref={sphereRef} visible={false}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
            args={[particles, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          color="hotpink"
          map={texture}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default function InteractiveParticleSphere() {
  return (
    <div className="w-full h-screen bg-black">
      <h1 className="absolute text-white text-2xl p-8 z-10">Interactive Particle Sphere</h1>
      <Canvas camera={{ position: [0, 0, 3] }} className="w-full h-full">
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <ParticleSphere />
        <OrbitControls />
      </Canvas>
    </div>
  );
}

'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

function ParticleModel() {
  const pointsRef = useRef<THREE.Points>(null);
  const modelRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouseWorld = useRef(new THREE.Vector3());
  
  // Camera auto-return state
  const initialCameraPos = useRef(new THREE.Vector3(5.02, 4.95, -5.03));
  const initialTarget = useRef(new THREE.Vector3(0, 0, 0));
  const lastInteractionTime = useRef(Date.now());
  const isReturning = useRef(false);

  // Listen to OrbitControls events
  useEffect(() => {
    if (controlsRef.current) {
      const handleChange = () => {
        if (!isReturning.current) {
          lastInteractionTime.current = Date.now();
        }
      };

      controlsRef.current.addEventListener('change', handleChange);

      return () => {
        controlsRef.current?.removeEventListener('change', handleChange);
      };
    }
  }, []);
  
  // Load the GLB model
  const gltf = useGLTF('/pg2.glb');

  const { originalPositions, particles } = useMemo(() => {
    const count = 20000;
    const positions = new Float32Array(count * 3);
    const original = new Float32Array(count * 3);

    // Extract vertices from the loaded model
    let modelVertices: Float32Array | null = null;
    let hasVertices = false;
    
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const geometry = mesh.geometry;
          
          if (geometry.attributes.position) {
            modelVertices = geometry.attributes.position.array as Float32Array;
            hasVertices = true;
          }
        }
      });
    }

    if (hasVertices && modelVertices) {
      // Sample particles from model vertices
      const vertices = modelVertices as Float32Array;
      const vertexCount = vertices.length / 3;
      
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * vertexCount) * 3;
        
        const x = vertices[randomIndex];
        const y = vertices[randomIndex + 1];
        const z = vertices[randomIndex + 2];

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        original[i * 3] = x;
        original[i * 3 + 1] = y;
        original[i * 3 + 2] = z;
      }
    } else {
      // Fallback to sphere if model not loaded
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
    }

    return { originalPositions: original, particles: positions };
  }, [gltf]);

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

  useFrame((state) => {
    if (!pointsRef.current || !modelRef.current) return;

    // Auto-return to initial position after 3 seconds of inactivity
    const timeSinceLastInteraction = Date.now() - lastInteractionTime.current;
    const isAtInitialPosition = camera.position.distanceTo(initialCameraPos.current) < 0.1;
    
    if (timeSinceLastInteraction > 1500 && !isAtInitialPosition && controlsRef.current) {
      // Smoothly animate back to initial position
      isReturning.current = true;
      camera.position.lerp(initialCameraPos.current, 0.05);
      controlsRef.current.target.lerp(initialTarget.current, 0.05);
      controlsRef.current.update();
      
      // Stop returning when close enough
      if (camera.position.distanceTo(initialCameraPos.current) < 0.01) {
        camera.position.copy(initialCameraPos.current);
        controlsRef.current.target.copy(initialTarget.current);
        isReturning.current = false;
      }
    } else if (isAtInitialPosition) {
      isReturning.current = false;
    }

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    // Use raycaster to get intersection with the model
    raycaster.setFromCamera(state.pointer, camera);
    const intersects = raycaster.intersectObjects(modelRef.current.children, true);
    
    if (intersects.length > 0) {
      mouseWorld.current.copy(intersects[0].point);
    }

    const interactionRadius = 0.5;
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

      // Mouse interaction
      const distance = particlePos.distanceTo(mouseWorld.current);

      if (distance < interactionRadius && intersects.length > 0) {
        // Push particles outward along their radial direction from center
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
    <>
      <OrbitControls ref={controlsRef} enablePan={false} />
      <group>
        {/* Invisible model for raycasting */}
        <primitive ref={modelRef} object={gltf.scene.clone()} visible={false} />
        
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
          size={2}
          color="#006ec9"
          map={texture}
          sizeAttenuation={true}
          transparent={true}
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
    </>
  );
}

// Preload the model
useGLTF.preload('/pg2.glb');

export default function InteractiveParticleModel() {
  return (
    <div className="w-full h-screen bg-black">
      <h1 className="absolute text-white text-2xl p-8 z-10">Interactive Particle Model</h1>
      <Canvas orthographic
        camera={{ 
          position: [5.02, 4.95, -5.03], 
          zoom: 100,
          near: 0.1,
          far: 1000,
          
        }} 
        className="w-full h-full">
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <ParticleModel />
      </Canvas>
    </div>
  );
}

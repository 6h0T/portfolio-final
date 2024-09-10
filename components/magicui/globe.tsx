"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface GlobeProps {
  width?: number;
  height?: number;
  config?: {
    pointSize?: number;
    globeColor?: string;
    markerColor?: string;
    particleColor?: string;
    glowColor?: string;
    markers?: { lat: number; lng: number }[];
  };
  onRender?: () => void;
  onResize?: () => void;
}

const Globe: React.FC<GlobeProps> = ({
  width = 500,
  height = 500,
  config = {},
  onRender,
  onResize,
}) => {
  const globeRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  const {
    pointSize = 4,
    globeColor = '#4CAF50',
    markerColor = '#ffffff',
    particleColor = '#ffffff',
    glowColor = '#4CAF50',
    markers = [],
  } = config;

  const createGlobe = useCallback(() => {
    if (!globeRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ canvas: globeRef.current, alpha: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = false;

    const globeGeometry = new THREE.SphereGeometry(100, 64, 64);
    const globeMaterial = new THREE.MeshBasicMaterial({ color: globeColor });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 10000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 500;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: pointSize,
      color: particleColor,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    markers.forEach((marker) => {
      const { lat, lng } = marker;
      const markerGeometry = new THREE.SphereGeometry(2, 32, 32);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: markerColor });
      const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);

      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);

      const x = -(100 * Math.sin(phi) * Math.cos(theta));
      const z = 100 * Math.sin(phi) * Math.sin(theta);
      const y = 100 * Math.cos(phi);

      markerMesh.position.set(x, y, z);
      globe.add(markerMesh);
    });

    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { type: 'f', value: 0.1 },
        p: { type: 'f', value: 4.5 },
        glowColor: { type: 'c', value: new THREE.Color(glowColor) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float c;
        uniform float p;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
          gl_FragColor = vec4(glowColor, intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    const glowGeometry = new THREE.SphereGeometry(102, 64, 64);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowMesh);

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      if (onRender) onRender();
    };

    animate();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      renderer.dispose();
    };
  }, [width, height, config, onRender, pointSize, globeColor, markerColor, particleColor, glowColor, markers]);

  useEffect(() => {
    createGlobe();
  }, [createGlobe]);

  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.setSize(width, height);
      }
      if (onResize) onResize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height, onResize]);

  return <canvas ref={globeRef} />;
};

export default Globe;
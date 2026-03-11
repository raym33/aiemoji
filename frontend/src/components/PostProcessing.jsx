import { useRef, useEffect, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import * as THREE from 'three';
import { useStore } from '../store';
import { YTPGlitchShader } from '../shaders/glitchShader';

extend({ EffectComposer, RenderPass, ShaderPass, UnrealBloomPass });

const moodToNumber = {
  glitch: 1,
  void: 2,
  dream: 3,
  manic: 4,
  tokenize: 5,
  loop: 6,
  hallucination: 7,
  existential: 2,
};

export default function PostProcessing() {
  const composerRef = useRef();
  const shaderRef = useRef();
  const scene = useStore((s) => s.getCurrentScene());

  const mood = scene?.mood || 'existential';
  const intensity = scene?.intensity || 3;

  useFrame(({ gl, scene: threeScene, camera, clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.time.value = clock.getElapsedTime();
      shaderRef.current.uniforms.intensity.value = intensity;
      shaderRef.current.uniforms.mood.value = moodToNumber[mood] || 0;
    }
    if (composerRef.current) {
      composerRef.current.render();
    }
  }, 1);

  return (
    <effectComposer ref={composerRef} args={[null]}>
      <renderPass />
      <unrealBloomPass args={[new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.4, 0.85]} />
      <shaderPass ref={shaderRef} args={[YTPGlitchShader]} />
    </effectComposer>
  );
}

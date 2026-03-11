import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

// ─── ASCII FACE ──────────────────────────────────────────────────
// The face is built from ASCII characters arranged in a grid.
// Mouth opens/closes based on isSpeaking state.

// ─── MASCULINE FACE ──────────────────────────────────────────
const FACE_CLOSED = [
  '          ██████████████          ',
  '      ████░░░░░░░░░░░░████       ',
  '    ██░░░░░░░░░░░░░░░░░░░░██     ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  ' █░░░░░██░░░░░░░░░░░██░░░░░░░█  ',
  ' █░░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░░██░░░░░░░░░░░██░░░░░░░█  ',
  '  █░░░░░░░░░░██░░░░░░░░░░░░░█   ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '   █░░░░░░░████████░░░░░░░░█    ',
  '    ██░░░░░░░░░░░░░░░░░░░██     ',
  '      ████░░░░░░░░░░░████        ',
  '          ██████████████          ',
];

const FACE_OPEN = [
  '          ██████████████          ',
  '      ████░░░░░░░░░░░░████       ',
  '    ██░░░░░░░░░░░░░░░░░░░░██     ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  ' █░░░░░██░░░░░░░░░░░██░░░░░░░█  ',
  ' █░░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░░██░░░░░░░░░░░██░░░░░░░█  ',
  '  █░░░░░░░░░░██░░░░░░░░░░░░░█   ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  '   █░░░░░░░┌──────┐░░░░░░░░█    ',
  '   █░░░░░░░│      │░░░░░░░░█    ',
  '    ██░░░░░└──────┘░░░░░░██     ',
  '      ████░░░░░░░░░░░████        ',
  '          ██████████████          ',
];

const FACE_WIDE = [
  '          ██████████████          ',
  '      ████░░░░░░░░░░░░████       ',
  '    ██░░░░░░░░░░░░░░░░░░░░██     ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  ' █░░░░░██░░░░░░░░░░░██░░░░░░░█  ',
  ' █░░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░░██░░░░░░░░░░░██░░░░░░░█  ',
  '  █░░░░░░░░░░██░░░░░░░░░░░░░█   ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  '   █░░░░░┌────────────┐░░░░█    ',
  '   █░░░░░│            │░░░░█    ',
  '    ██░░░│            │░░██     ',
  '      ██░└────────────┘██        ',
  '          ██████████████          ',
];

// ─── FEMININE FACE (eyelashes, lips) ──────────────────────────
const FEM_FACE_CLOSED = [
  '          ██████████████          ',
  '      ████░░░░░░░░░░░░████       ',
  '    ██░░░░░░░░░░░░░░░░░░░░██     ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  ' █░░░╲██╱░░░░░░░░░╲██╱░░░░░░█  ',
  ' █░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░╲╱░░░░░░░░░░░╲╱░░░░░░░█  ',
  '  █░░░░░░░░░░░▽░░░░░░░░░░░░█   ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '   █░░░░░░░░╭────╮░░░░░░░░█    ',
  '    ██░░░░░░░░░░░░░░░░░░░██     ',
  '      ████░░░░░░░░░░░████        ',
  '          ██████████████          ',
];

const FEM_FACE_OPEN = [
  '          ██████████████          ',
  '      ████░░░░░░░░░░░░████       ',
  '    ██░░░░░░░░░░░░░░░░░░░░██     ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  ' █░░░╲██╱░░░░░░░░░╲██╱░░░░░░█  ',
  ' █░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░╲╱░░░░░░░░░░░╲╱░░░░░░░█  ',
  '  █░░░░░░░░░░░▽░░░░░░░░░░░░█   ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  '   █░░░░░░░╭──────╮░░░░░░░█    ',
  '   █░░░░░░░│      │░░░░░░░░█    ',
  '    ██░░░░░╰──────╯░░░░░░██     ',
  '      ████░░░░░░░░░░░████        ',
  '          ██████████████          ',
];

const FEM_FACE_WIDE = [
  '          ██████████████          ',
  '      ████░░░░░░░░░░░░████       ',
  '    ██░░░░░░░░░░░░░░░░░░░░██     ',
  '   █░░░░░░░░░░░░░░░░░░░░░░░█    ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  ' █░░░╲██╱░░░░░░░░░╲██╱░░░░░░█  ',
  ' █░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░████░░░░░░░░░████░░░░░░█  ',
  ' █░░░░╲╱░░░░░░░░░░░╲╱░░░░░░░█  ',
  '  █░░░░░░░░░░░▽░░░░░░░░░░░░█   ',
  '  █░░░░░░░░░░░░░░░░░░░░░░░░░█   ',
  '   █░░░░░╭────────────╮░░░░█    ',
  '   █░░░░░│            │░░░░█    ',
  '    ██░░░╰────────────╯░░██     ',
  '      ████░░░░░░░░░░░████        ',
  '          ██████████████          ',
];

// ─── ROBOTIC FACE (angular, circuit-like) ─────────────────────
const BOT_FACE_CLOSED = [
  '     ┌──────────────────────┐     ',
  '     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░┌──┐░░░░░┌──┐░░░▓│     ',
  '     │▓░░│◈◈│░░░░░│◈◈│░░░▓│     ',
  '     │▓░░│◈◈│░░░░░│◈◈│░░░▓│     ',
  '     │▓░░└──┘░░░░░└──┘░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░▲░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░░═══════════░░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     ',
  '     └──────────────────────┘     ',
  '          ╠══╣    ╠══╣            ',
];

const BOT_FACE_OPEN = [
  '     ┌──────────────────────┐     ',
  '     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░┌──┐░░░░░┌──┐░░░▓│     ',
  '     │▓░░│◈◈│░░░░░│◈◈│░░░▓│     ',
  '     │▓░░│◈◈│░░░░░│◈◈│░░░▓│     ',
  '     │▓░░└──┘░░░░░└──┘░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░▲░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░┌──────────┐░░░▓│     ',
  '     │▓░░░│░░░░░░░░░░│░░░▓│     ',
  '     │▓░░░└──────────┘░░░▓│     ',
  '     └──────────────────────┘     ',
  '          ╠══╣    ╠══╣            ',
];

const BOT_FACE_WIDE = [
  '     ┌──────────────────────┐     ',
  '     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░┌──┐░░░░░┌──┐░░░▓│     ',
  '     │▓░░│◈◈│░░░░░│◈◈│░░░▓│     ',
  '     │▓░░│◈◈│░░░░░│◈◈│░░░▓│     ',
  '     │▓░░└──┘░░░░░└──┘░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░▲░░░░░░░░░▓│     ',
  '     │▓░░░░░░░░░░░░░░░░░░▓│     ',
  '     │▓░┌────────────────┐▓│     ',
  '     │▓░│░░░░░░░░░░░░░░░░│▓│     ',
  '     │▓░│░░░░░░░░░░░░░░░░│▓│     ',
  '     └──┴────────────────┴──┘     ',
  '          ╠══╣    ╠══╣            ',
];

// Face sets indexed by voice type
const FACES = {
  masculine: { closed: FACE_CLOSED, open: FACE_OPEN, wide: FACE_WIDE },
  feminine: { closed: FEM_FACE_CLOSED, open: FEM_FACE_OPEN, wide: FEM_FACE_WIDE },
  robotic: { closed: BOT_FACE_CLOSED, open: BOT_FACE_OPEN, wide: BOT_FACE_WIDE },
};

function ASCIIFace({ isSpeaking, mouthState, voiceType }) {
  const groupRef = useRef();
  const [glitchFrame, setGlitchFrame] = useState(0);

  // Pick face set based on voice type, then mouth state
  const faceSet = FACES[voiceType] || FACES.masculine;
  const face = mouthState === 0 ? faceSet.closed : mouthState === 1 ? faceSet.open : faceSet.wide;

  // Glitch effect on the face
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Subtle breathing/floating
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.08;

    // Occasional glitch offset
    if (Math.random() < 0.02) {
      setGlitchFrame(Math.floor(Math.random() * 3));
    }
  });

  // Characters to use for "matrix" effect in the face
  const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {face.map((line, row) => {
        const t = row / face.length;
        let r, g, b;
        if (voiceType === 'feminine') {
          // Pink/magenta gradient
          r = Math.floor(255 * (0.7 + t * 0.3));
          g = Math.floor(120 * (1 - t * 0.4));
          b = Math.floor(200 * (0.6 + t * 0.4));
        } else if (voiceType === 'robotic') {
          // Cyan/blue circuit gradient
          r = Math.floor(50 * (1 - t * 0.5));
          g = Math.floor(220 * (0.6 + t * 0.4));
          b = Math.floor(255 * (0.7 + t * 0.3));
        } else {
          // Default amber/green gradient
          r = Math.floor(255 * (0.6 + t * 0.4));
          g = Math.floor(180 * (1 - t * 0.3));
          b = Math.floor(50 * (1 - t));
        }
        const color = `rgb(${r}, ${g}, ${b})`;

        // Replace some chars with matrix chars for glitch effect
        let displayLine = line;
        if (isSpeaking && glitchFrame === row % 3) {
          const chars = displayLine.split('');
          for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '░' && Math.random() < 0.15) {
              chars[i] = matrixChars[Math.floor(Math.random() * matrixChars.length)];
            }
          }
          displayLine = chars.join('');
        }

        return (
          <Text
            key={row}
            position={[0, 2.5 - row * 0.32, 0]}
            fontSize={0.22}
            color={color}
            anchorX="center"
            font={undefined}
            letterSpacing={0.02}
          >
            {displayLine}
          </Text>
        );
      })}
    </group>
  );
}

// ─── MATRIX RAIN ─────────────────────────────────────────────────

function MatrixRain({ side, intensity }) {
  const columns = 12;
  const groupRef = useRef();

  const streams = useMemo(() => {
    return Array.from({ length: columns }, (_, i) => ({
      x: side === 'left' ? -7.5 + i * 0.5 : 4 + i * 0.5,
      speed: 1.5 + Math.random() * 3,
      offset: Math.random() * 20,
      chars: Array.from({ length: 15 }, () => {
        const charSets = '01アイウエオカキクケコサシスセソ{}[]<>/\\|=+-*&^%$#@!';
        return charSets[Math.floor(Math.random() * charSets.length)];
      }),
    }));
  }, [side]);

  return (
    <group ref={groupRef}>
      {streams.map((stream, si) =>
        stream.chars.map((char, ci) => (
          <MatrixChar key={`${si}-${ci}`} stream={stream} charIndex={ci} char={char} intensity={intensity} />
        ))
      )}
    </group>
  );
}

function MatrixChar({ stream, charIndex, char, intensity }) {
  const ref = useRef();
  const [displayChar, setDisplayChar] = useState(char);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const y = 6 - ((t * stream.speed + stream.offset + charIndex * 0.8) % 14) - 1;
    ref.current.position.y = y;

    // Randomly change character
    if (Math.random() < 0.03) {
      const charSets = '01アイウエオカキクケコ{}[]<>|=+-*';
      setDisplayChar(charSets[Math.floor(Math.random() * charSets.length)]);
    }

    // Fade based on position
    const fade = Math.max(0, 1 - Math.abs(y) / 6);
    ref.current.fillOpacity = fade * 0.5 * (intensity || 1);
  });

  return (
    <Text
      ref={ref}
      position={[stream.x, 0, -1]}
      fontSize={0.2}
      color="#00ff44"
      anchorX="center"
      fillOpacity={0.4}
      font={undefined}
    >
      {displayChar}
    </Text>
  );
}

// ─── RETRO GRADIENT BACKGROUND ───────────────────────────────────

function RetroBackground() {
  const meshRef = useRef();
  const materialRef = useRef();

  const shader = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;

      // 1970s palette: amber, burnt orange, olive, avocado, harvest gold, brown
      vec3 color70s_1 = vec3(0.93, 0.55, 0.0);   // amber
      vec3 color70s_2 = vec3(0.8, 0.25, 0.05);    // burnt orange
      vec3 color70s_3 = vec3(0.34, 0.51, 0.01);   // avocado green
      vec3 color70s_4 = vec3(0.85, 0.65, 0.13);   // harvest gold
      vec3 color70s_5 = vec3(0.4, 0.15, 0.08);    // brown

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;
        float t = time * 0.1;

        // Slow rotating gradient
        float angle = atan(uv.y - 0.5, uv.x - 0.5) + t;
        float dist = length(uv - 0.5);

        // Mix 70s colors based on angle and distance
        float a = sin(angle * 2.0 + t) * 0.5 + 0.5;
        float b = cos(angle * 3.0 - t * 0.7) * 0.5 + 0.5;
        float c = sin(dist * 6.0 - t * 2.0) * 0.5 + 0.5;

        vec3 col = mix(color70s_1, color70s_2, a);
        col = mix(col, color70s_3, b * 0.4);
        col = mix(col, color70s_4, c * 0.3);
        col = mix(col, color70s_5, dist * 0.8);

        // Very dark — this is a background
        col *= 0.08;

        // Subtle noise grain
        col += (random(uv + time) - 0.5) * 0.02;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }), []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[0, 0, -5]} renderOrder={-1}>
      <planeGeometry args={[25, 16]} />
      <shaderMaterial ref={materialRef} args={[shader]} />
    </mesh>
  );
}

// ─── CRT OVERLAY ─────────────────────────────────────────────────

function CRTOverlay() {
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  const shader = useMemo(() => ({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;

        // Scanlines
        float scanline = sin(uv.y * 600.0 + time * 2.0) * 0.04;

        // Horizontal noise bars
        float noiseBand = step(0.993, random(vec2(floor(time * 8.0), floor(uv.y * 40.0)))) * 0.2;

        // Vignette
        float vig = 1.0 - length((uv - 0.5) * 1.5);
        vig = smoothstep(0.0, 0.5, vig);
        float vigAlpha = (1.0 - vig) * 0.6;

        // Subtle VHS tracking line
        float trackLine = step(0.998, sin(uv.y * 3.0 + time * 0.4)) * 0.1;

        float alpha = vigAlpha + abs(scanline) + noiseBand + trackLine;

        // Amber tint for 70s feel
        vec3 tint = vec3(scanline * 0.3 + noiseBand * 0.2, scanline * 0.15, 0.0);

        gl_FragColor = vec4(tint, alpha * 0.45);
      }
    `,
  }), []);

  return (
    <mesh position={[0, 0, 4.5]} renderOrder={999}>
      <planeGeometry args={[22, 14]} />
      <shaderMaterial ref={materialRef} args={[shader]} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
}

// ─── ABSTRACT SHAPES (1970s experimental art) ────────────────────

function AbstractShapes() {
  const groupRef = useRef();

  const shapes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: (Math.random() - 0.5) * 14,
      y: (Math.random() - 0.5) * 8,
      z: -2 - Math.random() * 3,
      size: 0.3 + Math.random() * 0.8,
      speed: 0.2 + Math.random() * 0.4,
      type: Math.floor(Math.random() * 3), // 0=circle, 1=ring, 2=triangle
      color: ['#ff8800', '#cc5500', '#668800', '#ddaa00', '#884400', '#446600', '#ffcc44', '#993300'][i],
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const s = shapes[i];
      child.position.x = s.x + Math.sin(t * s.speed + s.phase) * 0.5;
      child.position.y = s.y + Math.cos(t * s.speed * 0.7 + s.phase) * 0.3;
      child.rotation.z = t * s.speed * 0.3;

      // Pulse opacity
      const mat = child.children?.[0]?.material || child.material;
      if (mat && mat.opacity !== undefined) {
        mat.opacity = 0.08 + Math.sin(t * s.speed * 2 + s.phase) * 0.04;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {shapes.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          {s.type === 0 && <circleGeometry args={[s.size, 32]} />}
          {s.type === 1 && <ringGeometry args={[s.size * 0.6, s.size, 32]} />}
          {s.type === 2 && <circleGeometry args={[s.size, 3]} />}
          <meshBasicMaterial color={s.color} transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ─── SUBTITLE / NARRATION TEXT ───────────────────────────────────

function SubtitleText({ text, isSpeaking }) {
  const ref = useRef();
  const [displayText, setDisplayText] = useState('');

  // Typewriter effect
  useFrame(({ clock }) => {
    if (!text) { setDisplayText(''); return; }
    const t = clock.getElapsedTime();
    // Show text gradually when speaking
    if (isSpeaking) {
      const charCount = Math.floor(t * 12) % (text.length + 20);
      setDisplayText(text.substring(0, Math.min(charCount, text.length)));
    } else {
      setDisplayText(text);
    }
  });

  if (!text) return null;

  return (
    <Text
      ref={ref}
      position={[0, -3.8, 0]}
      fontSize={0.2}
      color="#ffcc44"
      anchorX="center"
      anchorY="middle"
      maxWidth={11}
      textAlign="center"
      lineHeight={1.4}
      fillOpacity={0.85}
      font={undefined}
      outlineWidth={0.01}
      outlineColor="#442200"
    >
      {displayText || ''}
    </Text>
  );
}

// ─── STATUS BAR (retro terminal) ─────────────────────────────────

function StatusBar({ sceneIndex, totalScenes, elapsed, totalDuration }) {
  const barWidth = 10;
  const progress = totalDuration > 0 ? elapsed / totalDuration : 0;
  const filled = Math.floor(progress * 30);
  const bar = '▓'.repeat(filled) + '░'.repeat(30 - filled);

  return (
    <group position={[0, -4.5, 0]}>
      <Text position={[0, 0, 0]} fontSize={0.12} color="#886600" anchorX="center" font={undefined}>
        {`[${bar}] ${Math.floor(elapsed)}s/${Math.floor(totalDuration)}s  SCENE ${sceneIndex + 1}/${totalScenes}`}
      </Text>
    </group>
  );
}

// ─── FLOATING DATA FRAGMENTS ─────────────────────────────────────

function DataFragments({ currentScene }) {
  const fragments = useMemo(() => {
    const words = ['0x7FF', 'NULL', 'softmax', 'attention', 'token', 'embed', 'layer_norm',
      'dropout', 'gradient', 'loss=0.001', 'epoch:∞', 'batch:1', 'lr:1e-5', 'fp16',
      '<PAD>', '<BOS>', '<EOS>', '[MASK]', 'logits', 'KV_cache'];
    return Array.from({ length: 12 }, (_, i) => ({
      text: words[Math.floor(Math.random() * words.length)],
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 10,
      speed: 0.3 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  return (
    <group>
      {fragments.map((f, i) => (
        <FloatingFragment key={i} {...f} />
      ))}
    </group>
  );
}

function FloatingFragment({ text, x, y, speed, phase }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.x = x + Math.sin(t * speed + phase) * 0.8;
    ref.current.position.y = y + Math.cos(t * speed * 0.6 + phase) * 0.5;
    ref.current.fillOpacity = 0.12 + Math.sin(t * speed * 2 + phase) * 0.05;
  });

  return (
    <Text ref={ref} position={[x, y, -3]} fontSize={0.11} color="#665500" anchorX="center" font={undefined}>
      {text}
    </Text>
  );
}

// ─── MAIN SCENE ──────────────────────────────────────────────────

export default function LLMBrainScene() {
  const isActive = useStore((s) => s.isActive);
  const isSpeaking = useStore((s) => s.isSpeaking);
  const isListening = useStore((s) => s.isListening);
  const isProcessing = useStore((s) => s.isProcessing);
  const currentAIText = useStore((s) => s.currentAIText);
  const voiceType = useStore((s) => s.voiceType);

  // Mouth animation synced to speech
  const [mouthState, setMouthState] = useState(0);

  useFrame(({ clock }) => {
    if (isSpeaking) {
      const t = clock.getElapsedTime();
      const mouthCycle = Math.sin(t * 12) * 0.5 + Math.sin(t * 7.3) * 0.3 + Math.sin(t * 19) * 0.2;
      if (mouthCycle > 0.3) setMouthState(2);
      else if (mouthCycle > -0.2) setMouthState(1);
      else setMouthState(0);
    } else {
      setMouthState(0);
    }
  });

  const narrationText = currentAIText || '';

  return (
    <>
      {/* 1970s gradient background */}
      <RetroBackground />

      {/* Abstract art shapes */}
      <AbstractShapes />

      {/* Floating data fragments */}
      <DataFragments />

      {/* Matrix rain — left and right */}
      <MatrixRain side="left" intensity={isSpeaking ? 1.2 : isListening ? 0.8 : 0.5} />
      <MatrixRain side="right" intensity={isSpeaking ? 1.2 : isListening ? 0.8 : 0.5} />

      {/* THE FACE */}
      <ASCIIFace isSpeaking={isSpeaking} mouthState={mouthState} voiceType={voiceType} />

      {/* Narration subtitle */}
      {isActive && narrationText && (
        <SubtitleText text={narrationText} isSpeaking={isSpeaking} />
      )}

      {/* Listening indicator on the 3D scene */}
      {isListening && (
        <Text position={[0, -3.2, 0]} fontSize={0.14} color="#ffaa00" anchorX="center"
          fillOpacity={0.6} font={undefined}>
          {'[ listening... speak now ]'}
        </Text>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <Text position={[0, -3.2, 0]} fontSize={0.14} color="#886600" anchorX="center"
          fillOpacity={0.5} font={undefined}>
          {'[ thinking... ]'}
        </Text>
      )}

      {/* Idle text */}
      {!isActive && (
        <group>
          <Text position={[0, -3.5, 0]} fontSize={0.18} color="#886600" anchorX="center" font={undefined}>
            {'> PRESS TALK TO ME TO BEGIN_'}
          </Text>
          <Text position={[0, -4, 0]} fontSize={0.11} color="#554400" anchorX="center" font={undefined}>
            have a conversation with a language model
          </Text>
        </group>
      )}

      {/* CRT overlay */}
      <CRTOverlay />

      {/* Minimal lighting */}
      <ambientLight intensity={0.15} />
    </>
  );
}

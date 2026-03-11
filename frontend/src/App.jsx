import { Canvas } from '@react-three/fiber';
import LLMBrainScene from './components/LLMBrainScene';
import AudioPlayer from './components/AudioPlayer';
import UI from './components/UI';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, 2]}
      >
        <LLMBrainScene />
      </Canvas>
      <AudioPlayer />
      <UI />
    </div>
  );
}

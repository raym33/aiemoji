import { useRef, useCallback } from 'react';
import { useStore } from '../store';

export default function VideoRecorder({ canvasRef }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const isRecording = useStore((s) => s.isRecording);
  const setRecording = useStore((s) => s.setRecording);

  const startRecording = useCallback(() => {
    const canvas = canvasRef?.current || document.querySelector('canvas');
    if (!canvas) return;

    const stream = canvas.captureStream(30);

    // Try to also capture audio if available
    const audioElements = document.querySelectorAll('audio');
    if (audioElements.length > 0) {
      try {
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        audioElements.forEach((audio) => {
          try {
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(dest);
            source.connect(audioCtx.destination);
          } catch (e) {}
        });
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch (e) {}
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `llm-ytpoop-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setRecording(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setRecording(true);
  }, [canvasRef, setRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { startRecording, stopRecording, isRecording };
}

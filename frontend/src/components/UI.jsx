import { useRef, useCallback, useState, useEffect } from 'react';
import { useStore } from '../store';
import { startMusic, stopMusic } from '../audio/proceduralMusic';

export default function UI() {
  const {
    messages, isActive, isSpeaking, isListening, isProcessing,
    error, currentAIText, voiceType,
    startConversation, stopConversation, sendMessage,
    transcribeAudio, setListening, setError, setVoiceType,
  } = useStore();

  const [musicOn, setMusicOn] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const silenceStartRef = useRef(null);

  // Video recording
  const videoRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);

  // Music sync
  useEffect(() => {
    if (isActive && !musicOn) { startMusic(); setMusicOn(true); }
    if (!isActive && musicOn) { stopMusic(); setMusicOn(false); }
  }, [isActive, musicOn]);

  // Auto-start mic when isListening becomes true and conditions are met
  useEffect(() => {
    if (isListening && isActive && !isSpeaking && !isProcessing) {
      startMicWithSilenceDetection();
    }
  }, [isListening, isActive, isSpeaking, isProcessing]);

  // Stop mic when speaking or processing starts
  useEffect(() => {
    if ((isSpeaking || isProcessing) && mediaRecorderRef.current?.state === 'recording') {
      forceStopMic();
    }
  }, [isSpeaking, isProcessing]);

  const startMicWithSilenceDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for silence detection
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close().catch(() => {});
        clearInterval(silenceTimerRef.current);

        if (chunksRef.current.length === 0) {
          setListening(true); // Re-listen if no data
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Skip very short recordings (< 0.5s of data ~= clicks/noise)
        if (blob.size < 5000) {
          setListening(true);
          return;
        }

        const result = await transcribeAudio(blob);
        if (result && result.text && result.text.trim() && result.text.trim().length > 1) {
          await sendMessage(result.text, result.language);
        } else {
          // Nothing detected, re-listen
          if (useStore.getState().isActive) setListening(true);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Collect in 250ms chunks

      // Silence detection: auto-stop after 1.5s of silence
      let hasHadSound = false;
      silenceStartRef.current = null;

      silenceTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);

        // Calculate RMS volume
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);

        const SILENCE_THRESHOLD = 15;
        const SILENCE_DURATION = 1500; // 1.5 seconds

        if (rms > SILENCE_THRESHOLD) {
          hasHadSound = true;
          silenceStartRef.current = null;
        } else if (hasHadSound) {
          // Sound was detected before, now it's silent
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
            // 1.5s of silence after speech — auto-send!
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            clearInterval(silenceTimerRef.current);
          }
        }
      }, 100);

    } catch (e) {
      setError('Microphone access denied. Please allow mic access.');
      setListening(false);
    }
  }, [transcribeAudio, sendMessage, setListening, setError]);

  const forceStopMic = useCallback(() => {
    clearInterval(silenceTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  }, []);

  // Video recording
  const startVideoRecording = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    videoChunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `llm-conversation-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url); setIsRecording(false);
    };
    videoRecorderRef.current = recorder;
    recorder.start(100); setIsRecording(true);
  }, []);

  const stopVideoRecording = useCallback(() => {
    if (videoRecorderRef.current?.state !== 'inactive') videoRecorderRef.current?.stop();
  }, []);

  const statusText = isProcessing ? 'THINKING...'
    : isSpeaking ? 'SPEAKING'
    : isListening ? 'LISTENING...'
    : isActive ? 'READY' : 'IDLE';

  const visibleMessages = messages.slice(-6);

  return (
    <div style={styles.overlay}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.title}>LLM_BRAIN.exe</span>
        <span style={styles.status}>[{statusText}]</span>
        {isActive && <span style={styles.msgCount}>{messages.length} msgs</span>}
      </div>

      {/* START screen — voice selector + play button */}
      {!isActive && (
        <div style={styles.centerArea}>
          {/* Voice selector */}
          <div style={styles.voiceSelector}>
            {['masculine', 'feminine', 'robotic'].map((v) => (
              <button
                key={v}
                onClick={() => setVoiceType(v)}
                style={{
                  ...styles.voiceBtn,
                  ...(voiceType === v ? styles.voiceBtnActive : {}),
                }}
              >
                {v === 'masculine' ? '♂ Masculine' : v === 'feminine' ? '♀ Feminine' : '⚡ Robotic'}
              </button>
            ))}
          </div>

          <button onClick={startConversation} style={styles.playButton}>
            <span style={styles.playIcon}>▶</span>
            <span style={styles.playLabel}>TALK TO ME</span>
          </button>
          <div style={styles.hint}>
            Speak freely. Auto-detects when you stop talking.
          </div>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div style={styles.processingDot}>
          <div style={{ ...styles.dot, animation: 'pulse 0.8s infinite' }} />
          <span>thinking...</span>
        </div>
      )}

      {/* Chat history */}
      {isActive && visibleMessages.length > 0 && (
        <div style={styles.chatHistory}>
          {visibleMessages.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? styles.userMsg : styles.aiMsg}>
              <span style={styles.msgRole}>{msg.role === 'user' ? 'YOU' : 'AI'}:</span>
              <span style={styles.msgText}>
                {msg.text.substring(0, 150)}{msg.text.length > 150 ? '...' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom controls when active */}
      {isActive && (
        <div style={styles.bottomControls}>
          <button onClick={() => { stopConversation(); forceStopMic(); if (isRecording) stopVideoRecording(); }} style={styles.stopBtn}>
            ■ END
          </button>
          {!isRecording ? (
            <button onClick={startVideoRecording} style={styles.recBtn}>⏺ REC</button>
          ) : (
            <button onClick={stopVideoRecording} style={styles.recBtnActive}>⏹ STOP</button>
          )}
          {/* Voice switcher while active */}
          <select
            value={voiceType}
            onChange={(e) => setVoiceType(e.target.value)}
            style={styles.voiceSelect}
          >
            <option value="masculine">♂ Masc</option>
            <option value="feminine">♀ Fem</option>
            <option value="robotic">⚡ Robot</option>
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.error}>
          {error}
          <button onClick={() => setError(null)} style={styles.errorClose}>×</button>
        </div>
      )}

      {isRecording && <div style={styles.recDot}>● REC</div>}

      {/* Listening visualization */}
      {isListening && (
        <div style={styles.listeningViz}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              ...styles.vizBar,
              animation: `pulse 0.5s infinite ${i * 0.1}s`,
              height: `${10 + i * 4}px`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none', zIndex: 10,
    fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 20px', pointerEvents: 'auto',
  },
  title: { fontSize: '14px', color: '#ffaa00', fontWeight: 'bold', textShadow: '0 0 10px #ffaa0033' },
  status: { fontSize: '10px', color: '#886600', letterSpacing: '1px' },
  msgCount: { fontSize: '9px', color: '#443300', marginLeft: 'auto' },

  centerArea: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    pointerEvents: 'auto',
  },
  voiceSelector: { display: 'flex', gap: '6px' },
  voiceBtn: {
    background: 'transparent', color: '#886600', border: '1px solid #88660033',
    padding: '6px 12px', borderRadius: '3px', fontSize: '11px',
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
  },
  voiceBtnActive: {
    background: '#ffaa0022', color: '#ffcc00', border: '1px solid #ffcc0066',
    boxShadow: '0 0 8px #ffaa0022',
  },
  playButton: {
    background: 'radial-gradient(circle, #ffaa00 0%, #884400 100%)',
    border: '2px solid #ffcc44', borderRadius: '50%',
    width: '120px', height: '120px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 0 40px #ffaa0044, inset 0 0 20px #00000044',
  },
  playIcon: { fontSize: '32px', color: '#000', lineHeight: 1 },
  playLabel: { fontSize: '8px', color: '#000', fontWeight: 'bold', letterSpacing: '2px', marginTop: '4px' },
  hint: { fontSize: '11px', color: '#665500', textAlign: 'center', lineHeight: 1.6 },

  processingDot: {
    position: 'fixed', bottom: '70px', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: '8px',
    color: '#886600', fontSize: '10px', pointerEvents: 'none',
  },
  dot: { width: '6px', height: '6px', borderRadius: '50%', background: '#ffaa00' },

  chatHistory: {
    position: 'fixed', left: '16px', top: '50px', bottom: '70px',
    width: '280px', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '6px',
    pointerEvents: 'none',
  },
  userMsg: {
    fontSize: '10px', color: '#88aacc', padding: '4px 8px',
    background: '#0a1520aa', borderRadius: '3px', borderLeft: '2px solid #4488aa44',
  },
  aiMsg: {
    fontSize: '10px', color: '#ddaa66', padding: '4px 8px',
    background: '#1a0f05aa', borderRadius: '3px', borderLeft: '2px solid #ffaa0044',
  },
  msgRole: { fontWeight: 'bold', marginRight: '6px', fontSize: '9px' },
  msgText: { lineHeight: 1.4 },

  bottomControls: {
    position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: '8px', pointerEvents: 'auto', alignItems: 'center',
  },
  stopBtn: {
    background: 'transparent', color: '#ff6644', border: '1px solid #ff664433',
    padding: '8px 14px', borderRadius: '3px', fontSize: '11px',
    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold',
  },
  recBtn: {
    background: 'transparent', color: '#ff3366', border: '1px solid #ff336633',
    padding: '8px 14px', borderRadius: '3px', fontSize: '11px',
    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold',
  },
  recBtnActive: {
    background: '#ff000022', color: '#ff3333', border: '1px solid #ff3333',
    padding: '8px 14px', borderRadius: '3px', fontSize: '11px',
    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold',
    animation: 'pulse 1s infinite',
  },
  voiceSelect: {
    background: '#0a0a0a', color: '#ffaa00', border: '1px solid #ffaa0033',
    padding: '8px 10px', borderRadius: '3px', fontSize: '10px',
    cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
  },
  error: {
    position: 'fixed', bottom: '50px', left: '50%', transform: 'translateX(-50%)',
    padding: '6px 14px', background: '#1a0800ee', border: '1px solid #ff440033',
    borderRadius: '3px', color: '#ff8844', fontSize: '10px',
    pointerEvents: 'auto', maxWidth: '400px', textAlign: 'center',
    display: 'flex', gap: '8px', alignItems: 'center',
  },
  errorClose: {
    background: 'none', border: 'none', color: '#ff884488', cursor: 'pointer',
    fontSize: '14px', fontFamily: 'inherit',
  },
  recDot: {
    position: 'fixed', top: '12px', right: '20px',
    color: '#ff0000', fontSize: '11px', fontWeight: 'bold',
    animation: 'pulse 1s infinite', pointerEvents: 'none',
  },
  listeningViz: {
    position: 'fixed', bottom: '54px', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: '3px', alignItems: 'flex-end', pointerEvents: 'none',
  },
  vizBar: { width: '4px', background: '#ffaa00', borderRadius: '2px' },
};

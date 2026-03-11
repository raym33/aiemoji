import { create } from 'zustand';

const API_URL = 'http://localhost:8420';

export const useStore = create((set, get) => ({
  messages: [],
  isActive: false,
  isSpeaking: false,
  isListening: false,
  isProcessing: false,
  error: null,
  currentAIText: '',
  currentAudio: null,
  voiceType: 'masculine', // 'masculine' | 'feminine' | 'robotic'
  detectedLanguage: 'en', // detected from Whisper

  setSpeaking: (v) => set({ isSpeaking: v }),
  setListening: (v) => set({ isListening: v }),
  setError: (error) => set({ error }),
  setVoiceType: (v) => set({ voiceType: v }),

  startConversation: async () => {
    const { voiceType, detectedLanguage } = get();
    set({ isActive: true, messages: [], error: null, isProcessing: true, currentAIText: '' });
    try {
      const res = await fetch(`${API_URL}/chat/greeting?voice_type=${voiceType}&language=${detectedLanguage}`, { method: 'POST' });
      const data = await res.json();
      set({
        messages: [{ role: 'ai', text: data.reply }],
        currentAIText: data.reply,
        isProcessing: false,
      });
      if (data.audio_b64) {
        get().playAudio(data.audio_b64);
      } else {
        // No audio — still start listening
        if (get().isActive) set({ isListening: true });
      }
    } catch (e) {
      set({ isProcessing: false, error: 'Backend offline. Run: cd backend && python main.py' });
    }
  },

  sendMessage: async (userText, language) => {
    if (!userText.trim()) return;
    const { messages, voiceType, detectedLanguage } = get();
    const lang = language || detectedLanguage;
    if (language) set({ detectedLanguage: language });
    const newMessages = [...messages, { role: 'user', text: userText }];
    set({ messages: newMessages, isProcessing: true, isListening: false, currentAIText: '' });
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, session_id: 'default', voice_type: voiceType, language: lang }),
      });
      const data = await res.json();
      set({
        messages: [...newMessages, { role: 'ai', text: data.reply }],
        currentAIText: data.reply,
        isProcessing: false,
      });
      if (data.audio_b64) {
        get().playAudio(data.audio_b64);
      } else {
        // No audio — still start listening
        if (get().isActive) set({ isListening: true });
      }
    } catch (e) {
      set({ isProcessing: false, error: 'Failed to reach backend' });
    }
  },

  transcribeAudio: async (audioBlob) => {
    set({ isProcessing: true });
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        set({ isProcessing: false, error: 'Whisper: ' + data.error });
        return null;
      }
      // Store detected language from Whisper
      if (data.language) {
        set({ detectedLanguage: data.language });
      }
      return { text: data.text, language: data.language || 'en' };
    } catch (e) {
      set({ isProcessing: false, error: 'Transcription failed' });
      return null;
    }
  },

  playAudio: (b64) => {
    const { currentAudio } = get();
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }

    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onplay = () => set({ isSpeaking: true });
    audio.onended = () => {
      set({ isSpeaking: false, currentAudio: null });
      URL.revokeObjectURL(url);
      // Auto-start listening after AI finishes
      if (get().isActive) set({ isListening: true });
    };
    audio.onpause = () => set({ isSpeaking: false });

    set({ currentAudio: audio });
    audio.play().catch(() => {
      set({ isSpeaking: false, currentAudio: null });
      URL.revokeObjectURL(url);
      // Audio failed to play — still start listening
      if (get().isActive) set({ isListening: true });
    });
  },

  stopConversation: () => {
    const { currentAudio } = get();
    if (currentAudio) currentAudio.pause();
    set({
      isActive: false, isSpeaking: false, isListening: false,
      isProcessing: false, currentAudio: null, currentAIText: '',
    });
    fetch(`${API_URL}/chat/reset?session_id=default`, { method: 'POST' }).catch(() => {});
  },
}));

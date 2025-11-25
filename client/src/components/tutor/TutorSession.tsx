import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import UnityAvatar, { UnityAvatarHandle } from './UnityAvatar';
import {
  Bot,
  User,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Brain,
  FileText,
  Send,
  Mic,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Settings,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Volume2,
  MessageCircleQuestion,
  MessageSquare,
  MessageSquareOff,
  MicOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { Chat, Message } from "@shared/schema";
import QuickToolModal from "./QuickToolModal";
import VoiceControl from "./VoiceControl";
import { Phone, PhoneOff } from "lucide-react";
import { useUnityAvatar } from "@/contexts/UnityAvatarContext";
// Removed AvatarContainer - using direct Unity iframe for split-screen
import { useVoiceTutor } from "@/hooks/useVoiceTutor";
import mentorAvatar from "@assets/generated_images/female_teacher_gradient_background.png";

interface TutorResponse {
  type: 'teach' | 'check' | 'diagnose';
  content: string;
  explain?: string;
  check?: {
    stem: string;
    options: string[];
    answer: string[];
  };
  diagnostic?: string;
  progress?: number;
  options?: string[];
  meta?: any;
}

interface TutorSessionProps {
  chatId: string;
  onEndSession: () => void;
}

type ToolType = 'explain' | 'hint' | 'example' | 'practice5' | 'summary';

export default function TutorSession({ chatId, onEndSession }: TutorSessionProps) {
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeToolModal, setActiveToolModal] = useState<ToolType | null>(null);
  const [toolStreaming, setToolStreaming] = useState(false);
  const [toolStreamingContent, setToolStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Safety timeout: Clear playingAudio if Unity doesn't respond within 30 seconds
  const startAudioSafetyTimeout = useCallback(() => {
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    audioTimeoutRef.current = setTimeout(() => {
      console.warn('[TTS] ⚠️ Safety timeout: Unity did not send AUDIO_ENDED within 30 seconds');
      setPlayingAudio(null);
    }, 30000); // 30 seconds max for audio playback
  }, []);
  
  const clearAudioSafetyTimeout = useCallback(() => {
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
  }, []);
  
  const [shouldAutoPlayTTS, setShouldAutoPlayTTS] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // 🎵 Per-chunk TTS queue (play audio chunks in sequence)
  const chunkTTSQueueRef = useRef<Array<{ messageId: string; audio: Blob }>>([]);
  const isPlayingChunkRef = useRef(false);

  // 🎵 Play next chunk audio from queue
  const playNextChunkAudio = useCallback(async () => {
    if (isPlayingChunkRef.current || chunkTTSQueueRef.current.length === 0) return;
    
    const { messageId, audio } = chunkTTSQueueRef.current.shift()!;
    isPlayingChunkRef.current = true;
    
    try {
      const url = URL.createObjectURL(audio);
      const newAudio = new Audio(url);
      setAudioElement(newAudio);
      setPlayingAudio(messageId);
      
      newAudio.onended = () => {
        URL.revokeObjectURL(url);
        isPlayingChunkRef.current = false;
        clearAudioSafetyTimeout(); // Clear timeout on successful completion
        setPlayingAudio(null);
        playNextChunkAudio();  // Play next queued chunk
      };
      
      await newAudio.play();
    } catch (err) {
      console.error('[CHUNK TTS] Playback failed:', err);
      isPlayingChunkRef.current = false;
      clearAudioSafetyTimeout(); // Clear timeout on error
      setPlayingAudio(null);
      playNextChunkAudio();  // Try next chunk
    }
  }, []);

  // PHASE 2: Unified WebSocket for voice + text
  const voiceTutor = useVoiceTutor({
    chatId,
    onTranscription: (text) => {
      console.log('[TutorSession] Transcription received:', text);
    },
    onTTSStart: () => {
      setPlayingAudio('tts');
    },
    onTTSEnd: () => {
      setPlayingAudio(null);
    },
    onError: (error) => {
      toast({
        title: "Voice Error",
        description: error,
        variant: "destructive"
      });
    },
    // 🎵 NEW: Per-chunk TTS generation
    onChunkReceived: async (chunk) => {
      if (!chat || chat.mode !== 'tutor') return;  // Only for tutor mode
      
      try {
        console.log('[CHUNK TTS] Generating TTS for chunk:', chunk.messageId, '- content:', chunk.content.substring(0, 50));
        
        // Generate SSML from chunk
        const cleanText = chunk.content.replace(/[🌅✅🎭]/g, '').trim();
        if (!cleanText) return;  // Skip empty chunks
        
        const ssml = `<speak>${cleanText}</speak>`;
        const persona = 'Priya';
        const language = chat?.language || 'en';
        
        // Call TTS endpoint for this chunk
        const response = await fetch('/api/tutor/optimized/session/tts-with-phonemes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            chatId, 
            ssml, 
            persona, 
            language 
          }),
        });
        
        if (!response.ok) throw new Error(`TTS failed: ${response.status}`);
        
        const ttsData = await response.json();
        const audioBuffer = Uint8Array.from(atob(ttsData.audio), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        
        // Queue for sequential playback
        chunkTTSQueueRef.current.push({ messageId: chunk.messageId, audio: audioBlob });
        console.log('[CHUNK TTS] ✅ Queued chunk audio, queue length:', chunkTTSQueueRef.current.length);
        
        // Start playing if not already playing
        if (!isPlayingChunkRef.current) {
          playNextChunkAudio();
        }
      } catch (err) {
        console.error('[CHUNK TTS] Generation failed:', err);
      }
    }
  });
  
  // 🔥 CRITICAL FIX: Connect WebSocket on mount
  useEffect(() => {
    console.log('[TutorSession] 🚀 Connecting WebSocket for chat:', chatId);
    voiceTutor.connect();
    
    return () => {
      console.log('[TutorSession] 🔌 Disconnecting WebSocket');
      voiceTutor.disconnect();
      clearAudioSafetyTimeout(); // Clear safety timeout on unmount
    };
  }, [chatId, clearAudioSafetyTimeout]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const avatarDisplayBoxRef = useRef<HTMLDivElement>(null);
  const localAvatarRef = useRef<UnityAvatarHandle>(null);
  
  // Local avatar state (same pattern as Landing.tsx)
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const { data: chat, isLoading: chatLoading } = useQuery<Chat>({
    queryKey: [`/api/chats/${chatId}`],
    enabled: !!chatId,
  });

  const { data: rawMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/chats/${chatId}/messages`],
    enabled: !!chatId,
  });

  // 🔧 FIX: Sort messages by createdAt with useMemo to avoid re-sorting on every render
  const messages = useMemo(() => {
    return [...rawMessages].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB; // Ascending order (oldest first)
    });
  }, [rawMessages]);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: tutorSession } = useQuery<{
    session: {
      id: string;
      chatId: string;
      currentPhase: string;
      progress: number;
      personaId: string;
      level: string;
      subject: string;
      topic: string;
    };
    resumeText: string;
    canResume: boolean;
  }>({
    queryKey: [`/api/tutor/optimized/session/${chatId}`],
    enabled: !!chatId,
    retry: false,
  });

  // PHASE 2: WebSocket-based text query (replaces HTTP streaming)
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      console.log('[TutorSession] Sending text query via WebSocket:', messageText);
      
      // 🔥 OPTIMISTIC UPDATE: Add user message to UI immediately
      const tempUserMessage: Message = {
        id: `temp-${crypto.randomUUID()}`, // ✅ Use UUID instead of Date.now() to prevent collisions
        chatId: chatId,
        role: 'user',
        content: messageText.trim(),
        createdAt: new Date(),
        tool: null,
        metadata: null,
      };
      
      queryClient.setQueryData<Message[]>(
        [`/api/chats/${chatId}/messages`],
        (old) => [...(old || []), tempUserMessage]
      );
      
      // Send via WebSocket instead of HTTP
      const success = voiceTutor.sendTextQuery(messageText, chat?.language as 'hi' | 'en' | undefined);
      
      if (!success) {
        throw new Error('WebSocket not connected');
      }
      
      // Wait a bit for response to start (WebSocket is async)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true };
    },
    onSuccess: () => {
      setMessage("");
      // 📝 Invalidate queries to refresh messages - streaming response will clear after
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tutor/optimized/session/${chatId}`] });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Quick action intent mutation
  const quickActionMutation = useMutation({
    mutationFn: async (intent: 'doubt' | 'explain' | 'test') => {
      const response = await apiRequest("POST", "/api/tutor/optimized/intent", {
        intent,
        chatId,
        language: chat?.language || 'en',
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Send the generated message via WebSocket
      sendMessageMutation.mutate(data.messageText);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process quick action. Please try again.",
        variant: "destructive",
      });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', chat?.language || 'en');

      const response = await fetch('/api/tutor/transcribe', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const transcript = data.transcript;
      if (transcript && transcript.trim()) {
        const tempUserMessage: Message = {
          id: `temp-${crypto.randomUUID()}`, // ✅ Use UUID instead of Date.now() to prevent collisions
          chatId: chatId,
          role: 'user',
          content: transcript.trim(),
          createdAt: new Date(),
          tool: null,
          metadata: null,
        };
        
        queryClient.setQueryData<Message[]>(
          [`/api/chats/${chatId}/messages`],
          (old = []) => [...old, tempUserMessage]
        );
        
        sendMessageMutation.mutate(transcript.trim());
      }
    },
    onError: () => {
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe your voice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        transcribeMutation.mutate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // 📹 Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      setCameraStream(stream);
      
      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      toast({
        title: "Camera Started",
        description: "Your camera is now active"
      });
    } catch (err) {
      console.error('[CAMERA] Failed to start:', err);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      console.log('[CAMERA] Stopped camera stream');
    }
  };

  // Handle camera toggle
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        console.log('[CAMERA] Cleanup on unmount');
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Attach stream to video element when stream changes
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      console.log('[CAMERA] Attaching stream to video element');
      videoRef.current.srcObject = cameraStream;
      // Play the video explicitly
      videoRef.current.play().catch(err => {
        console.warn('[CAMERA] Video play failed:', err);
      });
    }
  }, [cameraStream]);

  const playAudio = async (messageId: string, text: string) => {
    console.log('[TTS] playAudio called for message:', messageId);
    
    if (playingAudio === messageId && audioElement) {
      console.log('[TTS] Muting/stopping currently playing audio');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      clearAudioSafetyTimeout(); // Clear timeout when user cancels playback
      setPlayingAudio(null);
      setAudioElement(null);
      return;
    }

    if (audioElement) {
      console.log('[TTS] Stopping other playing audio');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      clearAudioSafetyTimeout(); // Clear timeout when stopping other audio
      setPlayingAudio(null);
      setAudioElement(null);
    }

    try {
      console.log('[TTS] Setting playing audio to:', messageId);
      setPlayingAudio(messageId);

      console.log('[TTS] 🚀 CODE VERSION: 2025-10-09-PHONEME-FINAL 🚀');
      console.log('[TTS] Fetching emotion-based TTS for text:', text.substring(0, 50) + '...');
      
      // 🎯 CRITICAL: Reliable tutor session detection (use tutorSession data, not chat!)
      // tutorSession comes from useTutorSessionData hook - more reliable than chat
      const isOptimizedSession = !!tutorSession || chat?.mode === 'tutor';
      console.log('[TTS] tutorSession exists:', !!tutorSession, 'chat.mode:', chat?.mode, 'isOptimizedSession:', isOptimizedSession);
      
      // 🎯 ALWAYS use phoneme endpoint for tutor mode
      const usePhonemeTTS = isOptimizedSession;
      const ttsEndpoint = usePhonemeTTS
        ? '/api/tutor/optimized/session/tts-with-phonemes'
        : '/api/tutor/tts';
      console.log('[TTS] Endpoint:', ttsEndpoint);
      
      const requestBody = isOptimizedSession
        ? { chatId, text }
        : { text: text, voice: 'nova' };

      const response = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('[TTS] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to generate speech: ${response.status}`);
      }

      // 🎯 Handle phoneme-based response (JSON) vs regular audio (blob)
      let audioBlob: Blob;
      let phonemes: Array<{time: number; blendshape: string; weight: number}> = [];
      
      if (usePhonemeTTS) {
        // Phoneme-based TTS returns JSON
        const ttsData = await response.json();
        console.log('[TTS] Phoneme data received - Phonemes:', ttsData.phonemes?.length || 0, 'Audio base64 length:', ttsData.audio?.length || 0);
        
        // Convert base64 audio to blob (🎯 FIX: Polly returns MP3, not WAV)
        const audioBuffer = Uint8Array.from(atob(ttsData.audio), c => c.charCodeAt(0));
        audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' }); // Correct MIME type for Polly MP3
        phonemes = ttsData.phonemes || [];
        
        console.log('[TTS] Converted to blob, size:', audioBlob.size);
      } else {
        // Regular TTS returns audio blob
        audioBlob = await response.blob();
        console.log('[TTS] Audio blob received, size:', audioBlob.size, 'type:', audioBlob.type);
      }
      
      // 🎭 AVATAR: Check if Unity is ready OR loading (wait if loading)
      const currentAvatarReady = localAvatarRef.current?.isReady || false;
      const isAvatarStillLoading = avatarLoading && !currentAvatarReady;
      
      console.log('[Avatar] Status check - Ready:', currentAvatarReady, 'Loading:', isAvatarStillLoading);
      
      // 🎭 AVATAR: If Unity is loading, wait up to 5 seconds for it to be ready
      if (isAvatarStillLoading && localAvatarRef.current) {
        console.log('[Avatar] ⏳ Unity loading... waiting for it to be ready (max 5s)');
        
        const waitForUnity = new Promise<boolean>((resolve) => {
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            const isNowReady = localAvatarRef.current?.isReady || false;
            const elapsed = Date.now() - startTime;
            
            if (isNowReady) {
              clearInterval(checkInterval);
              console.log('[Avatar] ✅ Unity ready after', elapsed, 'ms');
              resolve(true);
            } else if (elapsed > 5000) {
              clearInterval(checkInterval);
              console.log('[Avatar] ⏱️ Timeout waiting for Unity (5s) - using browser fallback');
              resolve(false);
            }
          }, 100); // Check every 100ms
        });
        
        const unityBecameReady = await waitForUnity;
        
        if (unityBecameReady && localAvatarRef.current) {
          console.log('[Avatar] ✅ Unity ready - sending audio with lip-sync');
          try {
            // 🎯 Use phoneme-based method if phonemes available
            if (phonemes.length > 0 && usePhonemeTTS) {
              console.log('[Avatar] 🎵 Sending phoneme-based lip-sync - Phonemes:', phonemes.length);
              // Convert blob to base64 for phoneme method
              const audioBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.readAsDataURL(audioBlob);
              });
              localAvatarRef.current.sendAudioWithPhonemesToAvatar(audioBase64, phonemes, messageId);
            } else {
              console.log('[Avatar] 🔊 Sending amplitude-based lip-sync (no phonemes)');
              await localAvatarRef.current.sendAudioToAvatar(audioBlob);
            }
            console.log('[Avatar] ✅ Audio sent to Unity successfully - keeping playingAudio active until Unity confirms completion');
            // DON'T clear playingAudio here - wait for AUDIO_ENDED from Unity
            startAudioSafetyTimeout(); // Safety: timeout if Unity never responds
            return; // Exit early - Unity plays the audio
          } catch (avatarError) {
            console.error('[Avatar] ❌ Failed to send audio:', avatarError);
            console.warn('[Avatar] ⚠️ Falling back to browser audio');
            clearAudioSafetyTimeout(); // Clear Unity timeout before browser fallback
          }
        }
      }
      
      // 🎭 AVATAR: If Unity is already ready, send immediately
      if (currentAvatarReady && localAvatarRef.current) {
        console.log('[Avatar] ✅ Avatar ready - sending audio to Unity WebGL with lip-sync');
        console.log('[Avatar] 🔇 Skipping browser audio - Unity will play with lip-sync');
        
        // 🔍 DEBUG: Force visible alert to verify execution
        console.log('🔍 DEBUG: Phonemes count:', phonemes.length, 'usePhonemeTTS:', usePhonemeTTS);
        
        try {
          // 🎯 Use phoneme-based method if phonemes available
          if (phonemes.length > 0 && usePhonemeTTS) {
            console.log('[Avatar] 🎵 Sending phoneme-based lip-sync - Phonemes:', phonemes.length);
            console.log('🔍 DEBUG: About to send', phonemes.length, 'phonemes to Unity');
            
            // Convert blob to base64 for phoneme method
            const audioBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
              reader.readAsDataURL(audioBlob);
            });
            
            console.log('🔍 DEBUG: Base64 audio length:', audioBase64.length);
            console.log('🔍 DEBUG: Calling sendAudioWithPhonemesToAvatar...');
            
            localAvatarRef.current.sendAudioWithPhonemesToAvatar(audioBase64, phonemes, messageId);
            
            console.log('🔍 DEBUG: ✅ sendAudioWithPhonemesToAvatar called successfully!');
          } else {
            console.log('[Avatar] 🔊 Sending amplitude-based lip-sync (no phonemes)');
            console.log('🔍 DEBUG: No phonemes, using amplitude method');
            await localAvatarRef.current.sendAudioToAvatar(audioBlob);
          }
          console.log('[Avatar] ✅ Audio sent to Unity successfully - keeping playingAudio active until Unity confirms completion');
          // DON'T clear playingAudio here - wait for AUDIO_ENDED from Unity
          startAudioSafetyTimeout(); // Safety: timeout if Unity never responds
          return; // Exit early - Unity plays the audio
        } catch (avatarError) {
          console.error('[Avatar] ❌ Failed to send audio to avatar:', avatarError);
          console.warn('[Avatar] ⚠️ Falling back to browser audio playback');
          clearAudioSafetyTimeout(); // Clear Unity timeout before browser fallback
        }
      } else {
        console.log('[Avatar] Avatar not ready - using browser audio playback');
        console.log('🔍 DEBUG: currentAvatarReady:', currentAvatarReady, 'localAvatarRef exists:', !!localAvatarRef.current);
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[TTS] Audio URL created:', audioUrl);
      
      const audio = new Audio(audioUrl);
      console.log('[TTS] Audio element created');
      
      // Add load event handlers
      audio.onloadstart = () => console.log('[TTS] Audio loading started');
      audio.onloadedmetadata = () => {
        console.log('[TTS] Audio metadata loaded');
        console.log('[TTS] Duration:', audio.duration);
        console.log('[TTS] Audio type:', audioBlob.type);
      };
      audio.oncanplay = () => console.log('[TTS] Audio can start playing');
      audio.oncanplaythrough = () => console.log('[TTS] Audio can play through without buffering');

      audio.onended = () => {
        console.log('[TTS] Browser audio playback ended');
        clearAudioSafetyTimeout(); // Clear timeout on successful completion
        setPlayingAudio(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('[TTS] Audio playback error event:', e);
        
        // Get detailed error information from audio element
        const mediaError = audio.error;
        let errorDetails = 'Unknown error';
        let errorCode = 'UNKNOWN';
        
        if (mediaError) {
          errorCode = mediaError.code.toString();
          switch (mediaError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorDetails = 'Audio loading aborted by user';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorDetails = 'Network error while loading audio';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorDetails = 'Audio decoding failed - format may be unsupported or corrupt';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorDetails = 'Audio format not supported by browser';
              break;
            default:
              errorDetails = mediaError.message || 'Unknown media error';
          }
          console.error('[TTS] Media Error Code:', mediaError.code);
          console.error('[TTS] Media Error Message:', mediaError.message);
          console.error('[TTS] Error Details:', errorDetails);
        }
        
        console.error('[TTS] Audio src:', audio.src);
        console.error('[TTS] Audio readyState:', audio.readyState);
        console.error('[TTS] Audio networkState:', audio.networkState);
        
        clearAudioSafetyTimeout(); // Clear timeout on error
        setPlayingAudio(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
        
        toast({
          title: "Audio Playback Error",
          description: `${errorDetails} (Code: ${errorCode})`,
          variant: "destructive",
        });
      };

      setAudioElement(audio);
      console.log('[TTS] Attempting to play audio...');
      
      await audio.play();
      console.log('[TTS] Audio play() successful');
    } catch (error: any) {
      console.error('[TTS] Error in playAudio:', error);
      clearAudioSafetyTimeout(); // Clear timeout on error
      setPlayingAudio(null);
      setAudioElement(null);
      
      if (error.name === 'NotAllowedError') {
        console.log('[TTS] Audio autoplay blocked by browser policy');
        toast({
          title: "Audio Blocked",
          description: "Please interact with the page first to enable audio playback.",
          variant: "default",
        });
      } else {
        toast({
          title: "Speech Generation Failed",
          description: error.message || "Could not generate speech. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const playSSMLAudio = async (messageId: string, ssml: string, persona: string, language: string) => {
    console.log('[TTS SSML] playSSMLAudio called for message:', messageId);
    
    if (playingAudio === messageId && audioElement) {
      console.log('[TTS SSML] Stopping currently playing audio');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      clearAudioSafetyTimeout(); // Clear timeout when user cancels playback
      setPlayingAudio(null);
      setAudioElement(null);
      return;
    }

    if (audioElement) {
      console.log('[TTS SSML] Stopping other playing audio');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      clearAudioSafetyTimeout(); // Clear timeout when stopping other audio
      setPlayingAudio(null);
      setAudioElement(null);
    }

    try {
      console.log('[TTS SSML] Setting playing audio to:', messageId);
      setPlayingAudio(messageId);

      // Get chatId from chat.id or tutorSession or prop
      const sessionChatId = chat?.id || tutorSession?.session?.chatId || chatId;
      if (!sessionChatId) {
        throw new Error('Chat ID not available');
      }

      console.log('[TTS SSML] Fetching SSML-based TTS - ChatId:', sessionChatId, 'SSML length:', ssml.length, 'Persona:', persona, 'Language:', language);
      
      const requestBody = { chatId: sessionChatId, ssml, persona, language };
      console.log('[TTS SSML] 🔍 REQUEST BODY:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/tutor/optimized/session/tts-with-phonemes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('[TTS SSML] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to generate speech from SSML: ${response.status}`);
      }

      const ttsData = await response.json();
      console.log('[TTS SSML] Received - Phonemes:', ttsData.phonemes?.length || 0, 'Audio base64 length:', ttsData.audio?.length || 0);
      
      const audioBuffer = Uint8Array.from(atob(ttsData.audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const phonemes = ttsData.phonemes || [];
      
      console.log('[TTS SSML] Converted to blob, size:', audioBlob.size);
      
      const currentAvatarReady = localAvatarRef.current?.isReady || false;
      const isAvatarStillLoading = avatarLoading && !currentAvatarReady;
      
      console.log('[Avatar] Status check - Ready:', currentAvatarReady, 'Loading:', isAvatarStillLoading);
      
      if (isAvatarStillLoading && localAvatarRef.current) {
        console.log('[Avatar] ⏳ Unity loading... waiting for it to be ready (max 5s)');
        
        const waitForUnity = new Promise<boolean>((resolve) => {
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            const isNowReady = localAvatarRef.current?.isReady || false;
            const elapsed = Date.now() - startTime;
            
            if (isNowReady) {
              clearInterval(checkInterval);
              console.log('[Avatar] ✅ Unity ready after', elapsed, 'ms');
              resolve(true);
            } else if (elapsed > 5000) {
              clearInterval(checkInterval);
              console.log('[Avatar] ⏱️ Timeout waiting for Unity (5s) - using browser fallback');
              resolve(false);
            }
          }, 100);
        });
        
        const unityBecameReady = await waitForUnity;
        
        if (unityBecameReady && localAvatarRef.current) {
          console.log('[Avatar] ✅ Unity ready - sending SSML audio with lip-sync');
          try {
            if (phonemes.length > 0) {
              console.log('[Avatar] 🎵 Sending SSML phoneme-based lip-sync - Phonemes:', phonemes.length);
              
              // 🎯 CRITICAL FIX: Adjust phoneme timestamps for Unity audio delay
              // Unity WebGL audio has ~150-200ms initialization delay on low-end devices
              const UNITY_AUDIO_START_OFFSET_MS = 180;
              const adjustedPhonemes = phonemes.map((p: any) => ({
                ...p,
                time: Math.max(0, p.time - UNITY_AUDIO_START_OFFSET_MS)
              }));
              console.log('[Avatar] 🎯 Phoneme timestamps PRE-ADJUSTED for Unity delay:', {
                originalFirst: phonemes[0]?.time || 0,
                adjustedFirst: adjustedPhonemes[0]?.time || 0,
                fixedOffset: UNITY_AUDIO_START_OFFSET_MS
              });
              
              const audioBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.readAsDataURL(audioBlob);
              });
              localAvatarRef.current.sendAudioWithPhonemesToAvatar(audioBase64, adjustedPhonemes, messageId);
            } else {
              console.log('[Avatar] 🔊 Sending amplitude-based lip-sync (no phonemes)');
              await localAvatarRef.current.sendAudioToAvatar(audioBlob);
            }
            console.log('[Avatar] ✅ SSML audio sent to Unity successfully - keeping playingAudio active until Unity confirms completion');
            // DON'T clear playingAudio here - wait for AUDIO_ENDED from Unity
            startAudioSafetyTimeout(); // Safety: timeout if Unity never responds
            return;
          } catch (avatarError) {
            console.error('[Avatar] ❌ Failed to send SSML audio:', avatarError);
            console.warn('[Avatar] ⚠️ Falling back to browser audio');
            clearAudioSafetyTimeout(); // Clear Unity timeout before browser fallback
          }
        }
      }
      
      if (currentAvatarReady && localAvatarRef.current) {
        console.log('[Avatar] ✅ Avatar ready - sending SSML audio to Unity WebGL with lip-sync');
        
        try {
          if (phonemes.length > 0) {
            console.log('[Avatar] 🎵 Sending SSML phoneme-based lip-sync - Phonemes:', phonemes.length);
            
            // 🎯 CRITICAL FIX: Adjust phoneme timestamps for Unity audio delay
            // Unity WebGL audio has ~150-200ms initialization delay on low-end devices
            const UNITY_AUDIO_START_OFFSET_MS = 180;
            const adjustedPhonemes = phonemes.map((p: any) => ({
              ...p,
              time: Math.max(0, p.time - UNITY_AUDIO_START_OFFSET_MS)
            }));
            console.log('[Avatar] 🎯 Phoneme timestamps PRE-ADJUSTED for Unity delay:', {
              originalFirst: phonemes[0]?.time || 0,
              adjustedFirst: adjustedPhonemes[0]?.time || 0,
              fixedOffset: UNITY_AUDIO_START_OFFSET_MS
            });
            
            const audioBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
              reader.readAsDataURL(audioBlob);
            });
            localAvatarRef.current.sendAudioWithPhonemesToAvatar(audioBase64, adjustedPhonemes, messageId);
          } else {
            console.log('[Avatar] 🔊 Sending amplitude-based lip-sync (no phonemes)');
            await localAvatarRef.current.sendAudioToAvatar(audioBlob);
          }
          console.log('[Avatar] ✅ SSML audio sent to Unity successfully - keeping playingAudio active until Unity confirms completion');
          // DON'T clear playingAudio here - wait for AUDIO_ENDED from Unity
          startAudioSafetyTimeout(); // Safety: timeout if Unity never responds
          return;
        } catch (avatarError) {
          console.error('[Avatar] ❌ Failed to send SSML audio:', avatarError);
          console.warn('[Avatar] ⚠️ Falling back to browser audio');
          clearAudioSafetyTimeout(); // Clear Unity timeout before browser fallback
        }
      }
      
      console.log('[TTS SSML] 🔊 Using browser fallback audio player');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log('[TTS SSML] Browser audio playback ended');
        clearAudioSafetyTimeout(); // Clear timeout on successful completion
        setPlayingAudio(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (e) => {
        console.error('[TTS SSML] Browser audio error:', e);
        const mediaError = audio.error;
        let errorCode = 'UNKNOWN';
        let errorDetails = 'Unknown audio error';
        
        if (mediaError) {
          switch (mediaError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorCode = 'MEDIA_ERR_ABORTED';
              errorDetails = 'Audio playback was aborted';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorCode = 'MEDIA_ERR_NETWORK';
              errorDetails = 'Network error while loading audio';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorCode = 'MEDIA_ERR_DECODE';
              errorDetails = 'Audio decoding failed - format may be unsupported or corrupt';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorCode = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
              errorDetails = 'Audio format not supported by browser';
              break;
            default:
              errorDetails = mediaError.message || 'Unknown media error';
          }
        }
        
        clearAudioSafetyTimeout(); // Clear timeout on error
        setPlayingAudio(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
        
        toast({
          title: "Audio Playback Error",
          description: `${errorDetails} (Code: ${errorCode})`,
          variant: "destructive",
        });
      };

      setAudioElement(audio);
      console.log('[TTS SSML] Attempting to play audio...');
      
      await audio.play();
      console.log('[TTS SSML] Audio play() successful');
    } catch (error: any) {
      console.error('[TTS SSML] Error in playSSMLAudio:', error);
      clearAudioSafetyTimeout(); // Clear timeout on error
      setPlayingAudio(null);
      setAudioElement(null);
      
      if (error.name === 'NotAllowedError') {
        console.log('[TTS SSML] Audio autoplay blocked by browser policy');
        toast({
          title: "Audio Blocked",
          description: "Please interact with the page first to enable audio playback.",
          variant: "default",
        });
      } else {
        toast({
          title: "Speech Generation Failed",
          description: error.message || "Could not generate speech from SSML. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, voiceTutor.transcription, voiceTutor.isProcessing, transcribeMutation.isPending]);

  // PHASE 2: Sync isStreaming with voiceTutor.isProcessing
  useEffect(() => {
    setIsStreaming(voiceTutor.isProcessing);
  }, [voiceTutor.isProcessing]);
  
  // 📝 Clear streaming response IMMEDIATELY when NEW assistant message appears (no race condition)
  const lastAssistantIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Find most recent assistant message
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    
    // 🔥 FIX: Clear streaming response IMMEDIATELY when new DB message appears
    // Don't wait for isProcessing=false to avoid duplicates
    if (voiceTutor.streamingResponse && lastAssistant) {
      // Check if content matches (to prevent clearing wrong streaming response)
      const streamingStart = voiceTutor.streamingResponse.substring(0, 50).trim();
      const messageStart = lastAssistant.content.substring(0, 50).trim();
      
      // If this DB message matches current streaming response, clear it
      if (streamingStart && messageStart && messageStart.includes(streamingStart.substring(0, 20))) {
        console.log(`[STREAMING] ✅ Matching DB message found, clearing streaming response to prevent duplicate`);
        voiceTutor.clearStreamingResponse();
        lastAssistantIdRef.current = lastAssistant.id;
      }
      // Or if it's a new message ID (different from last tracked)
      else if (lastAssistantIdRef.current !== lastAssistant.id) {
        console.log(`[STREAMING] ✅ New assistant message detected (${lastAssistant.id}), clearing streaming response`);
        lastAssistantIdRef.current = lastAssistant.id;
        voiceTutor.clearStreamingResponse();
      }
    }
    
    // Update tracking even if not clearing (for next message)
    if (lastAssistant && lastAssistantIdRef.current !== lastAssistant.id) {
      lastAssistantIdRef.current = lastAssistant.id;
    }
  }, [messages, voiceTutor.streamingResponse, voiceTutor]);

  const lastPlayedRef = useRef<string | null>(null);
  const ttsDebounceRef = useRef<NodeJS.Timeout | null>(null);  // 🔥 Prevent TTS duplicate calls
  const [avatarViewState, setAvatarViewState] = useState<'minimized' | 'half' | 'fullscreen' | 'fullscreen-chat'>('fullscreen'); // 🆕 Avatar visible by default for TTS auto-play

  // 🔧 FIX: Clear lastPlayedRef when chatId changes or component unmounts
  useEffect(() => {
    console.log('[TTS] 🧹 Chat changed, clearing lastPlayedRef');
    lastPlayedRef.current = null;
    
    // 🔥 Clear pending TTS debounce
    if (ttsDebounceRef.current) {
      clearTimeout(ttsDebounceRef.current);
      ttsDebounceRef.current = null;
    }
    
    return () => {
      console.log('[TTS] 🧹 Component unmounting, clearing lastPlayedRef');
      lastPlayedRef.current = null;
      if (ttsDebounceRef.current) {
        clearTimeout(ttsDebounceRef.current);
        ttsDebounceRef.current = null;
      }
    };
  }, [chatId]);

  // 🔧 FIX: Stop audio when avatar closes
  const stopAudioPlayback = useCallback(() => {
    console.log('[TTS] 🛑 Stopping all audio playback');
    
    // Stop browser audio
    if (audioElement) {
      console.log('[TTS] 🛑 Stopping browser audio element');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      setAudioElement(null);
      setPlayingAudio(null);
    }
    
    // Stop Unity audio
    if (localAvatarRef.current?.stopAudio) {
      console.log('[TTS] 🛑 Stopping Unity avatar audio');
      localAvatarRef.current.stopAudio();
    }
  }, [audioElement, localAvatarRef]);

  // 🔧 FIX: Stop audio when avatar minimizes
  useEffect(() => {
    if (avatarViewState === 'minimized') {
      console.log('[TTS] 🛑 Avatar minimized - stopping audio');
      stopAudioPlayback();
    }
  }, [avatarViewState, stopAudioPlayback]);

  useEffect(() => {
    // 🎯 CRITICAL: Auto-play TTS ONLY when avatar is VISIBLE (not minimized)
    const isAvatarVisible = avatarViewState !== 'minimized';

    if (messages.length === 0 || !chat) {
      return; // No messages or chat yet
    }

    const lastMessage = messages[messages.length - 1];

    // Debug logging
    console.log('[TTS AUTO-PLAY] Checking conditions:', {
      messageCount: messages.length,
      lastMessageRole: lastMessage.role,
      lastMessageId: lastMessage.id,
      alreadyPlayed: lastPlayedRef.current,
      avatarReady: avatarReady,
      avatarVisible: isAvatarVisible,
      streaming: isStreaming
    });

    // Skip if not an assistant message or already played
    if (lastMessage.role !== 'assistant' || lastMessage.id === lastPlayedRef.current) {
      return;
    }

    // Skip if streaming in progress
    if (isStreaming) {
      console.log('[TTS AUTO-PLAY] ⏳ Streaming in progress, waiting...');
      return;
    }

    // Check avatar state
    if (!avatarReady) {
      console.log('[TTS AUTO-PLAY] ⏳ Avatar not ready yet, will auto-play when ready...');
      return;
    }

    if (!isAvatarVisible) {
      console.log('[TTS AUTO-PLAY] ⏳ Avatar minimized, will auto-play when opened...');
      return;
    }

    // 🔥 All conditions met - use debounced auto-play to prevent duplicates
    console.log('[TTS AUTO-PLAY] ✅ All conditions met - Auto-playing:', lastMessage.id);
    console.log('[TTS AUTO-PLAY] Chat mode:', chat.mode, '- Will use', chat.mode === 'tutor' ? 'PHONEME' : 'REGULAR', 'TTS');
    
    // 🔥 Clear any pending TTS debounce
    if (ttsDebounceRef.current) {
      clearTimeout(ttsDebounceRef.current);
    }
    
    // Mark as played immediately to prevent effect re-runs
    lastPlayedRef.current = lastMessage.id;

    // Debounce the actual TTS call by 100ms to prevent duplicates
    ttsDebounceRef.current = setTimeout(() => {
      // 🎯 Use SSML-based TTS if available (for tutor mode with phonemes)
      const ssml = (lastMessage.metadata as any)?.speakSSML;
      if (ssml) {
        const persona = (lastMessage.metadata as any)?.speakMeta?.persona || tutorSession?.session?.personaId || 'Priya';
        const language = (lastMessage.metadata as any)?.speakMeta?.language || chat?.language || 'en';
        console.log('[TTS AUTO-PLAY] Using SSML with phonemes - persona:', persona, 'lang:', language);
        playSSMLAudio(lastMessage.id, ssml, persona, language).catch((err) => {
          console.error('[TTS AUTO-PLAY] ❌ Playback failed:', err);
          console.log('[TTS AUTO-PLAY] User can click speaker icon manually');
        });
      } else {
        console.log('[TTS AUTO-PLAY] No SSML metadata, using fallback text TTS');
        playAudio(lastMessage.id, lastMessage.content).catch((err) => {
          console.error('[TTS AUTO-PLAY] ❌ Playback failed:', err);
          console.log('[TTS AUTO-PLAY] User can click speaker icon manually');
        });
      }
    }, 100);
    
    return () => {
      if (ttsDebounceRef.current) {
        clearTimeout(ttsDebounceRef.current);
      }
    };
  }, [messages, isStreaming, chat, avatarReady, avatarViewState, playSSMLAudio, playAudio, tutorSession?.session?.personaId]); // 🆕 Added avatarViewState dependency

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isStreaming) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleQuickToolSubmit = async (toolType: ToolType, formData: any) => {
    if (!chat) return;

    setToolStreaming(true);
    setToolStreamingContent("");

    try {
      const response = await fetch('/api/tutor/quick-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: chatId,
          toolType,
          subject: chat.subject,
          level: chat.level,
          topic: chat.topic,
          ...formData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute quick tool');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const lines = event.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk') {
                  fullContent += data.content;
                  setToolStreamingContent(fullContent);
                } else if (data.type === 'complete') {
                  fullContent = data.content;
                  setToolStreamingContent(fullContent);
                } else if (data.type === 'done') {
                  setToolStreaming(false);
                  queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
                  toast({
                    title: "Generated Successfully",
                    description: "Quick tool result has been added to the chat",
                  });
                  setTimeout(() => {
                    setActiveToolModal(null);
                    setToolStreamingContent("");
                  }, 1500);
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', line, parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Quick tool error:', error);
      setToolStreaming(false);
      toast({
        title: "Error",
        description: "Failed to execute quick tool. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Session timer state - calculate from chat metadata
  // IMPORTANT: All hooks must be called BEFORE any early returns!
  const sessionStartTime = useMemo(() => {
    const metadata = chat?.metadata as any;
    if (metadata?.sessionStartTime) {
      return new Date(metadata.sessionStartTime);
    }
    return new Date(); // Fallback to now
  }, [chat?.metadata]);

  const [sessionTime, setSessionTime] = useState(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
    return Math.max(0, elapsed);
  });

  // Learning mode from chat metadata - state for UI interaction
  const [lectureMode, setLectureMode] = useState(true);

  // Sync lectureMode with chat metadata when it loads
  useEffect(() => {
    if (chat?.metadata) {
      const metadata = chat.metadata as any;
      const savedMode = metadata.learningMode || 'lecture';
      setLectureMode(savedMode === 'lecture');
    }
  }, [chat?.metadata]);

  // Session timer effect - real-time counting
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      setSessionTime(Math.max(0, elapsed));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Initialize session metadata on first load
  useEffect(() => {
    if (chat && !chat.metadata) {
      // Set initial metadata with sessionStartTime
      apiRequest('PATCH', `/api/chats/${chatId}`, {
        metadata: {
          sessionStartTime: new Date().toISOString(),
          learningMode: 'lecture'
        }
      }).catch(err => console.error('Failed to initialize session metadata:', err));
    }
  }, [chat, chatId]);

  // Handle avatar ready event (same pattern as Landing.tsx)
  const handleAvatarReady = () => {
    console.log('[TutorSession] ✅ Avatar ready!');
    setAvatarReady(true);
    setAvatarLoading(false);
  };

  const handleAvatarError = (error: string) => {
    console.error('[TutorSession] ❌ Avatar error:', error);
    setAvatarError(error);
    setAvatarLoading(false);
  };

  // Update learning mode in backend
  const updateLearningMode = async (mode: 'lecture' | 'practice') => {
    try {
      await apiRequest('PATCH', `/api/chats/${chatId}`, {
        metadata: {
          ...(chat?.metadata as any || {}),
          learningMode: mode
        }
      });
      setLectureMode(mode === 'lecture');
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
    } catch (err) {
      console.error('Failed to update learning mode:', err);
      toast({
        title: "Error",
        description: "Failed to update learning mode",
        variant: "destructive"
      });
    }
  };

  // Early returns AFTER all hooks
  if (chatLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className={`relative flex flex-col min-h-0 ${
          showChatPanel ? 'flex-1 lg:flex-[0_0_58%]' : 'flex-1'
        }`}>
          <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 bg-black/20 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${
                chat.subject?.toLowerCase() === 'physics' ? 'from-blue-500 to-cyan-500' :
                chat.subject?.toLowerCase() === 'chemistry' ? 'from-green-500 to-emerald-500' :
                chat.subject?.toLowerCase() === 'mathematics' ? 'from-purple-500 to-pink-500' :
                'from-orange-500 to-amber-500'
              } text-white shadow-lg`}>
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-xs lg:text-sm font-semibold capitalize">{chat.subject || 'Subject'}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80">
                <Brain className="w-3.5 h-3.5" />
                <span className="text-xs lg:text-sm font-medium truncate max-w-[150px]">{chat.topic || 'Topic'}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white/60">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{formatTime(sessionTime)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white/5 border border-white/10">
              <Button
                variant="ghost"
                size="icon"
                className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full transition-all ${
                  showChatPanel ? 'bg-blue-500/30 text-blue-300' : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setShowChatPanel(!showChatPanel)}
                data-testid="button-chat-toggle"
              >
                {showChatPanel ? <MessageSquare className="w-4 h-4" /> : <MessageSquareOff className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full transition-all ${
                  !isMuted ? 'bg-blue-500/30 text-blue-300' : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setIsMuted(!isMuted)}
                data-testid="button-speaker-toggle"
              >
                {!isMuted ? <Volume2 className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full transition-all ${
                  showCamera ? 'bg-blue-500/30 text-blue-300' : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setShowCamera(!showCamera)}
                data-testid="button-video-toggle"
              >
                {showCamera ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              <Separator orientation="vertical" className="h-5 bg-white/10 mx-0.5" />
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
                onClick={onEndSession}
                data-testid="button-close-session"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-2 lg:p-6 relative">
            <div 
              ref={avatarDisplayBoxRef}
              className="relative w-full h-full max-w-5xl rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
              
              {avatarLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                  <div className="text-center px-4">
                    <div className="relative w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-purple-500/30" />
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                      <Loader2 className="absolute inset-0 m-auto w-6 h-6 lg:w-8 lg:h-8 text-purple-400 animate-pulse" />
                    </div>
                    <p className="text-white/90 text-sm lg:text-base font-medium">Loading Garima...</p>
                    <p className="text-white/50 text-xs lg:text-sm mt-1">Preparing your AI mentor</p>
                  </div>
                </div>
              )}
              
              {avatarError && !avatarLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                  <div className="text-center px-4">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertCircle className="w-7 h-7 lg:w-8 lg:h-8 text-amber-400" />
                    </div>
                    <p className="text-white/90 text-sm lg:text-base font-medium">Avatar Unavailable</p>
                    <p className="text-white/50 text-xs lg:text-sm mt-1 max-w-xs">{avatarError}</p>
                  </div>
                </div>
              )}
              
              <UnityAvatar
                ref={localAvatarRef}
                className="w-full h-full"
                defaultAvatar="priya"
                onReady={handleAvatarReady}
                onError={handleAvatarError}
                onMessage={(msg) => {
                  if (msg.type === 'AUDIO_ENDED') {
                    console.log('[TTS] Unity audio playback ended:', msg.id);
                    clearAudioSafetyTimeout();
                    setPlayingAudio(null);
                  } else if (msg.type === 'AUDIO_FAILED') {
                    console.error('[TTS] Unity audio playback failed:', msg.error);
                    clearAudioSafetyTimeout();
                    setPlayingAudio(null);
                  }
                }}
              />
              
              {playingAudio && (
                <div className="absolute top-3 right-3 lg:top-4 lg:right-4 z-30">
                  <div className="px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full backdrop-blur-md border flex items-center gap-1.5 lg:gap-2 bg-blue-500/20 border-blue-400/30">
                    <div className="flex items-center gap-0.5">
                      <span className="w-0.5 lg:w-1 h-2 lg:h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-0.5 lg:w-1 h-3 lg:h-4 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 lg:w-1 h-2 lg:h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] lg:text-xs font-medium text-blue-300">Speaking</span>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 lg:bottom-4 z-30">
                  <div className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-full bg-red-500/20 backdrop-blur-md border border-red-400/30 flex items-center gap-2">
                    <div className="relative">
                      <Mic className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-red-400" />
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 lg:w-2 h-1.5 lg:h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <span className="text-xs lg:text-sm font-medium text-red-300">Listening...</span>
                  </div>
                </div>
              )}

              {showCamera && cameraStream && (
                <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-30">
                  <div className="w-28 h-20 lg:w-36 lg:h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-white/30 bg-slate-800/50 backdrop-blur-md">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid="video-camera-feed" />
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:bottom-6 z-30">
                <div className="flex items-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 p-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`rounded-full px-3 lg:px-4 h-8 text-xs font-medium transition-all ${
                      lectureMode
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => updateLearningMode('lecture')}
                    data-testid="button-mode-lecture"
                  >
                    <BookOpen className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1 lg:mr-1.5" />
                    Lecture
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`rounded-full px-3 lg:px-4 h-8 text-xs font-medium transition-all ${
                      !lectureMode
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => updateLearningMode('practice')}
                    data-testid="button-mode-practice"
                  >
                    <Brain className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1 lg:mr-1.5" />
                    Practice
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showChatPanel && (
          <div className="flex-[0_0_40%] lg:flex-[0_0_42%] flex flex-col bg-slate-900/50 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-white/5 min-h-[200px] max-h-[40vh] lg:max-h-none overflow-hidden">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 lg:px-5 lg:py-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 lg:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' ? (
                    <div className="flex-shrink-0 w-7 h-7 lg:w-9 lg:h-9 rounded-full overflow-hidden ring-2 ring-purple-400/50 shadow-lg">
                      <img src={mentorAvatar} alt="Garima" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <User className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                    </div>
                  )}
                  <div className={`group max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 lg:px-4 lg:py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md'
                        : 'bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 rounded-bl-md'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm prose-invert max-w-none text-sm lg:text-base leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm lg:text-base leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6 lg:w-7 lg:h-7 rounded-full text-white/40 hover:text-white hover:bg-white/10"
                          onClick={() => {
                            const ssml = (msg.metadata as any)?.speakSSML;
                            if (ssml) {
                              const persona = (msg.metadata as any)?.speakMeta?.persona || tutorSession?.session?.personaId || 'Priya';
                              const language = (msg.metadata as any)?.speakMeta?.language || chat?.language || 'en';
                              playSSMLAudio(msg.id, ssml, persona, language);
                            } else {
                              playAudio(msg.id, msg.content);
                            }
                          }}
                          data-testid={`button-speak-${msg.id}`}
                        >
                          {playingAudio === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {transcribeMutation.isPending && (
                <div className="flex gap-2.5 lg:gap-3">
                  <div className="flex-shrink-0 w-7 h-7 lg:w-9 lg:h-9 rounded-full overflow-hidden ring-2 ring-purple-400/50">
                    <img src={mentorAvatar} alt="Garima" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 lg:px-4 lg:py-3 bg-white/10 backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-400 animate-spin" />
                      <span className="text-xs lg:text-sm text-white/60">Transcribing...</span>
                    </div>
                  </div>
                </div>
              )}

              {(isStreaming || voiceTutor.streamingResponse) && (
                <div className="flex gap-2.5 lg:gap-3">
                  <div className="flex-shrink-0 w-7 h-7 lg:w-9 lg:h-9 rounded-full overflow-hidden ring-2 ring-purple-400/50">
                    <img src={mentorAvatar} alt="Garima" className="w-full h-full object-cover" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md px-3.5 py-2.5 lg:px-4 lg:py-3 bg-white/10 backdrop-blur-sm border border-white/10">
                    {voiceTutor.streamingResponse ? (
                      <>
                        <div className="prose prose-sm prose-invert max-w-none text-sm lg:text-base inline">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {voiceTutor.streamingResponse}
                          </ReactMarkdown>
                        </div>
                        {isStreaming && <span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-1 align-middle" />}
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 2 && (
              <div className="px-4 py-3 lg:px-5 lg:py-3 border-t border-white/5 bg-white/5">
                <p className="text-[10px] lg:text-xs text-white/40 mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3 h-3" />
                  Example of what you can say:
                </p>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 text-xs lg:text-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-200 hover:bg-amber-500/20 rounded-xl"
                  onClick={() => sendMessageMutation.mutate(`I have a doubt about ${chat.topic}`)}
                  data-testid="button-example-prompt"
                >
                  I have a doubt about {chat.topic}
                </Button>
              </div>
            )}

            <div className="p-3 lg:p-4 border-t border-white/5 bg-black/20">
              {voiceMode ? (
                <VoiceControl
                  chatId={chatId}
                  onTranscription={(text) => {
                    setMessage(text);
                    setTimeout(() => {
                      if (text.trim()) sendMessageMutation.mutate(text.trim());
                    }, 100);
                  }}
                  disabled={isStreaming}
                />
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center gap-2 p-1.5 lg:p-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={isRecording ? "Listening..." : "Type your question..."}
                      disabled={isStreaming || isRecording || transcribeMutation.isPending}
                      className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-white/40 text-sm lg:text-base h-9 lg:h-10"
                      data-testid="input-chat-message"
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full transition-all ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isStreaming || transcribeMutation.isPending}
                        data-testid="button-voice-input"
                      >
                        {isRecording ? <MicOff className="w-4 h-4 lg:w-5 lg:h-5" /> : <Mic className="w-4 h-4 lg:w-5 lg:h-5" />}
                      </Button>
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!message.trim() || isStreaming}
                        className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg disabled:opacity-50"
                        data-testid="button-send-message"
                      >
                        {isStreaming ? <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> : <Send className="w-4 h-4 lg:w-5 lg:h-5" />}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {chat && (
        <QuickToolModal
          open={activeToolModal !== null}
          onOpenChange={(open) => {
            if (!open) {
              setActiveToolModal(null);
              setToolStreamingContent("");
            }
          }}
          toolType={activeToolModal}
          chat={chat}
          onSubmit={handleQuickToolSubmit}
          isStreaming={toolStreaming}
          streamingContent={toolStreamingContent}
          userProfile={user}
        />
      )}
    </div>
  );
}

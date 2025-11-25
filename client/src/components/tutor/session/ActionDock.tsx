import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Image,
  Keyboard,
  X,
  Loader2,
} from "lucide-react";

interface ActionDockProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isRecording: boolean;
  isStreaming: boolean;
  isTranscribing?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  placeholder?: string;
  className?: string;
}

export default function ActionDock({
  message,
  onMessageChange,
  onSubmit,
  isRecording,
  isStreaming,
  isTranscribing = false,
  onStartRecording,
  onStopRecording,
  placeholder = "Type your question...",
  className = "",
}: ActionDockProps) {
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVoiceToggle = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isStreaming) {
        onSubmit(e);
      }
    }
  };

  return (
    <div className={`p-3 lg:p-4 ${className}`}>
      <form onSubmit={onSubmit} className="relative">
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/10 dark:bg-slate-800/50 backdrop-blur-xl border border-white/20 shadow-xl">
          <div className="flex-1 flex items-center gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening..." : placeholder}
              disabled={isStreaming || isRecording}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-white/40 text-sm lg:text-base h-10 lg:h-11"
              data-testid="input-message"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-300 font-medium">Recording</span>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={handleVoiceToggle}
                    data-testid="button-stop-recording"
                  >
                    <MicOff className="w-5 h-5" />
                  </Button>
                </motion.div>
              ) : isTranscribing ? (
                <motion.div
                  key="transcribing"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30"
                >
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-xs text-blue-300 font-medium">Processing...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="w-10 h-10 lg:w-11 lg:h-11 rounded-full text-white/60 hover:text-white hover:bg-white/10"
                    onClick={handleVoiceToggle}
                    disabled={isStreaming}
                    data-testid="button-start-recording"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || isStreaming}
                    className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-send-message"
                  >
                    {isStreaming ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </form>

      <p className="text-center text-xs text-white/30 mt-2 hidden lg:block">
        Press Enter to send, or tap the mic to speak
      </p>
    </div>
  );
}

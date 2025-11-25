import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  VolumeX,
  User,
  Sparkles,
  Lightbulb,
  HelpCircle,
  CheckCircle,
  Loader2,
  Copy,
  ThumbsUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Message } from "@shared/schema";
import mentorAvatar from "@assets/generated_images/female_teacher_gradient_background.png";

interface ChatPanelProps {
  messages: Message[];
  streamingResponse?: string;
  isStreaming: boolean;
  playingAudio: string | null;
  onPlayAudio: (messageId: string, text: string) => void;
  onSuggestedPrompt?: (prompt: string) => void;
  mentorName?: string;
  suggestedPrompts?: string[];
  className?: string;
}

export default function ChatPanel({
  messages,
  streamingResponse,
  isStreaming,
  playingAudio,
  onPlayAudio,
  onSuggestedPrompt,
  mentorName = "Garima",
  suggestedPrompts = [],
  className = "",
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, streamingResponse]);

  const defaultSuggestions = [
    "Can you explain this concept again?",
    "Give me an example",
    "I have a doubt",
    "Test my understanding",
  ];

  const activeSuggestions = suggestedPrompts.length > 0 ? suggestedPrompts : defaultSuggestions;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 py-4 lg:px-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden ring-2 ring-purple-400/50 shadow-lg">
                  <img
                    src={mentorAvatar}
                    alt={mentorName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] lg:max-w-[80%] ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md"
                      : "bg-white/10 dark:bg-slate-800/50 backdrop-blur-sm border border-white/10 text-white/90 rounded-bl-md"
                  }`}
                >
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                        ),
                        code: ({ children }) => (
                          <code className="bg-black/30 px-1.5 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/10"
                      onClick={() => onPlayAudio(msg.id, msg.content)}
                      data-testid={`button-play-audio-${msg.id}`}
                    >
                      {playingAudio === msg.id ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/10"
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      data-testid={`button-copy-${msg.id}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/10"
                      data-testid={`button-like-${msg.id}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {streamingResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden ring-2 ring-purple-400/50 shadow-lg">
                <img
                  src={mentorAvatar}
                  alt={mentorName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="max-w-[85%] lg:max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 bg-white/10 dark:bg-slate-800/50 backdrop-blur-sm border border-white/10">
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {streamingResponse}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          {isStreaming && !streamingResponse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full overflow-hidden ring-2 ring-purple-400/50 shadow-lg">
                <img
                  src={mentorAvatar}
                  alt={mentorName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-sm text-white/60">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && onSuggestedPrompt && (
        <div className="px-3 py-3 border-t border-white/10 bg-white/5">
          <p className="text-xs text-white/50 mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" />
            Quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            {activeSuggestions.slice(0, 4).map((prompt, index) => (
              <Button
                key={index}
                size="sm"
                variant="ghost"
                className="h-auto py-1.5 px-3 text-xs bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full border border-white/10"
                onClick={() => onSuggestedPrompt(prompt)}
                data-testid={`button-suggestion-${index}`}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

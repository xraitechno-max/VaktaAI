import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Mic, Volume2, Globe, MessageCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  // Get or create chat session
  const { data: chatId, isLoading: chatLoading } = useQuery<string>({
    queryKey: ["/api/tutor/chat"],
    queryFn: async () => {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "General",
          topic: "Learning",
        }),
      });
      if (!res.ok) throw new Error("Failed to create chat");
      return res.json().then((data) => data.chatId);
    },
  });

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/tutor/messages", chatId],
    enabled: !!chatId,
    queryFn: async () => {
      const res = await fetch(`/api/tutor/messages?chatId=${chatId}`);
      return res.json();
    },
    refetchInterval: 2000,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/tutor/respond", {
        chatId,
        userMessage: content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tutor/messages", chatId],
      });
      setInput("");
    },
    onError: () => {
      toast({
        title: language === "hi" ? "त्रुटि" : "Error",
        description: language === "hi" ? "संदेश भेजने में विफल" : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput("");
    await sendMutation.mutateAsync(content);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        // TODO: Send audio to backend for transcription
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({
        title: language === "hi" ? "माइक्रोफोन त्रुटि" : "Microphone Error",
        description: language === "hi" ? "माइक्रोफोन एक्सेस अस्वीकृत" : "Microphone access denied",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (chatLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <MessageCircle className="w-12 h-12 text-orange-500" />
          </motion.div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {language === "hi" ? "चैट तैयार किया जा रहा है..." : "Setting up your chat..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 border-b border-orange-200 dark:border-orange-900 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent">
                {language === "hi" ? "VaktaAI - आपका मेंटर" : "VaktaAI - Your Mentor"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {language === "hi" ? "मैं आपकी सभी प्रश्नों का उत्तर दूंगा" : "Always here to help you learn"}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              className="ml-2 p-2 rounded-lg bg-gradient-to-r from-orange-500 to-purple-500 text-white hover:shadow-lg transition-all"
              data-testid="button-language-toggle"
              title={language === "en" ? "Switch to Hindi" : "Switch to English"}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold ml-1 hidden sm:inline">
                {language === "en" ? "EN" : "HI"}
              </span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <ScrollArea className="flex-1 px-3 sm:px-6 py-4 overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-4 pb-4">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 sm:py-16"
              >
                <div className="text-5xl sm:text-6xl mb-4 inline-block">🎓</div>
                <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {language === "hi" ? "नमस्ते! मैं मैरी हूँ" : "Namaste! I'm Mary"}
                </p>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {language === "hi"
                    ? "आपका सवाल पूछें और सीखना शुरू करें"
                    : "Ask me anything and let's learn together"}
                </p>
              </motion.div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-3 rounded-lg shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-orange-200 dark:border-orange-900 rounded-bl-none"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.role === "assistant" && (
                        <div className="text-xl flex-shrink-0 mt-1">🤖</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium mb-1 ${msg.role === "user" ? "text-white/80" : ""}`}>
                          {msg.role === "user" ? "You" : "Mary"}
                        </p>
                        <p className="text-sm sm:text-base break-words">{msg.content}</p>
                        {msg.role === "assistant" && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => {
                              toast({
                                title: language === "hi" ? "जल्द आ रहा है" : "Coming Soon",
                                description: language === "hi" ? "वॉइस फीचर शीघ्र ही उपलब्ध होगा" : "Voice feature coming soon",
                              });
                            }}
                            className="mt-2 p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                            data-testid={`button-speak-${msg.id}`}
                            title={language === "hi" ? "सुनें" : "Listen"}
                          >
                            <Volume2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </motion.button>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="text-xl flex-shrink-0 mt-1">👤</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}

            {sendMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-orange-200 dark:border-orange-900 px-4 py-3 rounded-lg rounded-bl-none shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    <p className="text-sm">
                      {language === "hi" ? "सोच रही हूँ..." : "Thinking..."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white dark:bg-slate-950 border-t border-orange-200 dark:border-orange-900 shadow-lg">
        <div className="px-3 sm:px-6 py-4 max-w-2xl mx-auto w-full">
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !sendMutation.isPending && input.trim()) {
                    handleSendMessage();
                  }
                }}
                placeholder={
                  language === "hi"
                    ? "अपना सवाल पूछें..."
                    : "Ask your question..."
                }
                disabled={sendMutation.isPending}
                data-testid="input-message"
                className="text-sm flex-1 border-orange-200 dark:border-orange-900 focus-visible:ring-orange-500"
              />
            </div>

            <Button
              size="icon"
              variant="outline"
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex-shrink-0 ${
                isRecording
                  ? "bg-red-100 dark:bg-red-900 border-red-500"
                  : "border-orange-200 dark:border-orange-900"
              }`}
              data-testid="button-record"
              title={
                language === "hi"
                  ? isRecording ? "रिकॉर्डिंग बंद करें" : "रिकॉर्ड करें"
                  : isRecording ? "Stop recording" : "Record"
              }
            >
              <Mic className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || sendMutation.isPending}
              className="flex-shrink-0 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 hover:shadow-lg transition-all"
              data-testid="button-send"
              title={language === "hi" ? "भेजें" : "Send"}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

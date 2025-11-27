import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Globe,
  Sparkles,
  Highlighter,
  Brain,
  Layers,
  StickyNote,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Video,
  Youtube,
  X,
  ExternalLink,
  MessageSquare,
  BookOpen,
  FolderOpen,
  Check,
  ArrowLeft,
  Zap,
  Library,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { Document } from "@shared/schema";
import { cn } from "@/lib/utils";
import DocChatActionModal from "./DocChatActionModal";
import { EnhancedDocChat } from "./EnhancedDocChat";

type ActionType = 'summary' | 'highlights' | 'quiz' | 'flashcards';

const particlePositions = [...Array(20)].map(() => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  duration: 2 + Math.random() * 3,
  delay: Math.random() * 2,
}));

function PremiumBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-purple-500/20 animate-pulse-subtle pointer-events-none" />
      <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(0deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particlePositions.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-40"
            style={{
              left: particle.left,
              top: particle.top,
              animation: `twinkle ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function GlassCard({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <div
      className={cn(
        "backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-slate-700/30 rounded-2xl shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default function DocChatView() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(true);
  const [activeView, setActiveView] = useState<'upload' | 'chat'>('upload');
  const [activeActionModal, setActiveActionModal] = useState<ActionType | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionContent, setActionContent] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsActionsPanelOpen(false);
      } else {
        setIsSidebarOpen(true);
        setIsActionsPanelOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0 && isActionsPanelOpen) {
          setIsActionsPanelOpen(false);
        }
        if (deltaX > 0 && isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isSidebarOpen, isActionsPanelOpen]);

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (uploadData: { uploadURL: string; fileName: string; fileSize: number; fileType: string }) => {
      const response = await apiRequest("POST", "/api/documents/from-upload", uploadData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    },
  });

  const addUrlMutation = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      const response = await apiRequest("POST", "/api/documents/by-url", { url, title });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "URL added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add URL", variant: "destructive" });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      const response = await apiRequest("POST", "/api/docchat/session", { docIds });
      if (!response.ok) throw new Error("Failed to start chat");
      return response.json();
    },
    onSuccess: (data) => {
      const chatId = data.id || data.chatId;
      setCurrentChatId(chatId);
      setActiveView('chat');
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  const handleStartChat = () => {
    if (selectedDocuments.length === 0) {
      toast({ title: "No documents selected", description: "Please select at least one document", variant: "destructive" });
      return;
    }
    startChatMutation.mutate(selectedDocuments);
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const getDocumentIcon = (doc: Document) => {
    if (doc.sourceType === 'youtube') return <Video className="w-4 h-4" />;
    if (doc.sourceType === 'web') return <Globe className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getDocumentTypeLabel = (doc: Document) => {
    if (doc.sourceType === 'youtube') return 'Video';
    if (doc.sourceType === 'web') return 'Article';
    return 'Document';
  };

  const selectedDocsData = documents.filter(d => selectedDocuments.includes(d.id));

  const handleActionSubmit = async (actionType: ActionType, formData: any) => {
    setActionProcessing(true);
    setActionContent("");

    try {
      const response = await fetch(`/api/docchat/action/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          docIds: selectedDocuments,
          language: formData.language || 'en',
          level: formData.level,
          examBoard: formData.examBoard,
          ...formData,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Action failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let isDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || "";

        for (const event of events) {
          const lines = event.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'chunk' && parsed.content) {
                  fullContent += parsed.content;
                  setActionContent(fullContent);
                } else if (parsed.type === 'complete') {
                  toast({ title: "Success", description: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} generated successfully!` });
                } else if (parsed.type === 'done') {
                  isDone = true;
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.message);
                }
              } catch (e) {
                console.error("SSE parse error:", e, "Data:", data);
              }
            }
          }
        }
      }

      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'done') {
                isDone = true;
              }
            } catch (e) {
              console.error("Final SSE parse error:", e);
            }
          }
        }
      }

      if (isDone) {
        setActionProcessing(false);
      }
    } catch (error) {
      setActionProcessing(false);
      toast({ title: "Error", description: `Failed to generate ${actionType}`, variant: "destructive" });
    }
  };

  if (activeView === 'upload') {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <PremiumBackground />

        <div className="relative z-10 flex flex-col min-h-screen">
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 lg:p-8"
          >
            <GlassCard className="max-w-7xl mx-auto p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Library className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                    <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Source Studio
                    </span>
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Upload documents and build your knowledge base
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <GlassCard className="p-8 sm:p-12">
                      <ObjectUploader
                        maxFileSize={50 * 1024 * 1024}
                        onGetUploadParameters={async (file) => {
                          const response = await fetch('/api/documents/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                              fileName: file.name,
                              fileType: file.type,
                              fileSize: file.size
                            })
                          });
                          const { uploadURL } = await response.json();
                          return { method: "PUT" as const, url: uploadURL };
                        }}
                        onComplete={(result) => {
                          const file = result.meta as any;
                          uploadDocumentMutation.mutate({
                            uploadURL: result.uploadURL as string,
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: file.type
                          });
                        }}
                      >
                        <div className="border-2 border-dashed border-cyan-300/50 dark:border-cyan-700/50 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/30 group">
                          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <p className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                            Drop files here or click to browse
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Supports PDF, DOCX, PPTX - up to 50MB
                          </p>
                          <Button
                            className="btn-gradient shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300"
                            data-testid="button-browse-files"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Browse Files
                          </Button>
                        </div>
                      </ObjectUploader>
                    </GlassCard>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 px-4">OR ADD FROM URL</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <GlassCard
                      className="p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20 hover:border-red-400/30 group"
                      onClick={() => {
                        const url = prompt("Enter YouTube URL:");
                        if (url) addUrlMutation.mutate({ url, title: '' });
                      }}
                      data-testid="button-add-youtube"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform duration-300">
                          <Youtube className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">YouTube Video</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Add video transcript</p>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard
                      className="p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:border-blue-400/30 group"
                      onClick={() => {
                        const url = prompt("Enter website URL:");
                        if (url) addUrlMutation.mutate({ url, title: '' });
                      }}
                      data-testid="button-add-website"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                          <Globe className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">Web Article</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Import web content</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Your Documents</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Click to select for chat</p>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                          {documents.length} files
                        </span>
                      </div>

                      {documentsLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Loading documents...</p>
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">No documents yet</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Upload files above to get started</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <AnimatePresence>
                            {documents.map((doc, index) => (
                              <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                                  selectedDocuments.includes(doc.id)
                                    ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 shadow-lg shadow-cyan-500/20"
                                    : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-cyan-300 dark:hover:border-cyan-700"
                                )}
                                onClick={() => toggleDocumentSelection(doc.id)}
                                data-testid={`card-document-${doc.id}`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300",
                                    selectedDocuments.includes(doc.id)
                                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30"
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                  )}>
                                    {getDocumentIcon(doc)}
                                  </div>
                                  <AnimatePresence>
                                    {selectedDocuments.includes(doc.id) && (
                                      <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 180 }}
                                        className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white flex items-center justify-center shadow-lg"
                                      >
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                                <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-slate-200 mb-1" title={doc.title}>
                                  {doc.title}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  {getDocumentIcon(doc)}
                                  <span>{getDocumentTypeLabel(doc)}</span>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-1"
                >
                  <div className="sticky top-8">
                    <GlassCard className="p-6 border-2 border-cyan-500/20">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Selected Sources</h3>
                        </div>
                        {selectedDocuments.length > 0 && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                            {selectedDocuments.length}
                          </span>
                        )}
                      </div>

                      {selectedDocuments.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                          <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No sources selected</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click documents to add them</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
                            <AnimatePresence>
                              {selectedDocsData.map((doc, index) => (
                                <motion.div
                                  key={doc.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/50 dark:to-blue-950/50 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                                    {getDocumentIcon(doc)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{doc.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{getDocumentTypeLabel(doc)}</p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDocumentSelection(doc.id);
                                    }}
                                    className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                                    aria-label={`Remove ${doc.title}`}
                                    data-testid={`button-remove-doc-${doc.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>

                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              onClick={handleStartChat}
                              disabled={startChatMutation.isPending}
                              className="w-full btn-gradient h-14 text-base font-bold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300"
                              data-testid="button-start-chat"
                            >
                              {startChatMutation.isPending ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                  Starting Session...
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-5 h-5 mr-2" />
                                  Start Knowledge Chat
                                </>
                              )}
                            </Button>
                          </motion.div>

                          <div className="flex items-center gap-2 mt-4 justify-center text-xs text-slate-500 dark:text-slate-400">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                            <span>AI-powered document analysis</span>
                          </div>
                        </>
                      )}
                    </GlassCard>
                  </div>
                </motion.div>
              </div>
            </div>
          </main>
        </div>

        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.5); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      <PremiumBackground />

      {isMobile && (isSidebarOpen || isActionsPanelOpen) && (
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => {
            setIsSidebarOpen(false);
            setIsActionsPanelOpen(false);
          }}
        />
      )}

      <motion.div
        initial={false}
        animate={{
          width: isSidebarOpen ? (isMobile ? '85vw' : '280px') : 0,
          x: isMobile && !isSidebarOpen ? '-100%' : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "relative z-50 flex flex-col border-r border-white/20 dark:border-slate-700/30",
          isMobile && "fixed inset-y-0 left-0 max-w-[320px]"
        )}
      >
        <GlassCard className="h-full rounded-none border-0 border-r border-white/20 dark:border-slate-700/30 flex flex-col">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Sources</h3>
                  <p className="text-xs text-slate-500">{selectedDocuments.length} selected</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveView('upload')}
                  className="h-8 w-8"
                  data-testid="button-change-sources"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(false)}
                    className="h-8 w-8"
                    data-testid="button-close-sidebar-mobile"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {selectedDocsData.map(doc => (
              <motion.div
                key={doc.id}
                whileHover={{ x: 4 }}
                className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 transition-colors hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30"
                data-testid={`source-card-${doc.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    {getDocumentIcon(doc)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-slate-200">{doc.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{getDocumentTypeLabel(doc)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <GlassCard className="m-2 sm:m-3 lg:m-4 rounded-2xl border-0 shadow-2xl flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-slate-200/50 dark:border-slate-700/50 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="h-9 w-9 shrink-0"
                  data-testid="button-toggle-sidebar"
                >
                  {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveView('upload')}
                  className="h-9 w-9 shrink-0"
                  data-testid="button-back-to-upload"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>

                <div className="min-w-0">
                  <h2 className="font-bold text-base sm:text-lg truncate">
                    <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Knowledge Workspace
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                    {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} loaded
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
                    className="h-9 w-9"
                    data-testid="button-toggle-actions-mobile"
                  >
                    <Zap className="w-5 h-5 text-cyan-600" />
                  </Button>
                )}
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
                    className="h-9 w-9"
                    data-testid="button-toggle-actions"
                  >
                    {isActionsPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-purple-600" />}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4">
              <EnhancedDocChat
                chatId={currentChatId ? parseInt(currentChatId) : 0}
                selectedDocuments={selectedDocuments.map(id => parseInt(id))}
                onError={(error) => toast({
                  title: "Error",
                  description: error,
                  variant: "destructive"
                })}
              />
            </div>
          </div>
        </GlassCard>
      </div>

      <motion.div
        initial={false}
        animate={{
          width: isActionsPanelOpen ? (isMobile ? '85vw' : '280px') : 0,
          x: isMobile && !isActionsPanelOpen ? '100%' : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "relative z-50 flex flex-col border-l border-white/20 dark:border-slate-700/30",
          isMobile && "fixed inset-y-0 right-0 max-w-[320px]"
        )}
      >
        <GlassCard className="h-full rounded-none border-0 border-l border-white/20 dark:border-slate-700/30 flex flex-col">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Quick Actions</h3>
              </div>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsActionsPanelOpen(false)}
                  className="h-8 w-8"
                  data-testid="button-close-actions-mobile"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {[
              { type: 'summary' as ActionType, icon: FileText, label: 'Generate Summary', color: 'from-blue-500 to-cyan-500' },
              { type: 'highlights' as ActionType, icon: Highlighter, label: 'Extract Highlights', color: 'from-amber-500 to-orange-500' },
              { type: 'quiz' as ActionType, icon: Brain, label: 'Create Quiz', color: 'from-green-500 to-emerald-500' },
              { type: 'flashcards' as ActionType, icon: Layers, label: 'Make Flashcards', color: 'from-purple-500 to-pink-500' },
            ].map((action) => (
              <motion.div
                key={action.type}
                whileHover={{ x: 4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-14 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-slate-800 dark:hover:to-transparent transition-all duration-300"
                  onClick={() => setActiveActionModal(action.type)}
                  data-testid={`action-${action.type}`}
                >
                  <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", action.color)}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
                </Button>
              </motion.div>
            ))}

            <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50 mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 px-1">More Tools</p>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 rounded-xl"
                onClick={() => toast({ title: "Coming Soon", description: "Smart Notes feature is under development" })}
                data-testid="action-notes"
              >
                <StickyNote className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Smart Notes</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 rounded-xl"
                onClick={() => toast({ title: "Coming Soon", description: "Search feature is under development" })}
                data-testid="action-search"
              >
                <Search className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Deep Search</span>
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {isMobile && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-4 z-50"
        >
          <Button
            onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
            className="w-14 h-14 rounded-full btn-gradient shadow-2xl shadow-cyan-500/40"
            data-testid="button-mobile-fab"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </Button>
        </motion.div>
      )}

      <DocChatActionModal
        open={activeActionModal !== null}
        onOpenChange={(open) => !open && setActiveActionModal(null)}
        actionType={activeActionModal}
        selectedDocs={selectedDocsData.map(d => ({ id: d.id, title: d.title }))}
        onSubmit={handleActionSubmit}
        isProcessing={actionProcessing}
        streamingContent={actionContent}
        userProfile={user as any}
      />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}

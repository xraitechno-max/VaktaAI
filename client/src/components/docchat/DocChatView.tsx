import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Document } from "@shared/schema";
import { cn } from "@/lib/utils";
import DocChatActionModal from "./DocChatActionModal";
import { EnhancedDocChat } from "./EnhancedDocChat";

type ActionType = 'summary' | 'highlights' | 'quiz' | 'flashcards';

export default function DocChatView() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // State Management
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

  // Mobile detection on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebars on mobile
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

  // Touch gesture detection for swipe to close
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

      // Swipe threshold (50px) and ensure horizontal swipe
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Swipe left to close actions panel (from right)
        if (deltaX < 0 && isActionsPanelOpen) {
          setIsActionsPanelOpen(false);
        }
        // Swipe right to close sources sidebar (from left)
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

  // Queries
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Mutations
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
        
        // Split by double newline to get complete SSE events
        const events = buffer.split('\n\n');
        
        // Keep the last incomplete event in buffer
        buffer = events.pop() || "";
        
        // Process complete events
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
      
      // Process any remaining buffered data
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
      
      // Only clear processing state after confirming done
      if (isDone) {
        setActionProcessing(false);
      }
    } catch (error) {
      setActionProcessing(false);
      toast({ title: "Error", description: `Failed to generate ${actionType}`, variant: "destructive" });
    }
  };

  // Upload Screen
  if (activeView === 'upload') {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
        {/* Modern Header with Indian EdTech Style */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  DocChat - Apne Documents Se Baat Karo 📄
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Upload करो, chat करो, aur AI se सीखो
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Add Source */}
              <div className="lg:col-span-2 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between mb-4"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    <Sparkles className="w-5 h-5 text-primary-600" />
                    Documents Add Karo 📚
                  </h2>
                </motion.div>

                {/* File Upload - Modern Dropzone */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 sm:p-12 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary-600" />
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    Files yaha drag karo ya click karke upload karo
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    PDF, DOCX, PPTX - upto 200MB
                  </p>
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
                    <Button className="bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl transition-all" data-testid="button-browse-files">
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>
                  </ObjectUploader>
                </motion.div>

                <div className="text-center text-gray-500 text-sm font-semibold">YA PHIR</div>

                {/* URL Inputs - Modern Design */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-all h-12"
                      onClick={() => {
                        const url = prompt("YouTube URL paste karo:");
                        if (url) {
                          addUrlMutation.mutate({ url, title: '' });
                        }
                      }}
                      data-testid="button-add-youtube"
                    >
                      <Youtube className="w-5 h-5 mr-2 text-red-600" />
                      YouTube Video Add Karo
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1 border-2 border-gray-300 hover:border-secondary-500 hover:bg-secondary-50 transition-all h-12"
                      onClick={() => {
                        const url = prompt("Website URL paste karo:");
                        if (url) {
                          addUrlMutation.mutate({ url, title: '' });
                        }
                      }}
                      data-testid="button-add-website"
                    >
                      <Globe className="w-5 h-5 mr-2 text-blue-600" />
                      Website Article Add Karo
                    </Button>
                  </div>
                </motion.div>

                {/* All Documents Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <h3 className="text-base font-bold mb-4 flex items-center justify-between">
                    <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      AAPKE DOCUMENTS 📑
                    </span>
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {documents.length} files
                    </span>
                  </h3>

                  {documentsLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary-600" />
                      <p className="text-sm text-gray-600 mt-4">Loading...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-base font-medium text-gray-900 mb-2">Abhi koi documents nahi hai</p>
                      <p className="text-sm text-gray-600">Upar se upload karo aur chat shuru karo!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {documents.map((doc, index) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + index * 0.05 }}
                          whileHover={{ scale: 1.05 }}
                          className={cn(
                            "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
                            selectedDocuments.includes(doc.id)
                              ? "border-primary-500 bg-gradient-to-br from-primary-50 to-secondary-50 shadow-lg"
                              : "border-gray-200 bg-white hover:border-primary-300 hover:shadow-md"
                          )}
                          onClick={() => toggleDocumentSelection(doc.id)}
                          data-testid={`card-document-${doc.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              selectedDocuments.includes(doc.id)
                                ? "bg-gradient-to-br from-primary-500 to-secondary-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {getDocumentIcon(doc)}
                            </div>
                            {selectedDocuments.includes(doc.id) && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shadow-lg"
                              >
                                ✓
                              </motion.div>
                            )}
                          </div>
                          <p className="text-sm font-semibold line-clamp-2 mb-1 text-gray-900" title={doc.title}>
                            {doc.title}
                          </p>
                          <p className="text-xs text-gray-600">
                            {doc.sourceType === 'youtube' ? '🎥 Video' : doc.sourceType === 'web' ? '🌐 Article' : '📄 Document'}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Right Column - Selected Documents */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="sticky top-8"
                >
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
                    <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <span className="flex-1">Selected</span>
                      {selectedDocuments.length > 0 && (
                        <span className="text-xs bg-gradient-to-r from-primary-500 to-secondary-600 text-white px-3 py-1 rounded-full font-bold">
                          {selectedDocuments.length}
                        </span>
                      )}
                    </h3>

                    {selectedDocuments.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                        <p className="text-sm text-gray-600 font-medium">Koi document select nahi kiya</p>
                        <p className="text-xs text-gray-500 mt-2">Documents pe click karke select karo</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                          {selectedDocsData.map((doc, index) => (
                            <motion.div
                              key={doc.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl border border-primary-200"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary-600">
                                {getDocumentIcon(doc)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate text-gray-900">{doc.title}</p>
                                <p className="text-xs text-gray-600">
                                  {doc.sourceType === 'youtube' ? '🎥 Video' : doc.sourceType === 'web' ? '🌐 Article' : '📄 Doc'}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDocumentSelection(doc.id);
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                aria-label={`Remove ${doc.title}`}
                                data-testid={`button-remove-doc-${doc.id}`}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </motion.div>
                          ))}
                        </div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={handleStartChat}
                            disabled={startChatMutation.isPending}
                            className="w-full bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white py-6 text-base font-bold shadow-xl hover:shadow-2xl transition-all"
                            data-testid="button-start-chat"
                          >
                            {startChatMutation.isPending ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-5 h-5 mr-2" />
                                Chat Shuru Karo 💬
                              </>
                            )}
                          </Button>
                        </motion.div>

                        <p className="text-xs text-center text-gray-500 mt-4">
                          💡 Garima Ma'am will answer your questions in Hinglish
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat Screen (Three-Panel Layout)
  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 relative">
      {/* Mobile Overlay */}
      {isMobile && (isSidebarOpen || isActionsPanelOpen) && (
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => {
            setIsSidebarOpen(false);
            setIsActionsPanelOpen(false);
          }}
        />
      )}

      {/* Left Sidebar - Sources */}
      <div className={cn(
        "transition-all duration-300 border-r border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col",
        // Desktop behavior - inline flex column
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden",
        // Mobile behavior - fixed overlay (only on mobile)
        isMobile && "fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50",
        isMobile && !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Sources ({selectedDocuments.length})</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('upload')}
                data-testid="button-change-sources"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(false)}
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
            <Card key={doc.id} className="p-3 glass-card hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors" data-testid={`source-card-${doc.id}`}>
              <div className="flex items-start gap-2">
                {getDocumentIcon(doc)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {doc.sourceType === 'youtube' ? 'Video' : doc.sourceType === 'web' ? 'Article' : 'Document'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Center - Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header - Mobile Optimized */}
        <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                data-testid="button-toggle-sidebar"
                className="h-9 w-9 md:h-auto md:w-auto p-0 md:px-3"
              >
                {isSidebarOpen ? <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" /> : <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />}
              </Button>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm md:text-base truncate">Doc Chat: Garima Ma'am</h2>
                <p className="text-xs text-slate-500 hidden md:block">{selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected</p>
              </div>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
                data-testid="button-toggle-actions-mobile"
                className="h-9 w-9 p-0 md:hidden"
              >
                <Sparkles className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced DocChat Component */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4">
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

      {/* Right Sidebar - Quick Actions - Desktop & Mobile */}
      <div className={cn(
        "transition-all duration-300 border-l border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col",
        // Desktop behavior - inline flex column
        isActionsPanelOpen ? "w-64" : "w-0 overflow-hidden",
        // Mobile behavior - fixed overlay from right (only on mobile)
        isMobile && "fixed inset-y-0 right-0 w-80 max-w-[85vw] z-50",
        isMobile && !isActionsPanelOpen && "translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Quick Actions</h3>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsActionsPanelOpen(false)}
                data-testid="button-close-actions-mobile"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('summary')}
            data-testid="action-summary"
          >
            <FileText className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Summary</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('highlights')}
            data-testid="action-highlights"
          >
            <Highlighter className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Highlights</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('quiz')}
            data-testid="action-quiz"
          >
            <Brain className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Generate Quiz</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('flashcards')}
            data-testid="action-flashcards"
          >
            <Layers className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Flashcards</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2" 
            onClick={() => toast({ title: "Coming Soon", description: "Smart Notes feature is under development" })}
            data-testid="action-notes"
          >
            <StickyNote className="w-4 h-4" />
            <span className="text-sm">Smart Notes</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2" 
            onClick={() => toast({ title: "Coming Soon", description: "Search feature is under development" })}
            data-testid="action-search"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search</span>
          </Button>
        </div>
      </div>

      {/* Toggle Actions Panel Button - Desktop only */}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
          className="fixed right-4 top-20 z-50 glass-card shadow-lg"
          data-testid="button-toggle-actions"
        >
          {isActionsPanelOpen ? (
            <ChevronRight className="w-5 h-5 text-purple-600" />
          ) : (
            <Sparkles className="w-5 h-5 text-purple-600" />
          )}
        </Button>
      )}

      {/* Mobile FAB - Floating Action Button for Quick Actions */}
      {isMobile && (
        <Button
          onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full btn-gradient shadow-2xl"
          data-testid="button-mobile-fab"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Action Modal */}
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
    </div>
  );
}

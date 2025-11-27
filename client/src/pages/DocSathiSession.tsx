import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Youtube,
  Globe,
  Send,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Highlighter,
  Layers,
  BookOpen,
  Sparkles,
  Share2,
  Pin,
  RotateCcw,
  Search,
  ExternalLink,
  ArrowLeft,
  MessageSquare,
  Quote,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Document, Chat, Message } from "@shared/schema";
import DocChatActionModal from "@/components/docchat/DocChatActionModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ActionType = 'summary' | 'highlights' | 'quiz' | 'flashcards';

const suggestedQuestions = [
  "What do I need to know to understand this document?",
  "What topics should I explore after this document?",
  "Summarize the key points in simple terms",
  "What are the most important concepts here?",
];

export default function DocChatSession() {
  const [, params] = useRoute("/docsathi/:chatId");
  const [, setLocation] = useLocation();
  const chatId = params?.chatId || null;
  
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeActionModal, setActiveActionModal] = useState<ActionType | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionContent, setActionContent] = useState("");
  const [activeTab, setActiveTab] = useState<'insight' | 'research'>('insight');
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [pdfExpanded, setPdfExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: currentChat, isLoading: chatLoading } = useQuery<Chat>({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", chatId, "messages"],
    enabled: !!chatId,
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!chatId) throw new Error("No chat session");
      
      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: messageText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return new Promise((resolve, reject) => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          reject(new Error('No response stream'));
          return;
        }

        let buffer = '';
        let fullResponse = '';
        
        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split('\n\n');
              buffer = events.pop() || '';

              for (const event of events) {
                for (const line of event.split('\n')) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.done) {
                        resolve({ done: true, result: data.result });
                        return;
                      } else if (data.error) {
                        reject(new Error(data.error));
                        return;
                      } else if (data.content) {
                        fullResponse += data.content;
                        queryClient.setQueryData<Message[]>(["/api/chats", chatId, "messages"], (old = []) => {
                          const updated = [...old];
                          const lastMessage = updated[updated.length - 1];
                          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.id === 'streaming') {
                            updated[updated.length - 1] = { ...lastMessage, content: fullResponse };
                          } else {
                            updated.push({
                              id: 'streaming',
                              chatId: chatId!,
                              role: 'assistant',
                              content: fullResponse,
                              tool: null,
                              metadata: {},
                              createdAt: new Date()
                            });
                          }
                          return updated;
                        });
                      }
                    } catch (e) {
                      console.warn('Parse error:', e);
                    }
                  }
                }
              }
            }
          } catch (error) {
            reject(error);
          }
        };

        readStream();
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && chatId) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    if (chatId) {
      sendMessageMutation.mutate(question);
    }
  };

  const handleDocChatActionSubmit = async (actionType: ActionType, formData: any) => {
    setActionProcessing(true);
    setActionContent("");

    const docIds = currentChat?.docIds || [];

    try {
      const response = await fetch('/api/docchat/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: actionType,
          docIds: docIds,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to execute action');

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
          for (const line of event.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk' && data.content) {
                  fullContent += data.content;
                  setActionContent(fullContent);
                } else if (data.type === 'done' || data.type === 'complete') {
                  setActionProcessing(false);
                  toast({ title: "Generated Successfully" });
                  setTimeout(() => {
                    setActiveActionModal(null);
                    setActionContent("");
                  }, 1500);
                } else if (data.type === 'error') {
                  setActionProcessing(false);
                  toast({ 
                    title: "Error", 
                    description: data.message || "Failed to execute action", 
                    variant: "destructive" 
                  });
                }
              } catch (e) {
                console.warn('Parse error:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Action error:', error);
      setActionProcessing(false);
      toast({ title: "Error", description: "Failed to execute action", variant: "destructive" });
    }
  };

  if (chatLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary animate-spin" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-1 rounded-full bg-background" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading chat session...</p>
        </div>
      </div>
    );
  }

  if (!currentChat) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Chat not found</h3>
          <p className="text-sm text-muted-foreground mb-4">This chat session doesn't exist</p>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/docsathi')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to DocSathi
          </Button>
        </div>
      </div>
    );
  }

  const chatDocs = documents.filter(doc => 
    Array.isArray(currentChat.docIds) && currentChat.docIds.includes(doc.id)
  );
  const currentDoc = chatDocs[0];
  const selectedDocs = chatDocs.map(d => ({ id: d.id, title: d.title }));

  const getPdfUrl = () => {
    if (!currentDoc?.fileKey) return null;
    return `${window.location.origin}${currentDoc.fileKey}`;
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-background via-background to-primary/5">
      {/* Left: Document Viewer */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
        {currentDoc ? (
          <>
            {/* Document Toolbar */}
            <div className="h-12 border-b border-border/50 flex items-center justify-between px-4 bg-card/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  disabled={zoom <= 50}
                  data-testid="button-zoom-out-toolbar"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[3rem] text-center bg-muted/50 px-2 py-1 rounded">
                  {zoom}%
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  disabled={zoom >= 200}
                  data-testid="button-zoom-in-toolbar"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setPdfExpanded(!pdfExpanded)}
                  data-testid="button-expand-doc"
                >
                  {pdfExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                {currentDoc.fileKey && (
                  <a 
                    href={getPdfUrl() || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-open-new-tab">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                {currentDoc.fileKey && (
                  <a href={getPdfUrl() || '#'} download>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-download-doc">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-hidden bg-muted/20">
              {currentDoc.sourceType === 'pdf' ? (
                currentDoc.fileKey ? (
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                    <object
                      data={`${getPdfUrl()}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                      type="application/pdf"
                      className="rounded-lg shadow-xl bg-white"
                      style={{ 
                        width: `${Math.min(100, zoom)}%`, 
                        height: '100%',
                        minHeight: '600px',
                        maxWidth: pdfExpanded ? '100%' : '900px'
                      }}
                      data-testid="pdf-object"
                    >
                      <div className="flex flex-col items-center justify-center h-full p-8 bg-card rounded-lg">
                        <FileText className="w-16 h-16 text-primary/50 mb-4" />
                        <p className="text-sm text-muted-foreground mb-4 text-center">
                          Your browser cannot display this PDF directly.
                        </p>
                        <div className="flex gap-3">
                          <a href={getPdfUrl() || '#'} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="gap-2">
                              <ExternalLink className="w-4 h-4" />
                              Open in New Tab
                            </Button>
                          </a>
                          <a href={getPdfUrl() || '#'} download>
                            <Button className="gap-2 bg-gradient-to-r from-primary to-accent text-white">
                              <Download className="w-4 h-4" />
                              Download PDF
                            </Button>
                          </a>
                        </div>
                      </div>
                    </object>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">PDF file not available</p>
                    </div>
                  </div>
                )
              ) : currentDoc.sourceType === 'youtube' ? (
                <div className="h-full overflow-y-auto">
                  {(() => {
                    let videoId = currentDoc.metadata?.videoId;
                    if (!videoId && currentDoc.sourceUrl) {
                      const urlPatterns = [
                        /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
                        /^([a-zA-Z0-9_-]{11})$/
                      ];
                      for (const pattern of urlPatterns) {
                        const match = currentDoc.sourceUrl.match(pattern);
                        if (match && match[1]) {
                          videoId = match[1];
                          break;
                        }
                      }
                    }

                    return (
                      <div className="p-6">
                        {videoId ? (
                          <div className="max-w-4xl mx-auto">
                            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`}
                                className="w-full h-full border-0"
                                title={currentDoc.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64 bg-muted/50 rounded-xl">
                            <div className="text-center">
                              <Youtube className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Video preview unavailable</p>
                            </div>
                          </div>
                        )}
                        
                        {currentDoc.metadata?.transcriptSegments && currentDoc.metadata.transcriptSegments.length > 0 && (
                          <div className="mt-6 bg-card rounded-xl border border-border/50 overflow-hidden">
                            <div className="p-4 border-b border-border/50 flex items-center justify-between flex-wrap gap-2">
                              <h4 className="font-semibold">Transcript</h4>
                              <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  placeholder="Search for keywords in transcript..."
                                  value={transcriptSearch}
                                  onChange={(e) => setTranscriptSearch(e.target.value)}
                                  className="pl-9 h-8 text-sm w-64"
                                  data-testid="input-transcript-search"
                                />
                              </div>
                            </div>
                            <ScrollArea className="h-80">
                              <div className="p-4 space-y-4">
                                {currentDoc.metadata.transcriptSegments
                                  .filter((segment: any) => 
                                    !transcriptSearch || 
                                    segment.text.toLowerCase().includes(transcriptSearch.toLowerCase())
                                  )
                                  .map((segment: any, idx: number) => {
                                    const timeInSeconds = segment.startTime || 0;
                                    const minutes = Math.floor(timeInSeconds / 60);
                                    const seconds = Math.floor(timeInSeconds % 60);
                                    
                                    return (
                                      <div key={idx} className="flex gap-4 hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                                        <span className="text-sm font-medium text-primary shrink-0 min-w-[3rem]">
                                          {minutes}:{seconds.toString().padStart(2, '0')}
                                        </span>
                                        <p className="text-sm text-foreground/80 leading-relaxed">{segment.text}</p>
                                      </div>
                                    );
                                  })}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center max-w-md">
                    {currentDoc.sourceType === 'web' && <Globe className="w-16 h-16 text-blue-500/50 mx-auto mb-4" />}
                    {!['youtube', 'web', 'pdf'].includes(currentDoc.sourceType) && <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />}
                    <h3 className="text-lg font-semibold mb-2">{currentDoc.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {currentDoc.sourceType === 'web' ? 'Web content ready for chat' : 'Document content ready for chat'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No document selected</h3>
              <p className="text-sm text-muted-foreground">This chat has no associated documents</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Chat */}
      <div className="w-[420px] flex flex-col bg-card/30 backdrop-blur-sm">
        {/* Header with Tabs and Actions */}
        <div className="border-b border-border/50">
          <div className="px-4 pt-3 flex items-center justify-between gap-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'insight' | 'research')} className="flex-1">
              <TabsList className="h-9 bg-muted/50 p-0.5">
                <TabsTrigger 
                  value="insight" 
                  className="text-xs px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  data-testid="tab-quick-insight"
                >
                  Quick Insight
                </TabsTrigger>
                <TabsTrigger 
                  value="research" 
                  className="text-xs px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  data-testid="tab-cited-research"
                >
                  Cited Research
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 shrink-0" data-testid="button-source-actions">
                  Source Quick Actions
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2" data-testid="action-share">
                  <Share2 className="w-4 h-4" /> Share
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => setActiveActionModal('summary')} data-testid="action-summary">
                  <FileText className="w-4 h-4" /> Summary
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => setActiveActionModal('highlights')} data-testid="action-highlights">
                  <Highlighter className="w-4 h-4" /> Highlights
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" data-testid="action-pinned">
                  <Pin className="w-4 h-4" /> Pinned
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onClick={() => setActiveActionModal('quiz')} data-testid="action-generate-quiz">
                  <BookOpen className="w-4 h-4" /> Generate Quiz
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => setActiveActionModal('flashcards')} data-testid="action-generate-flashcards">
                  <Layers className="w-4 h-4" /> Generate Flashcards
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" data-testid="action-view-quizzes">
                  <BookOpen className="w-4 h-4" /> View Quizzes
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" data-testid="action-view-flashcards">
                  <Layers className="w-4 h-4" /> View Flashcards
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" data-testid="action-view-notes">
                  <FileText className="w-4 h-4" /> View Notes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="px-4 py-2 flex gap-1.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-chat-tools">
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-chat-notes">
              <FileText className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`} data-testid={`message-${msg.id}`}>
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary/80 flex items-center justify-center shrink-0 shadow-md">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="inline-block bg-muted/80 rounded-2xl rounded-tr-md px-4 py-2.5">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="bg-card rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-border/30">
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.metadata && typeof msg.metadata === 'object' && 'sources' in msg.metadata && (
                        <div className="mt-3 pt-2 border-t border-border/30 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Quote className="w-3 h-3" />
                          <span>Sources referenced</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mx-auto mb-4 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary/60" />
                </div>
                <h4 className="font-medium mb-1">Start a conversation</h4>
                <p className="text-sm text-muted-foreground">Ask questions about your documents</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggested Questions */}
        {messages.length === 0 && (
          <div className="px-4 pb-2 space-y-2">
            {suggestedQuestions.slice(0, 2).map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedQuestion(question)}
                disabled={sendMessageMutation.isPending}
                className="w-full text-left px-4 py-2.5 rounded-xl border border-primary/20 text-sm text-primary hover:bg-primary/5 hover:border-primary/40 transition-all disabled:opacity-50"
                data-testid={`button-suggested-${idx}`}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-card/50">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything. Use @ to select docs"
                disabled={sendMessageMutation.isPending}
                className="pr-10 bg-background/80 border-border/50 focus-visible:ring-primary/30"
                data-testid="input-chat-message"
              />
            </div>
            <Button 
              type="submit" 
              size="icon"
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="shrink-0 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-md"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button 
              type="button"
              variant="ghost" 
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] })}
              className="shrink-0"
              data-testid="button-refresh-chat"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* DocChat Action Modal */}
      <DocChatActionModal
        open={activeActionModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveActionModal(null);
            setActionContent("");
          }
        }}
        actionType={activeActionModal}
        selectedDocs={selectedDocs}
        onSubmit={handleDocChatActionSubmit}
        isProcessing={actionProcessing}
        streamingContent={actionContent}
        userProfile={user}
      />
    </div>
  );
}

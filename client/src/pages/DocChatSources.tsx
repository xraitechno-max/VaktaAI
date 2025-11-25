import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Paperclip,
  X,
  Plus,
  FileText,
  Youtube,
  Music,
  Video,
  FileImage,
  File,
  Loader2,
} from "lucide-react";
import { Document } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function DocChatSources() {
  const [url, setUrl] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [recentlyUploadedId, setRecentlyUploadedId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (uploadData: { uploadURL: string; fileName: string; fileSize: number; fileType: string }) => {
      const response = await apiRequest("POST", "/api/documents/from-upload", uploadData);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Document upload success:', data);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      
      // Invalidate and wait for active queries to refetch (single network call)
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/documents"],
        refetchType: 'active'
      });
      
      setUploadingFile(false);
      if (data.id || data.documentId) {
        const docId = data.id || data.documentId;
        setRecentlyUploadedId(docId);
        // Single document selection - replace any previous selection
        setSelectedDocIds([docId]);
      }
    },
    onError: (error) => {
      console.error('Document upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
      setUploadingFile(false);
    },
  });

  const addUrlMutation = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      return apiRequest("POST", "/api/documents/by-url", { url, title });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: "URL added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUrl("");
      if (data?.id) {
        // Single document selection - replace any previous selection
        setSelectedDocIds([data.id]);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add URL",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${docId}`, {});
      if (!response.ok) {
        throw new Error("Failed to delete document");
      }
      return { docId };
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedDocIds(prev => prev.filter(id => id !== data.docId));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      console.log('Starting chat with docs:', docIds);
      const response = await apiRequest("POST", "/api/docchat/session", { docIds });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to start chat' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Chat API response:', data);
      
      const chatId = data.id || data.chatId;
      if (!chatId) {
        throw new Error('Invalid response: missing chat ID');
      }
      
      return { ...data, id: chatId };
    },
    onSuccess: (data) => {
      console.log('Chat started successfully, ID:', data.id);
      setLocation(`/docchat/${data.id}`);
    },
    onError: (error) => {
      console.error('Start chat error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start chat session",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParams = async (file: any) => {
    setUploadingFile(true);
    const response = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
      headers: {
        'Content-Type': file.type,
      },
    };
  };

  const handleUploadComplete = (result: any) => {
    const successful = result.successful?.[0];
    if (successful) {
      uploadDocumentMutation.mutate({
        uploadURL: successful.uploadURL,
        fileName: successful.name,
        fileSize: successful.size,
        fileType: successful.type,
      });
    } else {
      setUploadingFile(false);
    }
  };

  const handleAddUrl = () => {
    if (!url.trim()) return;
    
    let title = url;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      title = 'YouTube Video';
    } else {
      try {
        const urlObj = new URL(url);
        title = urlObj.hostname;
      } catch (e) {
        title = url;
      }
    }
    
    addUrlMutation.mutate({ url, title });
  };

  const handleStartChat = () => {
    if (selectedDocIds.length === 0) {
      toast({
        title: "No document selected",
        description: "Please select a document to start chatting",
        variant: "destructive",
      });
      return;
    }
    startChatMutation.mutate(selectedDocIds);
  };

  const toggleDocSelection = (docId: string) => {
    // Single document selection only - clicking same doc deselects, clicking different doc replaces
    setSelectedDocIds(prev => 
      prev.includes(docId) 
        ? [] // Deselect if same doc clicked
        : [docId] // Replace with new selection
    );
  };

  const selectedDocuments = documents.filter(doc => selectedDocIds.includes(doc.id));

  if (documentsLoading) {
    return <LoadingScreen />;
  }

  const firstName = user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-3">
            Hello {firstName}, Upload and chat with your documents
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload lecture notes, articles, any document, really, and VaktaAI will help you understand them. 
            You can chat with one document at a time.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="upload" data-testid="tab-upload">Upload</TabsTrigger>
            <TabsTrigger value="previous" data-testid="tab-previous-sources">Previous Sources</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {/* Supported Formats */}
            <div className="bg-card rounded-xl p-8 border border-border">
              <p className="text-center text-sm text-muted-foreground mb-4">
                VaktaAI now supports
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap mb-8">
                <FileText className="w-8 h-8 text-foreground" strokeWidth={1.5} />
                <File className="w-8 h-8 text-foreground" strokeWidth={1.5} />
                <FileImage className="w-8 h-8 text-foreground" strokeWidth={1.5} />
                <Youtube className="w-8 h-8 text-foreground" strokeWidth={1.5} />
                <Music className="w-8 h-8 text-foreground" strokeWidth={1.5} />
                <Video className="w-8 h-8 text-foreground" strokeWidth={1.5} />
              </div>

              {/* Upload Area */}
              <div className="relative mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Upload PDFs, PPTx, Docx, MP3, MP4 or Paste a URL"
                      className="pl-10 h-12 text-base"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && url.trim()) {
                          handleAddUrl();
                        }
                      }}
                      data-testid="input-url"
                    />
                  </div>
                  <ObjectUploader
                    onGetUploadParameters={handleGetUploadParams}
                    onComplete={handleUploadComplete}
                    maxNumberOfFiles={1}
                    maxFileSize={52428800}
                    directPicker={true}
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      disabled={uploadingFile}
                      className="gap-2 h-12 shrink-0"
                      data-testid="button-add-file"
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add
                        </>
                      )}
                    </Button>
                  </ObjectUploader>
                </div>
              </div>
            </div>

            {/* Recently Uploaded Document */}
            {recentlyUploadedId && documents.find(d => d.id === recentlyUploadedId) && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Just Uploaded</h3>
                {(() => {
                  const doc = documents.find(d => d.id === recentlyUploadedId)!;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate cursor-pointer transition-all"
                      onClick={() => toggleDocSelection(doc.id)}
                      data-testid={`doc-item-upload-${doc.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-5 h-5 rounded border-2 transition-colors ${
                          selectedDocIds.includes(doc.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}>
                          {selectedDocIds.includes(doc.id) && (
                            <svg className="w-full h-full text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{doc.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">{doc.sourceType}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocumentMutation.mutate(doc.id);
                          setRecentlyUploadedId(null);
                        }}
                        data-testid={`button-delete-upload-${doc.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })()}
                <button
                  onClick={() => setActiveTab('previous')}
                  className="w-full mt-3 text-sm text-primary hover:underline text-center"
                  data-testid="link-view-all-sources"
                >
                  View all {documents.length} documents in Previous Sources
                </button>
              </div>
            )}
          </TabsContent>

          {/* Previous Sources Tab */}
          <TabsContent value="previous" className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-6">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No previous documents</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate cursor-pointer transition-all"
                      onClick={() => toggleDocSelection(doc.id)}
                      data-testid={`doc-item-${doc.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-5 h-5 rounded border-2 transition-colors ${
                          selectedDocIds.includes(doc.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}>
                          {selectedDocIds.includes(doc.id) && (
                            <svg className="w-full h-full text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{doc.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">{doc.sourceType}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocumentMutation.mutate(doc.id);
                        }}
                        data-testid={`button-delete-${doc.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Selected Documents Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-muted rounded-md text-sm font-medium text-muted-foreground">
                  Selected Documents
                </span>
                {activeTab === 'upload' && documents.length > 0 && (
                  <button
                    onClick={() => setActiveTab('previous')}
                    className="text-sm text-primary hover:underline"
                    data-testid="link-add-from-sources"
                  >
                    + Add new file to sources
                  </button>
                )}
              </div>
              
              {selectedDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents selected</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm"
                      data-testid={`selected-doc-${doc.id}`}
                    >
                      <span className="text-foreground">{doc.title}</span>
                      <button
                        onClick={() => toggleDocSelection(doc.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-remove-selected-${doc.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              onClick={handleStartChat}
              disabled={selectedDocIds.length === 0 || startChatMutation.isPending}
              size="lg"
              className="shrink-0"
              data-testid="button-start-chat"
            >
              {startChatMutation.isPending ? 'Starting...' : 'Start Chat'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

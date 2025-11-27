import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
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
  Globe,
  Sparkles,
  Brain,
  Search,
  Quote,
  Lightbulb,
  BookOpen,
  ChevronRight,
  ArrowRight,
  MessageSquare,
  Play,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Document } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const supportedFormatDefs = [
  { icon: FileText, nameKey: 'docSathi.formatBadge.pdf', color: 'text-red-500' },
  { icon: File, nameKey: 'docSathi.formatBadge.doc', color: 'text-blue-500' },
  { icon: FileImage, nameKey: 'docSathi.formatBadge.images', color: 'text-green-500' },
  { icon: Youtube, nameKey: 'docSathi.formatBadge.youtube', color: 'text-red-600' },
  { icon: Music, nameKey: 'docSathi.formatBadge.audio', color: 'text-purple-500' },
  { icon: Globe, nameKey: 'docSathi.formatBadge.web', color: 'text-cyan-500' },
];

const features = [
  { icon: Brain, titleKey: 'docSathi.features.smart', descKey: 'docSathi.features.smartDesc', color: 'from-purple-500 to-indigo-600' },
  { icon: Quote, titleKey: 'docSathi.features.citations', descKey: 'docSathi.features.citationsDesc', color: 'from-blue-500 to-cyan-600' },
  { icon: Layers, titleKey: 'docSathi.features.multi', descKey: 'docSathi.features.multiDesc', color: 'from-green-500 to-emerald-600' },
  { icon: Sparkles, titleKey: 'docSathi.features.actions', descKey: 'docSathi.features.actionsDesc', color: 'from-orange-500 to-amber-600' },
];

export default function DocChatSources() {
  const { t } = useLanguage();
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
      toast({ title: t('toast.success'), description: t('docSathi.toast.uploaded') });
      await queryClient.invalidateQueries({ queryKey: ["/api/documents"], refetchType: 'active' });
      setUploadingFile(false);
      if (data.id || data.documentId) {
        const docId = data.id || data.documentId;
        setRecentlyUploadedId(docId);
        setSelectedDocIds([docId]);
      }
    },
    onError: () => {
      toast({ title: t('toast.error'), description: t('docSathi.toast.uploadFailed'), variant: "destructive" });
      setUploadingFile(false);
    },
  });

  const addUrlMutation = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      return apiRequest("POST", "/api/documents/by-url", { url, title });
    },
    onSuccess: (data: any) => {
      toast({ title: t('toast.success'), description: t('docSathi.toast.urlAdded') });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUrl("");
      if (data?.id) {
        setSelectedDocIds([data.id]);
      }
    },
    onError: () => {
      toast({ title: t('toast.error'), description: t('docSathi.toast.urlFailed'), variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${docId}`, {});
      if (!response.ok) throw new Error("Failed to delete document");
      return { docId };
    },
    onSuccess: (data) => {
      toast({ title: t('toast.success'), description: t('docSathi.toast.deleted') });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedDocIds(prev => prev.filter(id => id !== data.docId));
    },
    onError: () => {
      toast({ title: t('toast.error'), description: t('docSathi.toast.deleteFailed'), variant: "destructive" });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      const response = await apiRequest("POST", "/api/docsathi/session", { docIds });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('docSathi.toast.chatFailed') }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const chatId = data.id || data.chatId;
      if (!chatId) throw new Error('Invalid response: missing chat ID');
      return { ...data, id: chatId };
    },
    onSuccess: (data) => {
      setLocation(`/docsathi/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: t('toast.error'),
        description: error instanceof Error ? error.message : t('docSathi.toast.chatFailed'),
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
      body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
    });
    if (!response.ok) throw new Error('Failed to get upload URL');
    const data = await response.json();
    return { method: 'PUT' as const, url: data.uploadURL, headers: { 'Content-Type': file.type } };
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
      title = t('docSathi.format.youtube');
    } else {
      try { title = new URL(url).hostname; } catch (e) { title = url; }
    }
    addUrlMutation.mutate({ url, title });
  };

  const handleStartChat = () => {
    if (selectedDocIds.length === 0) {
      toast({ title: t('docSathi.toast.noDocSelected'), description: t('docSathi.toast.selectDocFirst'), variant: "destructive" });
      return;
    }
    startChatMutation.mutate(selectedDocIds);
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds(prev => prev.includes(docId) ? [] : [docId]);
  };

  const selectedDocuments = documents.filter(doc => selectedDocIds.includes(doc.id));
  const firstName = user?.firstName || user?.email?.split('@')[0] || t('common.userFallback');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {documentsLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('common.loading') || 'Loading...'}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Hero Section - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center mb-3 sm:mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-2xl">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2 sm:space-y-3"
          >
            <Badge className="mb-2 sm:mb-3 px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 text-blue-700 dark:text-blue-300 border-0 text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
              {t('docSathi.subtitle')}
            </Badge>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold px-2">
              <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent">
                {t('docSathi.title')}
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed px-4">
              {t('docSathi.description')}
            </p>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">

          {/* Left - Upload Section */}
          <div className="lg:col-span-2 space-y-6">

            {/* Upload Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-xl"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2 mb-6">
                  <TabsTrigger value="upload" data-testid="tab-upload">{t('docSathi.tabUpload')}</TabsTrigger>
                  <TabsTrigger value="previous" data-testid="tab-previous-sources">{t('docSathi.tabPrevious')}</TabsTrigger>
                </TabsList>

                {/* Upload Tab */}
                <TabsContent value="upload" className="space-y-6">
                  {/* Clickable Icon Panel for File Upload - Mobile Optimized */}
                  <ObjectUploader
                    onGetUploadParameters={handleGetUploadParams}
                    onComplete={handleUploadComplete}
                    maxNumberOfFiles={1}
                    maxFileSize={52428800}
                  >
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all border-2 border-transparent hover:border-cyan-500 active:border-cyan-600">
                      <p className="text-center text-slate-600 dark:text-slate-400 mb-3 sm:mb-4 text-xs sm:text-sm font-medium">
                        {t('docSathi.supports')}
                      </p>
                      <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-3 sm:gap-4">
                        {supportedFormatDefs.map((format) => (
                          <div key={format.nameKey} className="flex flex-col items-center gap-1.5 min-w-0">
                            <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                              <format.icon className={`w-6 h-6 sm:w-5 sm:h-5 ${format.color}`} />
                            </div>
                            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate max-w-full text-center">{t(format.nameKey)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ObjectUploader>

                  {/* URL Input with Add Button - Mobile Optimized */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 relative">
                      <Paperclip className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={t('docSathi.uploadPlaceholder')}
                        className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500"
                        onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) handleAddUrl(); }}
                        data-testid="input-url"
                      />
                    </div>
                    <Button
                      variant="default"
                      size="lg"
                      onClick={handleAddUrl}
                      disabled={!url.trim() || addUrlMutation.isPending}
                      className="h-12 sm:h-14 px-4 sm:px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-sm sm:text-base shrink-0"
                      data-testid="button-add-url"
                    >
                      {addUrlMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 animate-spin" /><span className="hidden sm:inline">{t('docSathi.adding')}</span><span className="sm:hidden">...</span></>
                      ) : (
                        <><Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />{t('docSathi.add')}</>
                      )}
                    </Button>
                  </div>

                  {/* Recently Uploaded */}
                  {recentlyUploadedId && documents.find(d => d.id === recentlyUploadedId) && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">{t('docSathi.justUploaded')}</span>
                      </div>
                      {(() => {
                        const doc = documents.find(d => d.id === recentlyUploadedId)!;
                        return (
                          <div
                            onClick={() => toggleDocSelection(doc.id)}
                            className={`flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border-2 cursor-pointer transition-all ${
                              selectedDocIds.includes(doc.id) 
                                ? 'border-blue-500 shadow-md' 
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                            data-testid={`doc-item-upload-${doc.id}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                selectedDocIds.includes(doc.id)
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {selectedDocIds.includes(doc.id) && (
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                                <p className="text-sm text-gray-500 capitalize">{doc.sourceType}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
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
                    </div>
                  )}
                </TabsContent>

                {/* Previous Sources Tab */}
                <TabsContent value="previous" className="space-y-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">{t('docSathi.noPrevious')}</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 max-h-80 overflow-y-auto pr-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => toggleDocSelection(doc.id)}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedDocIds.includes(doc.id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                          }`}
                          data-testid={`doc-item-${doc.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedDocIds.includes(doc.id)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {selectedDocIds.includes(doc.id) && (
                                <CheckCircle2 className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                              <p className="text-sm text-gray-500 capitalize">{doc.sourceType}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
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
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Start Chat Section - Sticky on Mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 text-white shadow-xl sticky bottom-4 z-10 lg:static lg:z-auto"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="hidden sm:block">
                  <h3 className="font-bold text-lg sm:text-xl mb-2">{t('docSathi.selectedDocs')}</h3>
                  {selectedDocuments.length === 0 ? (
                    <p className="text-white/80 text-sm">{t('docSathi.noDocsSelected')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedDocuments.map((doc) => (
                        <Badge key={doc.id} className="bg-white/20 text-white border-0 text-xs">
                          {doc.title}
                          <button onClick={() => toggleDocSelection(doc.id)} className="ml-2">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleStartChat}
                  disabled={selectedDocIds.length === 0 || startChatMutation.isPending}
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 shadow-lg w-full sm:min-w-[160px] sm:w-auto h-12 sm:h-auto font-semibold"
                  data-testid="button-start-chat"
                >
                  {startChatMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('docSathi.starting')}</>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5 mr-2" />
                      {t('docSathi.startChat')}
                      {selectedDocuments.length > 0 && (
                        <Badge className="ml-2 bg-blue-600 text-white border-0 sm:hidden">
                          {selectedDocuments.length}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Features Grid - Hidden on Mobile */}
            <div className="hidden lg:grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t(feature.descKey)}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            {/* Quick Actions Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50"
            >
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                {t('docSathi.features.actions')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: BookOpen, label: t('docSathi.action.summary'), color: 'bg-blue-500' },
                  { icon: Lightbulb, label: t('docSathi.action.highlights'), color: 'bg-amber-500' },
                  { icon: Brain, label: t('docSathi.action.quiz'), color: 'bg-purple-500' },
                  { icon: Layers, label: t('docSathi.action.flashcards'), color: 'bg-green-500' },
                ].map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl"
            >
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                {t('aiMentor.howItWorks')}
              </h3>
              <div className="space-y-3">
                {[
                  t('docSathi.step1'),
                  t('docSathi.step2'),
                  t('docSathi.step3'),
                  t('docSathi.step4'),
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-white/90 pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Pro Tip */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-xl"
            >
              <Lightbulb className="w-8 h-8 mb-3 opacity-90" />
              <h3 className="font-bold text-lg mb-2">{t('aiMentor.proTip')}</h3>
              <p className="text-sm leading-relaxed text-white/90">
                {t('docSathi.proTipText')}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

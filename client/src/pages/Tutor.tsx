import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TutorSetupWizard, { type TutorConfig } from "@/components/tutor/TutorSetupWizard";
import TutorSession from "@/components/tutor/TutorSession";
import UnityAvatar, { UnityAvatarHandle } from "@/components/tutor/UnityAvatar";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Sparkles, Video, MessageSquare, BookOpen,
  Clock, TrendingUp, Zap, Target, ChevronRight, Loader2,
  Atom, Beaker, Calculator, Dna, Mic, Play, ArrowRight,
  Star, Users, Lightbulb, Settings
} from "lucide-react";
import mentorAvatar from "@assets/generated_images/female_teacher_gradient_background.png";

const subjects = [
  { 
    id: 'physics', 
    nameKey: 'subject.physics',
    icon: Atom, 
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    topicKeys: ['topic.physics.mechanics', 'topic.physics.optics', 'topic.physics.thermodynamics', 'topic.physics.electromagnetism']
  },
  { 
    id: 'chemistry', 
    nameKey: 'subject.chemistry',
    icon: Beaker, 
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    topicKeys: ['topic.chemistry.organic', 'topic.chemistry.inorganic', 'topic.chemistry.physical', 'topic.chemistry.equilibrium']
  },
  { 
    id: 'maths', 
    nameKey: 'subject.maths',
    icon: Calculator, 
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    topicKeys: ['topic.maths.calculus', 'topic.maths.algebra', 'topic.maths.trigonometry', 'topic.maths.coordinate']
  },
  { 
    id: 'biology', 
    nameKey: 'subject.biology',
    icon: Dna, 
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    topicKeys: ['topic.biology.botany', 'topic.biology.zoology', 'topic.biology.physiology', 'topic.biology.genetics']
  },
];

const features = [
  { icon: Brain, titleKey: 'aiMentor.features.smart', descKey: 'aiMentor.features.smartDesc', color: 'from-purple-500 to-indigo-600' },
  { icon: Mic, titleKey: 'aiMentor.features.voice', descKey: 'aiMentor.features.voiceDesc', color: 'from-blue-500 to-cyan-600' },
  { icon: BookOpen, titleKey: 'aiMentor.features.subjects', descKey: 'aiMentor.features.subjectsDesc', color: 'from-pink-500 to-rose-600' },
  { icon: Zap, titleKey: 'aiMentor.features.instant', descKey: 'aiMentor.features.instantDesc', color: 'from-orange-500 to-amber-600' },
];

export default function Tutor() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isPreloadingAvatar, setIsPreloadingAvatar] = useState(false);
  const [avatarPreloaded, setAvatarPreloaded] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [quickStartSubject, setQuickStartSubject] = useState<string>('physics');
  const [quickStartTriggered, setQuickStartTriggered] = useState(false);
  const preloadAvatarRef = useRef<UnityAvatarHandle>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const triggerQuickStart = (subject: string = 'physics') => {
    const defaultConfig: TutorConfig = {
      subject: subject,
      topic: 'mixed',
      level: 'medium',
      language: 'hinglish',
      examType: 'competitive',
    };
    startSessionMutation.mutate(defaultConfig);
  };

  const handleQuickStart = () => {
    triggerQuickStart(quickStartSubject);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isQuickStart = params.get('quick') === 'true';
    
    if (isQuickStart && !quickStartTriggered && !currentSessionId) {
      setQuickStartTriggered(true);
      window.history.replaceState({}, '', '/tutor');
      triggerQuickStart('physics');
    }
  }, [quickStartTriggered, currentSessionId]);

  const { data: recentSessions } = useQuery({
    queryKey: ["/api/chats"],
    select: (data: any[]) =>
      data?.filter((chat: any) => chat.mode === 'tutor')?.slice(0, 3) || [],
  });

  const startSessionMutation = useMutation({
    mutationFn: async (config: TutorConfig) => {
      const personaId = 'garima';
      const response = await apiRequest("POST", "/api/tutor/optimized/session/start", {
        subject: config.subject,
        topic: config.topic,
        level: config.level,
        language: config.language,
        personaId,
        examType: config.examType,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start session: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      if (!data || !data.session || !data.session.chatId) {
        throw new Error('Invalid response from server - missing chat ID');
      }
      return data;
    },
    onSuccess: (data: any) => {
      const chatId = data.session.chatId;
      setCurrentSessionId(chatId);

      if (data.message && data.message.trim()) {
        const greetingMessage = {
          id: `greeting-${Date.now()}`,
          chatId: chatId,
          role: 'assistant',
          content: data.message.trim(),
          tool: null,
          metadata: {
            personaId: data.session.personaId,
            emotion: data.emotion || 'enthusiastic',
            phase: 'greeting',
            isGreeting: true
          },
          createdAt: new Date().toISOString()
        };
        queryClient.setQueryData([`/api/chats/${chatId}/messages`], [greetingMessage]);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: t('toast.sessionStarted'),
        description: t('toast.sessionStartedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toast.error'),
        description: error.message || t('toast.failedToStart'),
        variant: "destructive",
      });
    },
  });

  const handleStartSession = (config: TutorConfig) => {
    startSessionMutation.mutate(config);
  };

  const handleOpenSetupWizard = (subject?: string) => {
    if (subject) setSelectedSubject(subject);
    setShowSetupWizard(true);
    setIsPreloadingAvatar(true);
  };

  const handlePreloadReady = () => {
    setAvatarPreloaded(true);
    setIsPreloadingAvatar(false);
  };

  const handlePreloadError = (error: string) => {
    console.warn('[Tutor] Avatar preload failed:', error);
    setIsPreloadingAvatar(false);
  };

  const handleEndSession = () => {
    setCurrentSessionId(null);
    toast({
      title: t('toast.sessionEnded'),
      description: t('toast.sessionEndedDesc'),
    });
  };

  if (currentSessionId) {
    return (
      <TutorSession
        chatId={currentSessionId}
        onEndSession={handleEndSession}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl">
                <img src={mentorAvatar} alt="AI Mentor" className="w-full h-full object-cover" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <Badge className="mb-3 px-4 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 text-purple-700 dark:text-purple-300 border-0">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {t('aiMentor.subtitle')}
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                {t('aiMentor.title')}
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {t('aiMentor.description')}
            </p>
          </motion.div>

          {/* Quick Start Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 max-w-2xl mx-auto"
          >
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-3">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{t('aiMentor.quickStart')}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('aiMentor.selectSubjectStart')}</h3>
              </div>

              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
                {subjects.map((subject) => {
                  const Icon = subject.icon;
                  const isSelected = quickStartSubject === subject.id;
                  return (
                    <button
                      key={subject.id}
                      onClick={() => setQuickStartSubject(subject.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                        isSelected
                          ? `bg-gradient-to-r ${subject.color} text-white shadow-lg scale-105`
                          : `${subject.bgColor} ${subject.borderColor} border-2 text-gray-700 dark:text-gray-300 hover:scale-102`
                      }`}
                      data-testid={`quick-subject-${subject.id}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t(subject.nameKey)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleQuickStart}
                  disabled={startSessionMutation.isPending}
                  size="lg"
                  className="flex-1 sm:flex-none group px-8 py-6 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white rounded-xl font-semibold text-base shadow-xl"
                  data-testid="button-quick-start"
                >
                  {startSessionMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('aiMentor.startingSession')}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      {t('aiMentor.startNow')}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition" />
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleOpenSetupWizard(quickStartSubject)}
                  variant="outline"
                  size="lg"
                  className="px-6 py-6 rounded-xl font-medium"
                  data-testid="button-customize"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  {t('aiMentor.customize')}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-12"
        >
          {[
            { icon: Clock, label: t('aiMentor.stats.sessions'), value: recentSessions?.length || 0 },
            { icon: MessageSquare, label: t('aiMentor.stats.questions'), value: '142' },
            { icon: Target, label: t('aiMentor.stats.accuracy'), value: '94%' },
            { icon: TrendingUp, label: t('aiMentor.stats.progress'), value: '+12%' },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
            >
              <stat.icon className="w-5 h-5 text-purple-500 mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Subject Cards - Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-12"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('aiMentor.chooseSubject')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{t('aiMentor.selectTopic')}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => handleOpenSetupWizard(subject.id)}
                className={`relative cursor-pointer rounded-2xl p-5 sm:p-6 border-2 ${subject.borderColor} ${subject.bgColor} bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300`}
                data-testid={`button-subject-${subject.id}`}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <subject.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-2">
                  {t(subject.nameKey)}
                </h3>
                <div className="flex flex-wrap gap-1">
                  {subject.topicKeys.slice(0, 2).map((topicKey) => (
                    <Badge key={topicKey} variant="secondary" className="text-xs">
                      {t(topicKey)}
                    </Badge>
                  ))}
                  {subject.topicKeys.length > 2 && (
                    <Badge variant="outline" className="text-xs">+{subject.topicKeys.length - 2}</Badge>
                  )}
                </div>
                <ChevronRight className="absolute top-1/2 right-4 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">

          {/* Left - Features & How it works */}
          <div className="lg:col-span-2 space-y-6">

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + index * 0.1 }}
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

            {/* How It Works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl"
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                {t('aiMentor.howItWorks')}
              </h3>
              <div className="space-y-4">
                {[
                  { step: 1, text: t('aiMentor.step1') },
                  { step: 2, text: t('aiMentor.step2') },
                  { step: 3, text: t('aiMentor.step3') },
                  { step: 4, text: t('aiMentor.step4') },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      {item.step}
                    </div>
                    <p className="text-sm sm:text-base pt-1 text-white/90">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            {/* Mentor Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-700/50"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-purple-300 dark:ring-purple-600 shadow-lg">
                  <img src={mentorAvatar} alt="Garima" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t('mentors.garima.name')}</h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400">{t('mentors.garima.subject')}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500">{t('common.onlineNow')}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('avatar.greeting')}
              </p>
              <Button 
                onClick={() => handleOpenSetupWizard()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                data-testid="button-start-with-mentor"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('aiMentor.startSession')}
              </Button>
            </motion.div>

            {/* Recent Sessions */}
            {recentSessions && recentSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
              >
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  {t('aiMentor.recentSessions')}
                </h3>
                <div className="space-y-3">
                  {recentSessions.map((session: any, index: number) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 + index * 0.1 }}
                      onClick={() => setCurrentSessionId(session.id)}
                      className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl hover:shadow-md transition cursor-pointer border border-purple-200/50 dark:border-purple-700/50"
                      data-testid={`session-card-${session.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {session.subject || session.title || t('aiMentor.mentorSession')}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {session.topic || t('aiMentor.generalDiscussion')}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Pro Tip */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-xl"
            >
              <Lightbulb className="w-8 h-8 mb-3 opacity-90" />
              <h3 className="font-bold text-lg mb-2">{t('aiMentor.proTip')}</h3>
              <p className="text-sm leading-relaxed text-white/90">
                {t('aiMentor.proTipText')}
              </p>
            </motion.div>

            {/* Learning Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
            >
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">{t('aiMentor.learningStats')}</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('aiMentor.stats.thisWeek')}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">12 {t('aiMentor.hours')}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('aiMentor.stats.conceptsMastered')}</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">24</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <TutorSetupWizard
        open={showSetupWizard}
        onOpenChange={setShowSetupWizard}
        onSubmit={handleStartSession}
      />

      {/* Hidden Avatar Preloader */}
      {isPreloadingAvatar && !avatarPreloaded && (
        <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0, zIndex: -9999 }}>
          <UnityAvatar
            ref={preloadAvatarRef}
            className="w-0 h-0"
            defaultAvatar="priya"
            onReady={handlePreloadReady}
            onError={handlePreloadError}
          />
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TutorSetupWizard, { type TutorConfig } from "@/components/tutor/TutorSetupWizard";
import TutorSession from "@/components/tutor/TutorSession";
import UnityAvatar, { UnityAvatarHandle } from "@/components/tutor/UnityAvatar";
import { motion } from "framer-motion";
import {
  Brain, Sparkles, Video, MessageSquare, BookOpen,
  Clock, TrendingUp, Zap, Target, ChevronRight, Loader2
} from "lucide-react";

export default function Tutor() {
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isPreloadingAvatar, setIsPreloadingAvatar] = useState(false);
  const [avatarPreloaded, setAvatarPreloaded] = useState(false);
  const preloadAvatarRef = useRef<UnityAvatarHandle>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recent tutor sessions
  const { data: recentSessions } = useQuery({
    queryKey: ["/api/chats"],
    select: (data: any[]) =>
      data?.filter((chat: any) => chat.mode === 'tutor')?.slice(0, 3) || [],
  });

  const startSessionMutation = useMutation({
    mutationFn: async (config: TutorConfig) => {
      // ALWAYS use Garima Ma'am (female voice) for all subjects
      const personaId = 'garima';

      const response = await apiRequest("POST", "/api/tutor/optimized/session/start", {
        subject: config.subject,
        topic: config.topic,
        level: config.level,
        language: config.language,
        personaId,
        examType: config.examType, // Board Exam vs Competitive Exam
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

      // Display Garima Ma'am as the mentor name
      const personaName = data.session.personaId === 'garima' ? 'Garima Ma\'am' : 'your mentor';

      toast({
        title: "Session Started",
        description: `Your AI mentor ${personaName} is ready! 🎓`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start mentor session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartSession = (config: TutorConfig) => {
    startSessionMutation.mutate(config);
  };

  // Open setup wizard and start preloading avatar
  const handleOpenSetupWizard = () => {
    console.log('[Tutor] 🎬 Starting avatar preload...');
    setShowSetupWizard(true);
    setIsPreloadingAvatar(true);
  };

  // Handle avatar preload ready
  const handlePreloadReady = () => {
    console.log('[Tutor] ✅ Avatar preloaded successfully!');
    setAvatarPreloaded(true);
    setIsPreloadingAvatar(false);
    
    toast({
      title: "Avatar Ready!",
      description: "Your AI mentor is loaded and ready to go! 🎭",
    });
  };

  // Handle avatar preload error
  const handlePreloadError = (error: string) => {
    console.warn('[Tutor] ⚠️ Avatar preload failed:', error);
    setIsPreloadingAvatar(false);
    // Don't show error to user, avatar will load normally in session
  };

  const handleEndSession = () => {
    setCurrentSessionId(null);
    toast({
      title: "Session Ended",
      description: "Your mentor session has been saved.",
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(240,109,31,0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(132,61,255,0.08),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/30 to-secondary-500/30 blur-3xl rounded-full animate-pulse-slow" />
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-2xl">
                <Brain className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold">
              <span className="bg-gradient-to-r from-primary-600 via-secondary-600 to-pink-600 bg-clip-text text-transparent">
                AI Mentor
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 font-medium">
              Learn with Your AI Mentor 🎓
            </p>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Personalized learning sessions with Garima Ma'am - your 24/7 AI mentor
            </p>
          </motion.div>

          {/* Start Session Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <button
              onClick={handleOpenSetupWizard}
              disabled={startSessionMutation.isPending || isPreloadingAvatar}
              className="group relative inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white rounded-2xl font-semibold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-new-session"
            >
              {startSessionMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Starting Session...</span>
                </>
              ) : isPreloadingAvatar ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading Avatar...</span>
                </>
              ) : avatarPreloaded ? (
                <>
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  <span>Avatar Ready - Start Session!</span>
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition" />
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Start New Session</span>
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition" />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-secondary-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-300 -z-10" />
            </button>
          </motion.div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16"
        >
          {[
            { icon: Clock, label: 'Sessions', value: recentSessions?.length || 0, emoji: '⏱️' },
            { icon: MessageSquare, label: 'Questions Asked', value: '142', emoji: '💬' },
            { icon: Target, label: 'Accuracy', value: '94%', emoji: '🎯' },
            { icon: TrendingUp, label: 'Progress', value: '+12%', emoji: '📈' },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg hover:shadow-xl transition cursor-pointer"
            >
              <div className="text-2xl sm:text-3xl mb-2">{stat.emoji}</div>
              <div className="text-xl sm:text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left - Features */}
          <div className="lg:col-span-2 space-y-6">

            {/* Feature Cards */}
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Why Choose AI Mentor? 🌟
              </h3>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  {
                    icon: Brain,
                    emoji: '🧠',
                    title: 'Smart AI Mentor',
                    desc: 'Garima Ma\'am explains concepts in natural English or Hindi',
                    color: 'from-purple-500 to-indigo-600',
                  },
                  {
                    icon: Video,
                    emoji: '🎤',
                    title: 'Voice Learning',
                    desc: 'Talk to your AI mentor like a real conversation',
                    color: 'from-blue-500 to-cyan-600',
                  },
                  {
                    icon: BookOpen,
                    emoji: '📚',
                    title: 'All Subjects',
                    desc: 'Physics, Chemistry, Maths, Biology - sab covered',
                    color: 'from-pink-500 to-rose-600',
                  },
                  {
                    icon: Zap,
                    emoji: '⚡',
                    title: 'Instant Doubts',
                    desc: 'No waiting - ask any doubt, get instant answers',
                    color: 'from-orange-500 to-amber-600',
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl">{feature.emoji}</span>
                      <h4 className="font-bold text-lg">{feature.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* How It Works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              className="bg-gradient-to-br from-primary-500 to-secondary-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl"
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Kaise Kaam Karta Hai?
              </h3>
              <div className="space-y-4">
                {[
                  { step: 1, text: 'Choose your subject and topic' },
                  { step: 2, text: 'Pick your learning level (Class 6-12)' },
                  { step: 3, text: 'Start talking to Garima Ma\'am' },
                  { step: 4, text: 'Ask doubts, practice problems, master concepts!' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 font-bold">
                      {item.step}
                    </div>
                    <p className="text-base sm:text-lg pt-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>

          {/* Right - Recent Sessions */}
          <div className="space-y-6">

            {/* Recent Sessions */}
            {recentSessions && recentSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-600" />
                  Recent Sessions
                </h3>
                <div className="space-y-3">
                  {recentSessions.map((session: any, index: number) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      onClick={() => setCurrentSessionId(session.id)}
                      className="p-4 bg-gradient-to-r from-orange-50 to-purple-50 rounded-xl hover:shadow-md transition cursor-pointer border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1 truncate">
                            {session.subject || session.title || 'Mentor Session'}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {session.topic || 'General discussion'}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tips Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
              className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl"
            >
              <div className="text-3xl mb-3">💡</div>
              <h3 className="font-bold text-lg mb-2">Pro Tip</h3>
              <p className="text-sm leading-relaxed">
                Ask "Can you explain this with an example?" for better understanding. Garima Ma'am loves explaining with real-life examples!
              </p>
            </motion.div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
            >
              <h3 className="font-bold text-lg mb-4">Your Learning Stats</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="text-sm font-semibold">12 hours</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-600 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Concepts Mastered</span>
                    <span className="font-bold text-primary-600">24</span>
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

      {/* Hidden Avatar Preloader - loads Unity assets in background */}
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

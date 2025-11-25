import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Loader2, Brain, FileText, Video, Globe, Sparkles, Upload, Search } from 'lucide-react';

export type LoadingContext =
  | "initial"
  | "upload"
  | "processing"
  | "quiz"
  | "ai-thinking"
  | "doc_upload"
  | "youtube_upload"
  | "web_upload"
  | "quiz_generation"
  | "note_generation"
  | "general";

interface LoadingScreenProps {
  context?: LoadingContext;
  message?: string;
  fullScreen?: boolean;
}

interface LoadingContent {
  title: string;
  subtitle: string;
  emoji: string;
  tips: string[];
  icon: React.ComponentType<any>;
}

const loadingContent: Record<LoadingContext, LoadingContent> = {
  initial: {
    title: 'Preparing VaktaAI...',
    subtitle: 'Just a few seconds',
    emoji: '🚀',
    icon: Sparkles,
    tips: [
      '💡 Pro tip: Use keyboard shortcuts for faster navigation',
      '📚 Did you know? You can chat with your PDFs in English or Hindi',
      '🎯 Set daily goals to stay consistent',
      '⚡ AI Mentor is available 24/7 for all your doubts',
      '🔥 Maintain your streak to earn bonus XP',
      '📊 Track your progress with detailed analytics',
    ]
  },
  upload: {
    title: 'Uploading document...',
    subtitle: 'Please wait, processing your file',
    emoji: '📄',
    icon: Upload,
    tips: [
      '📑 Supported formats: PDF, DOCX, PPTX',
      '🔍 AI automatically creates smart summaries',
      '💬 You can chat with your uploaded documents',
      '📊 Generate quizzes from any document instantly',
      '🎯 AI extracts key concepts and formulas',
      '📚 Your documents are securely stored',
    ]
  },
  processing: {
    title: 'AI is analyzing document...',
    subtitle: 'Creating searchable database',
    emoji: '🔄',
    icon: Search,
    tips: [
      '🤖 AI is reading every page carefully',
      '🔗 Creating connections between concepts',
      '🎯 Identifying key topics and formulas',
      '📝 Preparing smart suggestions for you',
      '🧠 Understanding document structure',
      '✨ Building semantic search index',
    ]
  },
  quiz: {
    title: 'Generating quiz...',
    subtitle: 'AI is creating personalized questions',
    emoji: '🎯',
    icon: Sparkles,
    tips: [
      '❓ Questions match your learning level',
      '📊 Get instant feedback with explanations',
      '🏆 Earn XP and badges for completing quizzes',
      '📈 Track your progress over time',
      '🎓 AI adapts difficulty based on performance',
      '💪 Practice makes perfect!',
    ]
  },
  'ai-thinking': {
    title: 'AI is thinking...',
    subtitle: 'Analyzing your question',
    emoji: '🧠',
    icon: Brain,
    tips: [
      '🤔 AI is searching through your documents',
      '🔍 Finding the most relevant information',
      '💡 Preparing a detailed explanation',
      '📚 Including citations and page numbers',
      '✨ Crafting natural bilingual response',
      '🎯 Ensuring accuracy and clarity',
    ]
  },
  doc_upload: {
    title: 'Uploading document to AI...',
    subtitle: 'Understanding every page',
    emoji: '📄',
    icon: FileText,
    tips: [
      '📖 Reading text from every page',
      '🖼️ Processing images and diagrams',
      '📊 Extracting tables and charts',
      '🔗 Creating chapter links',
      '🎯 Identifying important topics',
      '✅ Almost done, hang tight!',
    ]
  },
  youtube_upload: {
    title: 'Extracting video transcript...',
    subtitle: 'Converting every second to text',
    emoji: '🎥',
    icon: Video,
    tips: [
      '🎤 Extracting audio from video',
      '📝 Converting speech to text',
      '⏱️ Adding timestamps to transcript',
      '🎯 Identifying key moments',
      '📚 Creating searchable content',
      '✨ Preparing for AI analysis',
    ]
  },
  web_upload: {
    title: 'Analyzing web page content...',
    subtitle: 'Extracting all important information',
    emoji: '🌐',
    icon: Globe,
    tips: [
      '🔍 Fetching web page content',
      '📰 Extracting main article text',
      '🖼️ Processing images and media',
      '🔗 Following important links',
      '✨ Cleaning and formatting content',
      '📚 Ready for your questions',
    ]
  },
  quiz_generation: {
    title: 'Generating quiz questions...',
    subtitle: 'Creating interesting questions',
    emoji: '🎯',
    icon: Sparkles,
    tips: [
      '❓ Creating multiple choice questions',
      '🎯 Matching difficulty to your level',
      '📊 Balancing question types',
      '💡 Adding helpful explanations',
      '🏆 Setting up scoring system',
      '✅ Final checks in progress',
    ]
  },
  note_generation: {
    title: 'Generating smart notes...',
    subtitle: 'Organizing key points',
    emoji: '📝',
    icon: Sparkles,
    tips: [
      '🎯 Identifying main concepts',
      '📊 Organizing into sections',
      '💡 Highlighting key points',
      '🔗 Adding cross-references',
      '✨ Formatting for readability',
      '📚 Almost ready to study!',
    ]
  },
  general: {
    title: 'Loading...',
    subtitle: 'Please wait',
    emoji: '⏳',
    icon: Loader2,
    tips: [
      '⚡ Optimizing your experience',
      '🎯 Preparing your content',
      '✨ Almost there...',
    ]
  }
};

export default function LoadingScreen({
  context = 'general',
  message,
  fullScreen = true
}: LoadingScreenProps) {
  const [tip, setTip] = useState('');
  const [progress, setProgress] = useState(0);
  const content = loadingContent[context];
  const Icon = content.icon;

  useEffect(() => {
    // Set initial tip
    setTip(content.tips[0]);

    // Rotate tips every 3 seconds
    const tipInterval = setInterval(() => {
      const randomTip = content.tips[Math.floor(Math.random() * content.tips.length)];
      setTip(randomTip);
    }, 3000);

    // Simulate progress (stops at 90% to avoid looking stuck at 100%)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, [content.tips]);

  const containerClass = fullScreen
    ? "fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-purple-50"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClass} data-testid="loading-screen">
      <div className="max-w-md w-full px-8">

        {/* Animated Emoji */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-8xl text-center mb-8"
        >
          {content.emoji}
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-center mb-2 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent"
        >
          {message || content.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center text-gray-600 mb-8"
        >
          {content.subtitle}
        </motion.p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-center text-sm text-gray-500 mt-2">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Rotating Tips */}
        <motion.div
          key={tip}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-2xl p-4 border border-gray-200 text-center shadow-sm"
        >
          <p className="text-sm text-gray-700">{tip}</p>
        </motion.div>

        {/* Animated Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gradient-to-r from-primary-500 to-secondary-600 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

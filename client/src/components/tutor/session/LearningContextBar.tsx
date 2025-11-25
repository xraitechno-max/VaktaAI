import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Brain,
  Target,
  Sparkles,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LearningContextBarProps {
  subject: string;
  topic: string;
  level: string;
  mode: 'lecture' | 'practice';
  sessionTime: number;
  onModeChange?: (mode: 'lecture' | 'practice') => void;
  progress?: number;
}

export default function LearningContextBar({
  subject,
  topic,
  level,
  mode,
  sessionTime,
  onModeChange,
  progress = 0,
}: LearningContextBarProps) {
  const { t } = useLanguage();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSubjectIcon = (subj: string) => {
    const icons: Record<string, typeof BookOpen> = {
      physics: Sparkles,
      chemistry: Brain,
      mathematics: Target,
      biology: BookOpen,
    };
    return icons[subj.toLowerCase()] || BookOpen;
  };

  const SubjectIcon = getSubjectIcon(subject);

  const getSubjectGradient = (subj: string) => {
    const gradients: Record<string, string> = {
      physics: 'from-blue-500 to-cyan-500',
      chemistry: 'from-green-500 to-emerald-500',
      mathematics: 'from-purple-500 to-pink-500',
      biology: 'from-orange-500 to-amber-500',
    };
    return gradients[subj.toLowerCase()] || 'from-primary to-secondary';
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-white/5 dark:bg-slate-900/30 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getSubjectGradient(subject)} text-white`}>
          <SubjectIcon className="w-4 h-4" />
          <span className="text-sm font-semibold capitalize">{subject}</span>
        </div>

        <Badge variant="secondary" className="bg-white/10 text-white/90 border-white/20 px-3 py-1">
          <Target className="w-3 h-3 mr-1.5" />
          {topic || 'General'}
        </Badge>

        <Badge variant="outline" className="text-white/70 border-white/20 px-3 py-1">
          {level}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <Clock className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white/80">{formatTime(sessionTime)}</span>
        </div>

        <div className="flex items-center rounded-full bg-white/5 border border-white/10 p-0.5">
          <Button
            size="sm"
            variant="ghost"
            className={`rounded-full px-4 h-8 text-xs font-medium transition-all ${
              mode === 'lecture'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => onModeChange?.('lecture')}
            data-testid="button-mode-lecture"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Lecture
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`rounded-full px-4 h-8 text-xs font-medium transition-all ${
              mode === 'practice'
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => onModeChange?.('practice')}
            data-testid="button-mode-practice"
          >
            <Brain className="w-3.5 h-3.5 mr-1.5" />
            Practice
          </Button>
        </div>
      </div>
    </div>
  );
}

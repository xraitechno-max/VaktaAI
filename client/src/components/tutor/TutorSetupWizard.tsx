import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  Calculator, FlaskConical, Book, BookOpen, Target, Trophy, 
  Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Atom, Dna,
  GraduationCap, Zap, ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface TutorSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: TutorConfig) => void;
}

export interface TutorConfig {
  subject: string;
  level: string;
  topic: string;
  language: string;
  examType: 'board' | 'competitive';
}

const subjectConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  mathematics: { icon: Calculator, color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500/10' },
  maths: { icon: Calculator, color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500/10' },
  physics: { icon: Atom, color: 'from-purple-500 to-pink-600', bgColor: 'bg-purple-500/10' },
  chemistry: { icon: FlaskConical, color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-500/10' },
  biology: { icon: Dna, color: 'from-rose-500 to-red-600', bgColor: 'bg-rose-500/10' },
  science: { icon: FlaskConical, color: 'from-cyan-500 to-blue-600', bgColor: 'bg-cyan-500/10' },
  history: { icon: Book, color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/10' },
  geography: { icon: Book, color: 'from-teal-500 to-green-600', bgColor: 'bg-teal-500/10' },
  english: { icon: BookOpen, color: 'from-violet-500 to-purple-600', bgColor: 'bg-violet-500/10' },
  hindi: { icon: BookOpen, color: 'from-orange-500 to-red-600', bgColor: 'bg-orange-500/10' },
};

const stepInfo = [
  { title: 'Exam Type', icon: Target, desc: 'Board or Competitive' },
  { title: 'Subject', icon: BookOpen, desc: 'Choose your subject' },
  { title: 'Topic', icon: Sparkles, desc: 'What to learn today' },
];

export default function TutorSetupWizard({ open, onOpenChange, onSubmit }: TutorSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [examType, setExamType] = useState<'board' | 'competitive'>('board');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [topic, setTopic] = useState('');
  
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setStep(1);
      setExamType('board');
      setSelectedSubject('');
      setTopic('');
    }
  }, [open]);
  
  useEffect(() => {
    if (user?.targetExam && open) {
      const targetExam = String(user.targetExam).toLowerCase();
      if (targetExam.includes('jee') || targetExam.includes('neet') || targetExam.includes('competitive')) {
        setExamType('competitive');
      } else if (targetExam.includes('board') || targetExam.includes('cbse') || targetExam.includes('state')) {
        setExamType('board');
      }
    }
  }, [user, open]);
  
  useEffect(() => {
    if (user?.subjects && Array.isArray(user.subjects) && user.subjects.length > 0 && !selectedSubject) {
      const firstSubject = String(user.subjects[0]).toLowerCase();
      setSelectedSubject(firstSubject);
    }
  }, [user, selectedSubject]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      const getLevel = () => {
        if (examType === 'competitive') return 'expert';
        if (user?.currentClass) {
          const classNum = parseInt(String(user.currentClass).replace(/\D/g, ''));
          if (classNum <= 8) return 'beginner';
          if (classNum <= 10) return 'intermediate';
          if (classNum <= 12) return 'advanced';
          return 'expert';
        }
        return 'intermediate';
      };

      const config: TutorConfig = {
        subject: selectedSubject,
        level: getLevel(),
        topic: topic.trim(),
        language: user?.locale || 'en',
        examType,
      };
      
      onSubmit(config);
      onOpenChange(false);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return selectedSubject.length > 0;
      case 3: return topic.trim().length > 0;
      default: return false;
    }
  };

  const chapterSuggestions: Record<string, string[]> = {
    mathematics: ['Algebra', 'Calculus', 'Trigonometry', 'Coordinate Geometry', 'Vectors', 'Probability'],
    maths: ['Algebra', 'Calculus', 'Trigonometry', 'Coordinate Geometry', 'Vectors', 'Probability'],
    physics: ['Kinematics', 'Laws of Motion', 'Work Energy Power', 'Rotational Motion', 'Thermodynamics', 'Electrostatics'],
    chemistry: ['Atomic Structure', 'Chemical Bonding', 'Thermodynamics', 'Equilibrium', 'Electrochemistry', 'Organic Chemistry'],
    biology: ['Cell Biology', 'Genetics', 'Evolution', 'Photosynthesis', 'Human Body', 'Ecology'],
    science: ['Cell Biology', 'Genetics', 'Evolution', 'Photosynthesis', 'Human Body', 'Ecology'],
    history: ['Ancient India', 'Medieval India', 'Modern India', 'World Wars', 'Indian Independence', 'Constitution'],
    geography: ['Physical Geography', 'Climate', 'Resources', 'Population', 'Agriculture', 'Industries'],
    english: ['Poetry', 'Prose', 'Grammar', 'Writing Skills', 'Literature', 'Communication'],
    hindi: ['Vyakaran', 'Kavya', 'Gadya', 'Lekhan', 'Sahitya', 'Bhasha'],
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-1">Select Exam Type</h3>
              <p className="text-sm text-muted-foreground">Choose the type of exam you're preparing for</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                onClick={() => setExamType('board')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                  examType === 'board'
                    ? 'border-orange-500 bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg'
                    : 'border-border bg-card hover:border-orange-300'
                }`}
                data-testid="button-exam-type-board"
              >
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                  examType === 'board' ? 'bg-white/20' : 'bg-orange-100 dark:bg-orange-900/30'
                }`}>
                  <BookOpen className={`w-6 h-6 ${examType === 'board' ? 'text-white' : 'text-orange-600 dark:text-orange-400'}`} />
                </div>
                <h4 className="font-semibold text-sm mb-1">Board Exam</h4>
                <p className={`text-xs ${examType === 'board' ? 'text-white/80' : 'text-muted-foreground'}`}>
                  CBSE, ICSE, State
                </p>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setExamType('competitive')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                  examType === 'competitive'
                    ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'border-border bg-card hover:border-purple-300'
                }`}
                data-testid="button-exam-type-competitive"
              >
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                  examType === 'competitive' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/30'
                }`}>
                  <Trophy className={`w-6 h-6 ${examType === 'competitive' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                </div>
                <h4 className="font-semibold text-sm mb-1">Competitive</h4>
                <p className={`text-xs ${examType === 'competitive' ? 'text-white/80' : 'text-muted-foreground'}`}>
                  JEE, NEET, CUET
                </p>
              </motion.button>
            </div>
          </motion.div>
        );

      case 2:
        const userSubjects = (user?.subjects || []).map((s: string) => s.toLowerCase());
        
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-1">Select Subject</h3>
              <p className="text-sm text-muted-foreground">Choose a subject you want to learn</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
              {userSubjects.map((subject: string) => {
                const config = subjectConfig[subject] || { icon: Book, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-500/10' };
                const Icon = config.icon;
                const displayName = subject.charAt(0).toUpperCase() + subject.slice(1);
                const isSelected = selectedSubject === subject;
                
                return (
                  <motion.button
                    key={subject}
                    type="button"
                    onClick={() => setSelectedSubject(subject)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                      isSelected
                        ? `border-transparent bg-gradient-to-br ${config.color} text-white shadow-lg`
                        : 'border-border bg-card hover:shadow-md'
                    }`}
                    data-testid={`button-subject-${subject}`}
                  >
                    <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${
                      isSelected ? 'bg-white/20' : `bg-gradient-to-br ${config.color}`
                    }`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-foreground'}`}>
                      {displayName}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            
            {userSubjects.length === 0 && (
              <div className="text-center py-6 bg-muted/50 rounded-xl">
                <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No subjects selected in onboarding</p>
              </div>
            )}
          </motion.div>
        );

      case 3:
        const currentSuggestions = chapterSuggestions[selectedSubject] || [];
        const subjectConf = subjectConfig[selectedSubject] || { icon: Book, color: 'from-purple-500 to-pink-500' };
        
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-1">Choose a Topic</h3>
              <p className="text-sm text-muted-foreground">
                What would you like to learn in <span className="font-semibold capitalize">{selectedSubject}</span>?
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">Type your topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Laws of Motion, Quadratic Equations..."
                className="h-11 rounded-lg"
                data-testid="input-topic"
              />
            </div>
            
            {currentSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Or select a popular topic:</p>
                <div className="flex flex-wrap gap-2">
                  {currentSuggestions.map((chapter) => (
                    <motion.button
                      key={chapter}
                      type="button"
                      onClick={() => setTopic(chapter)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        topic === chapter
                          ? `bg-gradient-to-r ${subjectConf.color} text-white shadow-md`
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                      data-testid={`button-chapter-${chapter.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {chapter}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-gradient-to-b from-background to-muted/30 border-0 shadow-2xl">
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-6 py-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-6 h-6" />
                Start AI Mentor Session
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Step {step} of 3: {stepInfo[step - 1].desc}
              </p>
            </div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Personalized
            </Badge>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[50vh]">
          {userLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your profile...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          )}
        </div>

        {/* Premium Footer Actions */}
        <div className="sticky bottom-0 bg-gradient-to-t from-card via-card to-transparent px-6 py-4 border-t">
          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={step === 1}
              className="px-6 rounded-xl"
              data-testid="button-wizard-prev"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || userLoading}
              className={`px-8 rounded-xl font-semibold transition-all ${
                step === 3 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30'
              }`}
              data-testid="button-wizard-next"
            >
              {step === 3 ? (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Start Learning
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calculator, FlaskConical, Book, BookOpen, Target, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

const subjectIcons: Record<string, any> = {
  mathematics: Calculator,
  maths: Calculator,
  physics: FlaskConical,
  chemistry: FlaskConical,
  biology: Book,
  science: FlaskConical,
  history: Book,
  geography: Book,
  english: Book,
  hindi: Book,
};

export default function TutorSetupWizard({ open, onOpenChange, onSubmit }: TutorSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [examType, setExamType] = useState<'board' | 'competitive'>('board');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [topic, setTopic] = useState('');
  
  // Fetch user profile for subjects data
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    enabled: open,
  });

  // Reset wizard when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setExamType('board');
      setSelectedSubject('');
      setTopic('');
    }
  }, [open]);
  
  // Auto-populate exam type from user profile (targetExam)
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
  
  // Auto-populate selected subject from onboarding (first subject)
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
      // Determine level from class and exam type
      const getLevel = () => {
        if (examType === 'competitive') {
          return 'expert'; // Competitive exam needs advanced level
        }
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
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Exam type always has a default value (board)
      case 2:
        return selectedSubject.length > 0; // Subject must be selected
      case 3:
        return topic.trim().length > 0; // Topic must be entered
      default:
        return false;
    }
  };

  // Chapter suggestions per subject
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
        // Step 1: Exam Type Selection (Board vs Competitive) - Auto-populated from user.targetExam
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select Exam Type</h3>
              <p className="text-sm text-muted-foreground">
                Choose the type of exam you're preparing for
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Board Exam Option */}
              <button
                type="button"
                onClick={() => setExamType('board')}
                className={`p-6 rounded-xl border-2 transition-all duration-200 hover-elevate text-left ${
                  examType === 'board'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card'
                }`}
                data-testid="button-exam-type-board"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    examType === 'board' ? 'bg-primary/15' : 'bg-muted'
                  }`}>
                    <BookOpen className={`w-7 h-7 ${
                      examType === 'board' ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-1">Board Exam</h4>
                    <p className="text-sm text-muted-foreground">
                      Simplified explanations for CBSE/State Board level exams
                    </p>
                  </div>
                </div>
              </button>

              {/* Competitive Exam Option */}
              <button
                type="button"
                onClick={() => setExamType('competitive')}
                className={`p-6 rounded-xl border-2 transition-all duration-200 hover-elevate text-left ${
                  examType === 'competitive'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card'
                }`}
                data-testid="button-exam-type-competitive"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    examType === 'competitive' ? 'bg-primary/15' : 'bg-muted'
                  }`}>
                    <Trophy className={`w-7 h-7 ${
                      examType === 'competitive' ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-1">Competitive Exam</h4>
                    <p className="text-sm text-muted-foreground">
                      Advanced concepts for JEE, NEET, and other competitive exams
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 2:
        // Step 2: Subject Selection (from user profile)
        const userSubjects = (user?.subjects || []).map((s: string) => s.toLowerCase());
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Select Subject</h3>
              <p className="text-sm text-muted-foreground">
                Choose a subject you want to learn
              </p>
            </div>
            
            {/* Improved grid with better spacing and max-height to prevent cut-off */}
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
              {userSubjects.map((subject: string) => {
                const Icon = subjectIcons[subject] || Book;
                const displayName = subject.charAt(0).toUpperCase() + subject.slice(1);
                
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setSelectedSubject(subject)}
                    className={`p-5 rounded-xl border-2 transition-all duration-200 hover-elevate ${
                      selectedSubject === subject
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                    data-testid={`button-subject-${subject}`}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                        selectedSubject === subject ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <Icon className={`w-7 h-7 ${
                          selectedSubject === subject ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <span className="font-medium text-sm">{displayName}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {userSubjects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No subjects selected in onboarding</p>
                <p className="text-xs mt-1">You can add subjects in your profile settings</p>
              </div>
            )}
          </div>
        );

      case 3:
        // Step 3: Chapter/Topic (Interactive - ONLY step where user types)
        const currentSuggestions = chapterSuggestions[selectedSubject] || [];
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Book className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose a Chapter or Topic</h3>
              <p className="text-sm text-muted-foreground">
                What would you like to learn today?
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">
                Search or type your topic
              </Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Laws of Motion, Quadratic Equations"
                className="text-base h-12"
                data-testid="input-topic"
                autoFocus
              />
            </div>
            
            {currentSuggestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Suggested chapters:
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {currentSuggestions.map((chapter) => (
                    <Button
                      key={chapter}
                      type="button"
                      variant={topic === chapter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopic(chapter)}
                      className="h-9"
                      data-testid={`button-chapter-${chapter.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {chapter}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 z-10">
          <DialogHeader>
            <DialogTitle className="text-xl">Start AI Mentor Session</DialogTitle>
            <DialogDescription>
              Step {step} of 3: Set up your personalized learning experience
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    i <= step
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i}
                </div>
                {i < 3 && (
                  <div
                    className={`h-1 flex-1 rounded transition-all duration-300 ${
                      i < step ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-8">
          {userLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Loading your profile...</p>
              </div>
            </div>
          ) : (
            renderStep()
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={step === 1}
              data-testid="button-wizard-prev"
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || userLoading}
              data-testid="button-wizard-next"
            >
              {step === 3 ? 'Start Learning' : 'Next'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

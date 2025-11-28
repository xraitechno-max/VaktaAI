import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Target, BookOpen, Languages, ArrowRight, ArrowLeft } from 'lucide-react';
import WelcomeStep from './steps/WelcomeStep';
import ClassSelection from './steps/ClassSelection';
import ExamTargetSelection from './steps/ExamTargetSelection';
import SubjectSelection from './steps/SubjectSelection';
import LanguageSelection from './steps/LanguageSelection';

export interface OnboardingData {
  currentClass: string;
  examTarget: string;
  educationBoard: string;
  subjects: string[];
  languagePreference: string;
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    currentClass: '',
    examTarget: '',
    educationBoard: 'CBSE',
    subjects: [],
    languagePreference: 'hinglish',
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    { number: 1, title: 'Welcome', icon: GraduationCap },
    { number: 2, title: 'Class', icon: GraduationCap },
    { number: 3, title: 'Exam Target', icon: Target },
    { number: 4, title: 'Subjects', icon: BookOpen },
    { number: 5, title: 'Language', icon: Languages },
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset dependent fields when class changes (but not on initial mount)
  useEffect(() => {
    if (formData.currentClass === '') return; // Skip on initial mount
    
    setFormData(prev => ({
      ...prev,
      examTarget: '', // Reset exam target when class changes
      subjects: [], // Reset subjects when class changes
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.currentClass]);

  // Sanitize subjects when exam target changes
  useEffect(() => {
    if (!formData.examTarget || formData.subjects.length === 0) return;
    
    const examTarget = formData.examTarget;
    
    // Define valid subjects for current exam target (must match SubjectSelection.tsx)
    // ExamTarget IDs: board-only, board-foundation, board-jee-main, board-jee-advanced, board-neet, pure-jee, pure-neet
    let validSubjects: string[] = [];
    
    // NEET targets (pure-neet or board-neet)
    if (examTarget === 'pure-neet' || examTarget === 'board-neet') {
      validSubjects = ['physics', 'chemistry', 'biology', 'english', 'physical_education'];
    }
    // JEE targets (pure-jee, board-jee-main, board-jee-advanced)
    else if (examTarget === 'pure-jee' || examTarget === 'board-jee-main' || examTarget === 'board-jee-advanced') {
      validSubjects = ['physics', 'chemistry', 'maths', 'english', 'computer'];
    }
    // Class 6-8
    else if (['6', '7', '8'].includes(formData.currentClass)) {
      validSubjects = ['science', 'maths', 'social', 'english', 'hindi', 'computer'];
    }
    // Class 9-10
    else if (['9', '10'].includes(formData.currentClass)) {
      validSubjects = ['physics', 'chemistry', 'biology', 'maths', 'social', 'english', 'hindi', 'computer'];
    }
    // Board-only for 11-12/dropper (Science stream default)
    else {
      validSubjects = ['physics', 'chemistry', 'maths', 'biology', 'english', 'computer', 'physical_education'];
    }
    
    // Remove any subjects that are no longer valid
    const sanitizedSubjects = formData.subjects.filter(s => validSubjects.includes(s));
    
    if (sanitizedSubjects.length !== formData.subjects.length) {
      setFormData(prev => ({ ...prev, subjects: sanitizedSubjects }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.examTarget]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Welcome step - always allow proceed
      case 2:
        return formData.currentClass !== '';
      case 3:
        return formData.examTarget !== '';
      case 4:
        // For Step 4, enforce exam target for senior classes
        if (['11', '12', 'dropper'].includes(formData.currentClass) && !formData.examTarget) {
          return false; // Block Step 4 if exam target not set for seniors
        }
        return formData.subjects.length > 0;
      case 5:
        return formData.languagePreference !== '';
      default:
        return false;
    }
  };

  // Use portal to render outside AppLayout DOM tree, completely covering the sidebar
  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Card className="w-full max-w-3xl p-6 lg:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Welcome to VaktaAI
          </h1>
          <p className="text-muted-foreground">
            Step {currentStep} of {totalSteps}: {steps[currentStep - 1].title}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <div
                  key={step.number}
                  className={`flex flex-col items-center gap-2 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive
                        ? 'border-primary bg-primary/10'
                        : isCompleted
                        ? 'border-green-600 bg-green-50 dark:bg-green-950'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px] mb-8">
          {currentStep === 1 && <WelcomeStep />}
          {currentStep === 2 && (
            <ClassSelection
              value={formData.currentClass}
              onChange={(value: string) => updateFormData('currentClass', value)}
            />
          )}
          {currentStep === 3 && (
            <ExamTargetSelection
              currentClass={formData.currentClass}
              value={formData.examTarget}
              boardValue={formData.educationBoard}
              onChange={(value: string) => updateFormData('examTarget', value)}
              onBoardChange={(value: string) => updateFormData('educationBoard', value)}
            />
          )}
          {currentStep === 4 && (
            <SubjectSelection
              currentClass={formData.currentClass}
              examTarget={formData.examTarget}
              value={formData.subjects}
              onChange={(value: string[]) => updateFormData('subjects', value)}
            />
          )}
          {currentStep === 5 && (
            <LanguageSelection
              value={formData.languagePreference}
              onChange={(value: string) => updateFormData('languagePreference', value)}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                data-testid="button-onboarding-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onSkip && currentStep === 1 && (
              <Button
                variant="ghost"
                onClick={onSkip}
                data-testid="button-onboarding-skip"
              >
                Skip for now
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              data-testid="button-onboarding-next"
            >
              {currentStep === totalSteps ? 'Start Learning' : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  // Portal renders outside AppLayout, covering sidebar completely
  return createPortal(content, document.body);
}

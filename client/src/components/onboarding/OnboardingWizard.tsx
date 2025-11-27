import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Target, BookOpen, Languages, ArrowRight, ArrowLeft } from 'lucide-react';
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

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    { number: 1, title: 'Class', icon: GraduationCap },
    { number: 2, title: 'Exam Target', icon: Target },
    { number: 3, title: 'Subjects', icon: BookOpen },
    { number: 4, title: 'Language', icon: Languages },
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
        return formData.currentClass !== '';
      case 2:
        return formData.examTarget !== '';
      case 3:
        return formData.subjects.length > 0;
      case 4:
        return formData.languagePreference !== '';
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Card className="w-full max-w-3xl p-6 lg:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Welcome to VaktaAI! 🎓
          </h1>
          <p className="text-muted-foreground">
            Let's personalize your learning experience in just 4 steps
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
          {currentStep === 1 && (
            <ClassSelection
              value={formData.currentClass}
              onChange={(value: string) => updateFormData('currentClass', value)}
            />
          )}
          {currentStep === 2 && (
            <ExamTargetSelection
              currentClass={formData.currentClass}
              value={formData.examTarget}
              boardValue={formData.educationBoard}
              onChange={(value: string) => updateFormData('examTarget', value)}
              onBoardChange={(value: string) => updateFormData('educationBoard', value)}
            />
          )}
          {currentStep === 3 && (
            <SubjectSelection
              examTarget={formData.examTarget}
              value={formData.subjects}
              onChange={(value: string[]) => updateFormData('subjects', value)}
            />
          )}
          {currentStep === 4 && (
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
}

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Target, Award, Trophy, Zap } from 'lucide-react';

interface ExamTargetSelectionProps {
  currentClass: string;
  value: string;
  boardValue: string;
  onChange: (value: string) => void;
  onBoardChange: (value: string) => void;
}

export default function ExamTargetSelection({
  currentClass,
  value,
  boardValue,
  onChange,
  onBoardChange,
}: ExamTargetSelectionProps) {
  // Define exam targets based on class
  const getExamTargets = () => {
    if (currentClass === 'class-6-10') {
      return [
        {
          id: 'board',
          label: 'Board Exam Preparation',
          description: 'Focus on school exams & NCERT mastery',
          icon: Award,
        },
        {
          id: 'foundation',
          label: 'Foundation for JEE/NEET',
          description: 'Early preparation for competitive exams',
          icon: Target,
        },
      ];
    } else if (currentClass === 'class-11-12') {
      return [
        {
          id: 'board-only',
          label: 'Board Exam Only',
          description: 'Score high in board exams',
          icon: Award,
        },
        {
          id: 'board-jee-main',
          label: 'Board + JEE Main',
          description: 'Balance board & JEE Main prep',
          icon: Target,
        },
        {
          id: 'board-jee-advanced',
          label: 'Board + JEE Advanced',
          description: 'IIT preparation with boards',
          icon: Trophy,
        },
        {
          id: 'board-neet',
          label: 'Board + NEET',
          description: 'Medical entrance with boards',
          icon: Zap,
        },
      ];
    } else {
      // Dropper
      return [
        {
          id: 'pure-jee',
          label: 'Pure JEE Focus',
          description: 'Dedicated JEE Main & Advanced prep',
          icon: Trophy,
        },
        {
          id: 'pure-neet',
          label: 'Pure NEET Focus',
          description: 'Dedicated medical entrance prep',
          icon: Zap,
        },
      ];
    }
  };

  const examTargets = getExamTargets();
  const boards = [
    { id: 'CBSE', label: 'CBSE' },
    { id: 'ICSE', label: 'ICSE' },
    { id: 'State Board', label: 'State Board' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">What's your exam target?</h2>
        <p className="text-muted-foreground">
          We'll tailor study material and difficulty accordingly
        </p>
      </div>

      {/* Board Selection - only for non-dropper */}
      {currentClass !== 'dropper' && (
        <div className="mb-6">
          <Label className="text-base font-semibold mb-3 block">Education Board</Label>
          <div className="flex gap-3 flex-wrap">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => onBoardChange(board.id)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  boardValue === board.id
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover-elevate'
                }`}
                data-testid={`button-board-${board.id}`}
              >
                {board.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exam Target Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        {examTargets.map((target) => {
          const Icon = target.icon;
          const isSelected = value === target.id;

          return (
            <Card
              key={target.id}
              className={`p-5 cursor-pointer transition-all hover-elevate ${
                isSelected
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => onChange(target.id)}
              data-testid={`card-exam-${target.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">{target.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {target.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

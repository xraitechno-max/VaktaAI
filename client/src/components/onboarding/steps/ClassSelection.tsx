import { Card } from '@/components/ui/card';
import { GraduationCap, BookOpen, Rocket } from 'lucide-react';

interface ClassSelectionProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ClassSelection({ value, onChange }: ClassSelectionProps) {
  const classOptions = [
    {
      id: 'class-6-10',
      label: 'Class 6-10',
      description: 'Foundation & Board Exam Prep',
      icon: BookOpen,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'class-11-12',
      label: 'Class 11-12',
      description: 'Board + JEE/NEET Preparation',
      icon: GraduationCap,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      id: 'dropper',
      label: 'Dropper / Gap Year',
      description: 'Focused JEE/NEET Preparation',
      icon: Rocket,
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Which class are you in?</h2>
        <p className="text-muted-foreground">
          This helps us customize content and difficulty level for you
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {classOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;

          return (
            <Card
              key={option.id}
              className={`p-6 cursor-pointer transition-all hover-elevate ${
                isSelected
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => onChange(option.id)}
              data-testid={`card-class-${option.id}`}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${option.gradient} flex items-center justify-center`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{option.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
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

import { Card } from '@/components/ui/card';
import { GraduationCap, BookOpen, Rocket } from 'lucide-react';

interface ClassSelectionProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ClassSelection({ value, onChange }: ClassSelectionProps) {
  const classOptions = [
    { id: '6', label: 'Class 6', description: 'Foundation Building', icon: BookOpen, gradient: 'from-blue-400 to-cyan-400' },
    { id: '7', label: 'Class 7', description: 'Core Concepts', icon: BookOpen, gradient: 'from-blue-500 to-cyan-500' },
    { id: '8', label: 'Class 8', description: 'Advanced Foundation', icon: BookOpen, gradient: 'from-blue-600 to-cyan-600' },
    { id: '9', label: 'Class 9', description: 'Board Prep Begins', icon: GraduationCap, gradient: 'from-indigo-500 to-blue-500' },
    { id: '10', label: 'Class 10', description: 'Board Exam Year', icon: GraduationCap, gradient: 'from-indigo-600 to-blue-600' },
    { id: '11', label: 'Class 11', description: 'JEE/NEET Foundation', icon: GraduationCap, gradient: 'from-purple-500 to-pink-500' },
    { id: '12', label: 'Class 12', description: 'Final Board + Entrance', icon: GraduationCap, gradient: 'from-purple-600 to-pink-600' },
    { id: 'dropper', label: 'Dropper / Gap Year', description: 'Focused JEE/NEET Prep', icon: Rocket, gradient: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Which class are you in?</h2>
        <p className="text-muted-foreground">
          This helps us customize content and difficulty level for you
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {classOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;

          return (
            <Card
              key={option.id}
              className={`p-4 cursor-pointer transition-all hover-elevate ${
                isSelected
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => onChange(option.id)}
              data-testid={`card-class-${option.id}`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${option.gradient} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-0.5">{option.label}</h3>
                  <p className="text-xs text-muted-foreground">
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

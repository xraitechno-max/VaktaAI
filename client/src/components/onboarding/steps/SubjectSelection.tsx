import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Atom, FlaskConical, Calculator, Dna } from 'lucide-react';

interface SubjectSelectionProps {
  examTarget: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function SubjectSelection({ examTarget, value, onChange }: SubjectSelectionProps) {
  const subjects = [
    {
      id: 'physics',
      label: 'Physics',
      icon: Atom,
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Mechanics, Optics, Modern Physics',
    },
    {
      id: 'chemistry',
      label: 'Chemistry',
      icon: FlaskConical,
      gradient: 'from-purple-500 to-pink-500',
      description: 'Organic, Inorganic, Physical',
    },
    {
      id: 'maths',
      label: 'Mathematics',
      icon: Calculator,
      gradient: 'from-orange-500 to-red-500',
      description: 'Calculus, Algebra, Trigonometry',
    },
    {
      id: 'biology',
      label: 'Biology',
      icon: Dna,
      gradient: 'from-green-500 to-emerald-500',
      description: 'Botany, Zoology, Human Physiology',
    },
  ];

  // Filter subjects based on exam target
  const getAvailableSubjects = () => {
    if (examTarget.includes('neet')) {
      // NEET: Physics, Chemistry, Biology
      return subjects.filter(s => ['physics', 'chemistry', 'biology'].includes(s.id));
    } else if (examTarget.includes('jee')) {
      // JEE: Physics, Chemistry, Maths
      return subjects.filter(s => ['physics', 'chemistry', 'maths'].includes(s.id));
    }
    // All subjects for board exam
    return subjects;
  };

  const availableSubjects = getAvailableSubjects();

  const toggleSubject = (subjectId: string) => {
    if (value.includes(subjectId)) {
      onChange(value.filter(id => id !== subjectId));
    } else {
      onChange([...value, subjectId]);
    }
  };

  // Recommended subjects message
  const getRecommendation = () => {
    if (examTarget.includes('neet')) {
      return 'NEET requires Physics, Chemistry & Biology (PCB)';
    } else if (examTarget.includes('jee')) {
      return 'JEE requires Physics, Chemistry & Maths (PCM)';
    }
    return 'Select subjects you want to study';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Which subjects do you want to study?</h2>
        <p className="text-muted-foreground">{getRecommendation()}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {availableSubjects.map((subject) => {
          const Icon = subject.icon;
          const isSelected = value.includes(subject.id);

          return (
            <Card
              key={subject.id}
              className={`p-5 cursor-pointer transition-all hover-elevate ${
                isSelected
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => toggleSubject(subject.id)}
              data-testid={`card-subject-${subject.id}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${subject.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-lg">{subject.label}</h3>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSubject(subject.id)}
                      data-testid={`checkbox-subject-${subject.id}`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {subject.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Selected: {value.map(id => availableSubjects.find(s => s.id === id)?.label).join(', ')}
        </div>
      )}
    </div>
  );
}

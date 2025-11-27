import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Atom, FlaskConical, Calculator, Dna, BookOpen, Globe, Languages, Code, Beaker } from 'lucide-react';

interface SubjectSelectionProps {
  currentClass: string;
  examTarget: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function SubjectSelection({ currentClass, examTarget, value, onChange }: SubjectSelectionProps) {
  // All possible subjects with icons
  const allSubjects = [
    {
      id: 'physics',
      label: 'Physics',
      icon: Atom,
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Mechanics, Optics, Electricity',
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
      description: 'Algebra, Geometry, Calculus',
    },
    {
      id: 'biology',
      label: 'Biology',
      icon: Dna,
      gradient: 'from-green-500 to-emerald-500',
      description: 'Botany, Zoology, Physiology',
    },
    {
      id: 'science',
      label: 'Science',
      icon: Beaker,
      gradient: 'from-teal-500 to-cyan-500',
      description: 'General Science (Physics, Chemistry, Biology)',
    },
    {
      id: 'social',
      label: 'Social Science',
      icon: Globe,
      gradient: 'from-amber-500 to-yellow-500',
      description: 'History, Geography, Civics',
    },
    {
      id: 'english',
      label: 'English',
      icon: BookOpen,
      gradient: 'from-indigo-500 to-blue-500',
      description: 'Grammar, Literature, Writing',
    },
    {
      id: 'hindi',
      label: 'Hindi',
      icon: Languages,
      gradient: 'from-rose-500 to-pink-500',
      description: 'Vyakaran, Sahitya, Lekhan',
    },
    {
      id: 'computer',
      label: 'Computer Science',
      icon: Code,
      gradient: 'from-violet-500 to-purple-500',
      description: 'Programming, Data Structures',
    },
  ];

  // Get subjects based on class and exam target
  const getAvailableSubjects = () => {
    const examLower = examTarget.toLowerCase();
    
    // Class 6-8: General subjects
    if (['6', '7', '8'].includes(currentClass)) {
      return allSubjects.filter(s => 
        ['science', 'maths', 'social', 'english', 'hindi'].includes(s.id)
      );
    }
    
    // Class 9-10: Separate sciences
    if (['9', '10'].includes(currentClass)) {
      return allSubjects.filter(s => 
        ['physics', 'chemistry', 'biology', 'maths', 'social', 'english', 'hindi', 'computer'].includes(s.id)
      );
    }
    
    // Class 11-12 or Dropper: Based on exam target (with fallback if not set yet)
    if (['11', '12', 'dropper'].includes(currentClass)) {
      if (!examTarget || examTarget === '') {
        // Default to all science subjects if exam target not set yet
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'maths', 'biology', 'english', 'hindi', 'computer'].includes(s.id)
        );
      }
      
      if (examLower.includes('neet')) {
        // NEET: PCB + English
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'biology', 'english'].includes(s.id)
        );
      } else if (examLower.includes('jee')) {
        // JEE: PCM + English
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'maths', 'english'].includes(s.id)
        );
      } else if (examLower.includes('board')) {
        // Board exams: All science subjects
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'maths', 'biology', 'english', 'hindi', 'computer'].includes(s.id)
        );
      }
    }
    
    // Default fallback: All subjects
    return allSubjects;
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
    const examLower = examTarget.toLowerCase();
    
    if (['6', '7', '8'].includes(currentClass)) {
      return 'Select subjects you need help with';
    }
    
    if (['9', '10'].includes(currentClass)) {
      return 'Choose subjects for your Class ' + currentClass + ' board exam preparation';
    }
    
    if (examLower.includes('neet')) {
      return 'NEET requires Physics, Chemistry & Biology (PCB)';
    } else if (examLower.includes('jee')) {
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

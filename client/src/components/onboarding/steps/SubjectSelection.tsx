import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Atom, FlaskConical, Calculator, Dna, BookOpen, Globe, Languages, Code, Beaker, Activity, Palette, Music, Building2 } from 'lucide-react';

interface SubjectSelectionProps {
  currentClass: string;
  examTarget: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function SubjectSelection({ currentClass, examTarget, value, onChange }: SubjectSelectionProps) {
  // All possible subjects with icons - comprehensive list for all classes
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
    {
      id: 'physical_education',
      label: 'Physical Education',
      icon: Activity,
      gradient: 'from-green-500 to-teal-500',
      description: 'Sports, Fitness, Health',
    },
    {
      id: 'economics',
      label: 'Economics',
      icon: Building2,
      gradient: 'from-emerald-500 to-green-500',
      description: 'Micro, Macro, Indian Economy',
    },
    {
      id: 'accountancy',
      label: 'Accountancy',
      icon: Calculator,
      gradient: 'from-sky-500 to-blue-500',
      description: 'Financial Statements, Accounting',
    },
    {
      id: 'business_studies',
      label: 'Business Studies',
      icon: Building2,
      gradient: 'from-slate-500 to-gray-500',
      description: 'Management, Marketing, Finance',
    },
    {
      id: 'fine_arts',
      label: 'Fine Arts',
      icon: Palette,
      gradient: 'from-pink-500 to-rose-500',
      description: 'Painting, Sculpture, Drawing',
    },
    {
      id: 'music',
      label: 'Music',
      icon: Music,
      gradient: 'from-fuchsia-500 to-purple-500',
      description: 'Vocal, Instrumental, Theory',
    },
  ];

  // Get subjects based on class and exam target
  // ExamTarget IDs from ExamTargetSelection: board-only, board-foundation, board-jee-main, board-jee-advanced, board-neet, pure-jee, pure-neet
  const getAvailableSubjects = () => {
    // Class 6-8: Foundation subjects (6 subjects)
    if (['6', '7', '8'].includes(currentClass)) {
      return allSubjects.filter(s => 
        ['science', 'maths', 'social', 'english', 'hindi', 'computer'].includes(s.id)
      );
    }
    
    // Class 9-10: Board subjects with separate sciences (8 subjects)
    if (['9', '10'].includes(currentClass)) {
      return allSubjects.filter(s => 
        ['physics', 'chemistry', 'biology', 'maths', 'social', 'english', 'hindi', 'computer'].includes(s.id)
      );
    }
    
    // Class 11-12 or Dropper: Based on exam target
    if (['11', '12', 'dropper'].includes(currentClass)) {
      if (!examTarget || examTarget === '') {
        // Default to all science subjects if exam target not set yet
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'maths', 'biology', 'english', 'computer', 'physical_education'].includes(s.id)
        );
      }
      
      // NEET targets: pure-neet or board-neet
      if (examTarget === 'pure-neet' || examTarget === 'board-neet') {
        // NEET: PCB + English + Physical Education (5 subjects)
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'biology', 'english', 'physical_education'].includes(s.id)
        );
      }
      
      // JEE targets: pure-jee, board-jee-main, board-jee-advanced
      if (examTarget === 'pure-jee' || examTarget === 'board-jee-main' || examTarget === 'board-jee-advanced') {
        // JEE: PCM + English + Computer Science (5 subjects)
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'maths', 'english', 'computer'].includes(s.id)
        );
      }
      
      // Board-only or board-foundation: Science stream (7 subjects)
      if (examTarget === 'board-only' || examTarget === 'board-foundation') {
        return allSubjects.filter(s => 
          ['physics', 'chemistry', 'maths', 'biology', 'english', 'computer', 'physical_education'].includes(s.id)
        );
      }
    }
    
    // Default fallback: Science stream subjects
    return allSubjects.filter(s => 
      ['physics', 'chemistry', 'maths', 'biology', 'english', 'computer', 'physical_education'].includes(s.id)
    );
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

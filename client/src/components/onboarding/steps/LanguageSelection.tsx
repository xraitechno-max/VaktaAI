import { Card } from '@/components/ui/card';
import { Languages, Globe, IndianRupee } from 'lucide-react';

interface LanguageSelectionProps {
  value: string;
  onChange: (value: string) => void;
}

export default function LanguageSelection({ value, onChange }: LanguageSelectionProps) {
  const languages = [
    {
      id: 'english',
      label: 'English',
      description: 'Full English explanations and technical terms',
      icon: Globe,
      gradient: 'from-blue-500 to-cyan-500',
      example: 'The acceleration due to gravity is 9.8 m/s²',
    },
    {
      id: 'hinglish',
      label: 'Hinglish (Recommended)',
      description: 'Mix of Hindi & English - Perfect for Indian students',
      icon: IndianRupee,
      gradient: 'from-purple-500 to-pink-500',
      example: 'Gravity ki wajah se acceleration 9.8 m/s² hota hai',
      recommended: true,
    },
    {
      id: 'hindi',
      label: 'Hindi',
      description: 'Complete Hindi explanations',
      icon: Languages,
      gradient: 'from-orange-500 to-red-500',
      example: 'गुरुत्वाकर्षण के कारण त्वरण 9.8 m/s² होता है',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Choose your learning language</h2>
        <p className="text-muted-foreground">
          We'll explain concepts in your preferred language
        </p>
      </div>

      <div className="grid gap-4">
        {languages.map((lang) => {
          const Icon = lang.icon;
          const isSelected = value === lang.id;

          return (
            <Card
              key={lang.id}
              className={`p-6 cursor-pointer transition-all hover-elevate ${
                isSelected
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent/50'
              } ${lang.recommended ? 'border-primary/50' : ''}`}
              onClick={() => onChange(lang.id)}
              data-testid={`card-language-${lang.id}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${lang.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{lang.label}</h3>
                    {lang.recommended && (
                      <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {lang.description}
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <p className="text-sm font-mono">
                      {lang.example}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          💡 <strong>Tip:</strong> Hinglish is perfect for Indian students! Technical terms stay in English while explanations are in Hindi - just like your classroom.
        </p>
      </div>
    </div>
  );
}

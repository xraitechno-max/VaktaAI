import { Sparkles, Target, Brain, Zap, Languages } from 'lucide-react';

export default function WelcomeStep() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white mb-4">
          <Sparkles className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">
            Let's Personalize Your Learning!
          </h2>
          <p className="text-muted-foreground">
            Help us understand your goals so we can create the perfect study plan for you
          </p>
        </div>
      </div>

      {/* Personalization Benefits */}
      <div className="grid gap-4 mt-8">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Adaptive AI Mentor</h3>
            <p className="text-sm text-muted-foreground">
              Your AI teacher will adjust explanations based on your class level and exam goals
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Exam-Focused Content</h3>
            <p className="text-sm text-muted-foreground">
              JEE gets conceptual depth, NEET gets memory techniques, Boards get scoring strategies
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Languages className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Your Preferred Language</h3>
            <p className="text-sm text-muted-foreground">
              Learn in English, Hinglish, or Hindi - whatever makes you comfortable
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Personalized Greetings</h3>
            <p className="text-sm text-muted-foreground">
              Your AI mentor will greet you by name with motivational messages tailored to your journey
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center mt-6 p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
        <p className="text-sm font-medium text-primary">
          Just 5 quick steps to unlock your personalized learning experience!
        </p>
      </div>
    </div>
  );
}

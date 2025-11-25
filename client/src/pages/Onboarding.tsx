import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Languages, Globe, GraduationCap, School, Target, Trophy,
  FlaskConical, Calculator, Leaf, Atom, CheckCircle2,
  ArrowRight, ArrowLeft, Loader2, Sparkles, Brain
} from "lucide-react";
import logoUrl from "../assets/logo.png";
import garimaAvatar from "@assets/generated_images/female_teacher_gradient_background.png";
import arjunAvatar from "@assets/generated_images/male_teacher_gradient_background.png";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const BOARDS = [
  { id: "CBSE", key: "cbse", icon: School },
  { id: "ICSE", key: "icse", icon: School },
  { id: "State Board", key: "state", icon: GraduationCap },
  { id: "Other", key: "other", icon: GraduationCap },
];

const CLASSES = [
  { id: "10th", key: "10th" },
  { id: "11th", key: "11th" },
  { id: "12th", key: "12th" },
  { id: "Dropper", key: "dropper" },
];

const EXAM_TARGETS = [
  { id: "Board Exams", key: "board", icon: GraduationCap, color: "from-blue-500 to-cyan-500" },
  { id: "JEE Main", key: "jeeMain", icon: Target, color: "from-orange-500 to-red-500" },
  { id: "JEE Advanced", key: "jeeAdv", icon: Trophy, color: "from-purple-500 to-pink-500" },
  { id: "NEET", key: "neet", icon: Leaf, color: "from-green-500 to-emerald-500" },
];

const SUBJECTS = [
  { id: "Physics", key: "physics", icon: Atom, color: "from-blue-500 to-indigo-500" },
  { id: "Chemistry", key: "chemistry", icon: FlaskConical, color: "from-green-500 to-teal-500" },
  { id: "Math", key: "maths", icon: Calculator, color: "from-orange-500 to-amber-500" },
  { id: "Biology", key: "biology", icon: Leaf, color: "from-emerald-500 to-green-500" },
];

const MENTORS = [
  { 
    id: "garima", 
    nameKey: "garima", 
    descKey: "garimaDesc",
    gradient: "from-pink-500 to-rose-500",
    avatar: garimaAvatar
  },
  { 
    id: "arjun", 
    nameKey: "arjun", 
    descKey: "arjunDesc",
    gradient: "from-blue-500 to-indigo-500",
    avatar: arjunAvatar
  },
];

export default function Onboarding() {
  const { t, language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    language: language,
    educationBoard: "CBSE",
    currentClass: "12th",
    examTarget: "JEE Main",
    subjects: [] as string[],
    mentor: "garima",
  });

  const toggleSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleLanguageSelect = (lang: 'en' | 'hi') => {
    setForm({ ...form, language: lang });
    setLanguage(lang);
  };

  const handleNext = async () => {
    if (step < 6) {
      if (step === 5 && form.subjects.length === 0) {
        toast.error(t('onboarding.subjects.minRequired'));
        return;
      }
      setStep((step + 1) as Step);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await apiRequest("PATCH", "/api/users/profile", {
        locale: form.language,
        educationBoard: form.educationBoard,
        currentClass: form.currentClass,
        examTarget: form.examTarget,
        subjects: form.subjects,
      });

      toast.success(t('onboarding.success'));
      
      setTimeout(() => {
        setLocation("/tutor");
      }, 500);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error(t('onboarding.error'));
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (step / 6) * 100;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="language"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 mb-4">
                <Languages className="w-8 h-8 text-primary-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('onboarding.language.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t('onboarding.language.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleLanguageSelect('en')}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 hover-elevate text-center ${
                  form.language === 'en'
                    ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
                data-testid="button-language-en"
              >
                <Globe className={`w-10 h-10 mx-auto mb-3 ${
                  form.language === 'en' ? 'text-primary-500' : 'text-gray-400'
                }`} />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {t('onboarding.language.english')}
                </span>
              </button>

              <button
                onClick={() => handleLanguageSelect('hi')}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 hover-elevate text-center ${
                  form.language === 'hi'
                    ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
                data-testid="button-language-hi"
              >
                <Globe className={`w-10 h-10 mx-auto mb-3 ${
                  form.language === 'hi' ? 'text-primary-500' : 'text-gray-400'
                }`} />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {t('onboarding.language.hindi')}
                </span>
              </button>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="board"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-4">
                <School className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('onboarding.board.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t('onboarding.board.subtitle')}
              </p>
            </div>

            <div className="space-y-3">
              {BOARDS.map((board) => {
                const Icon = board.icon;
                return (
                  <button
                    key={board.id}
                    onClick={() => setForm({ ...form, educationBoard: board.id })}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 hover-elevate flex items-center gap-4 ${
                      form.educationBoard === board.id
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                    data-testid={`button-board-${board.id}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      form.educationBoard === board.id ? 'bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        form.educationBoard === board.id ? 'text-primary-500' : 'text-gray-500'
                      }`} />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t(`onboarding.board.${board.key}`)}
                    </span>
                    {form.educationBoard === board.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary-500 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="class"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-4">
                <GraduationCap className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('onboarding.class.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t('onboarding.class.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {CLASSES.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setForm({ ...form, currentClass: cls.id })}
                  className={`p-5 rounded-2xl border-2 transition-all duration-200 hover-elevate text-center ${
                    form.currentClass === cls.id
                      ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                  data-testid={`button-class-${cls.id}`}
                >
                  <div className={`w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                    form.currentClass === cls.id ? 'bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <GraduationCap className={`w-7 h-7 ${
                      form.currentClass === cls.id ? 'text-primary-500' : 'text-gray-500'
                    }`} />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {t(`onboarding.class.${cls.key}`)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="exam"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 mb-4">
                <Target className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('onboarding.exam.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t('onboarding.exam.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {EXAM_TARGETS.map((exam) => {
                const Icon = exam.icon;
                return (
                  <button
                    key={exam.id}
                    onClick={() => setForm({ ...form, examTarget: exam.id })}
                    className={`p-5 rounded-2xl border-2 transition-all duration-200 hover-elevate text-center ${
                      form.examTarget === exam.id
                        ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                    data-testid={`button-exam-${exam.id}`}
                  >
                    <div className={`w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br ${exam.color}`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {t(`onboarding.exam.${exam.key}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
                <Brain className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('onboarding.subjects.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t('onboarding.subjects.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {SUBJECTS.map((subject) => {
                const Icon = subject.icon;
                const isSelected = form.subjects.includes(subject.id);
                return (
                  <button
                    key={subject.id}
                    onClick={() => toggleSubject(subject.id)}
                    className={`p-5 rounded-2xl border-2 transition-all duration-200 hover-elevate text-center relative ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                    data-testid={`button-subject-${subject.id}`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-5 h-5 text-primary-500" />
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br ${subject.color}`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {t(`onboarding.subjects.${subject.key}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            {form.subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {form.subjects.map((s) => {
                  const subjectData = SUBJECTS.find(sub => sub.id === s);
                  if (!subjectData) return null;
                  return (
                    <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400">
                      {t(`onboarding.subjects.${subjectData.key}`)}
                    </span>
                  );
                })}
              </div>
            )}
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            key="mentor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 mb-4">
                <Sparkles className="w-8 h-8 text-pink-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('onboarding.mentor.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t('onboarding.mentor.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {MENTORS.map((mentor) => (
                <button
                  key={mentor.id}
                  onClick={() => setForm({ ...form, mentor: mentor.id })}
                  className={`p-6 rounded-2xl border-2 transition-all duration-200 hover-elevate text-center ${
                    form.mentor === mentor.id
                      ? 'border-primary-500 bg-primary-500/10 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                  data-testid={`button-mentor-${mentor.id}`}
                >
                  <img 
                    src={mentor.avatar} 
                    alt={t(`onboarding.mentor.${mentor.nameKey}`)}
                    className={`w-20 h-20 rounded-full mx-auto mb-3 object-cover shadow-lg ring-4 ${
                      form.mentor === mentor.id ? 'ring-primary-500' : 'ring-gray-200 dark:ring-gray-600'
                    }`}
                  />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                    {t(`onboarding.mentor.${mentor.nameKey}`)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(`onboarding.mentor.${mentor.descKey}`)}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNhMGFlYzAiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt={t('brand.logoAlt')} className="w-7 h-7" />
              <span className="font-bold text-lg bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                {t('brand.name')}
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding.stepOf').replace('{current}', String(step)).replace('{total}', '6')}
            </span>
          </div>
          
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-lg">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-500/5 rounded-3xl" />
            
            <div className="relative p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>

              <div className="flex gap-3 mt-8">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-shrink-0"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    {t('onboarding.back')}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex-1 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold shadow-lg shadow-primary-500/25"
                  data-testid="button-next"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('onboarding.loading')}
                    </>
                  ) : step === 6 ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('onboarding.getStarted')}
                    </>
                  ) : (
                    <>
                      {t('onboarding.next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const BOARDS = ["CBSE", "ICSE", "State Board", "Other"];
const CLASSES = ["10th", "12th", "BSc Year 1", "BSc Year 2", "Other"];
const EXAM_TARGETS = ["Board Exams", "JEE Main", "JEE Advanced", "NEET", "Other"];
const SUBJECTS = ["Physics", "Chemistry", "Math", "Biology", "English", "Hindi"];
const LANGUAGES = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "hi", label: "हिंदी (Hindi)", flag: "🇮🇳" },
];

const TEACHERS = [
  { id: "myra", name: "Myra", emoji: "👩", intro_en: "Myra", intro_hi: "मायरा" },
  { id: "aarav", name: "Aarav", emoji: "👨", intro_en: "Aarav", intro_hi: "आरव" },
];

const CONTENT = {
  en: {
    language: "Which language do you prefer?",
    board: "Which board are you in?",
    class: "What class are you in?",
    exam: "What's your exam target?",
    subjects: "Select your subjects (minimum 1)",
    subjects_hint: "Select at least 1 subject",
    avatar: "Choose Your Mentor",
    choose_tutor: "Meet your AI Mentor",
    always_available: "Always available to help you learn",
    next: "Next",
    back: "Back",
    start: "Get Started",
    loading: "Loading...",
    success: "Profile created! Ready to learn?",
    error: "Something went wrong. Try again.",
    step: (current: number) => `Step ${current} of 6`,
  },
  hi: {
    language: "कौन सी language पसंद है?",
    board: "तुम किस board में हो?",
    class: "किस class में हो?",
    exam: "तुम्हारा exam target क्या है?",
    subjects: "अपने subjects चुनो (कम से कम 1)",
    subjects_hint: "कम से कम 1 subject select करो",
    avatar: "अपना Mentor चुनो",
    choose_tutor: "अपने AI Mentor से मिलो",
    always_available: "हमेशा तुम्हारी मदद के लिए तैयार",
    next: "आगे बढ़ो",
    back: "पीछे जाओ",
    start: "शुरू करो",
    loading: "लोड हो रहा है...",
    success: "तुम्हारा प्रोफाइल तैयार! सीखने को तैयार?",
    error: "कुछ गलत हुआ। फिर से कोशिश करो।",
    step: (current: number) => `स्टेप ${current} / 6`,
  },
};

type Step = "language" | "board" | "class" | "exam" | "subjects" | "avatar";
type Language = "en" | "hi";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("language");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    language: "en" as Language,
    educationBoard: "CBSE",
    currentClass: "12th",
    examTarget: "JEE Main",
    subjects: [] as string[],
    avatar: "myra",
  });

  const t = CONTENT[form.language];

  const toggleSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleNext = async () => {
    if (step === "language") setStep("board");
    else if (step === "board") setStep("class");
    else if (step === "class") setStep("exam");
    else if (step === "exam") setStep("subjects");
    else if (step === "subjects") {
      if (form.subjects.length === 0) {
        toast.error(t.subjects_hint);
        return;
      }
      setStep("avatar");
    } else if (step === "avatar") {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("PATCH", "/api/users/profile", {
        locale: form.language,
        educationBoard: form.educationBoard,
        currentClass: form.currentClass,
        examTarget: form.examTarget,
        subjects: form.subjects,
      });

      console.log("Profile update response:", response);
      toast.success(t.success);
      
      setTimeout(() => {
        setLocation("/chat");
      }, 500);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = {
    language: 16,
    board: 33,
    class: 50,
    exam: 66,
    subjects: 83,
    avatar: 100,
  }[step];

  const currentTeacher = TEACHERS.find((t) => t.id === form.avatar);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="w-full h-1 bg-gray-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-8">
            {/* Avatar Header */}
            {step === "avatar" && currentTeacher ? (
              <div className="text-center mb-8">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarImage src={currentTeacher.emoji} />
                  <AvatarFallback>{currentTeacher.name[0]}</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {form.language === "hi" ? currentTeacher.intro_hi : currentTeacher.intro_en} से मिलो!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {t.choose_tutor} • {t.always_available}
                </p>
              </div>
            ) : null}

            {/* Step content */}
            <div className="space-y-6">
              {step === "language" && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t.language}
                    </h3>
                    <div className="space-y-3">
                      {LANGUAGES.map((lang) => (
                        <div key={lang.id} className="flex items-center">
                          <RadioGroup value={form.language} onValueChange={(val) => setForm({ ...form, language: val as Language })}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value={lang.id} id={lang.id} />
                              <Label htmlFor={lang.id} className="cursor-pointer flex items-center gap-2">
                                <span className="text-lg">{lang.flag}</span>
                                <span className="font-medium">{lang.label}</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === "board" && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t.board}
                    </h3>
                    <div className="space-y-2">
                      {BOARDS.map((board) => (
                        <Button
                          key={board}
                          variant={form.educationBoard === board ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setForm({ ...form, educationBoard: board })}
                          data-testid={`button-board-${board}`}
                        >
                          {board}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === "class" && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t.class}
                    </h3>
                    <div className="space-y-2">
                      {CLASSES.map((cls) => (
                        <Button
                          key={cls}
                          variant={form.currentClass === cls ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setForm({ ...form, currentClass: cls })}
                          data-testid={`button-class-${cls}`}
                        >
                          {cls}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === "exam" && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t.exam}
                    </h3>
                    <div className="space-y-2">
                      {EXAM_TARGETS.map((exam) => (
                        <Button
                          key={exam}
                          variant={form.examTarget === exam ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setForm({ ...form, examTarget: exam })}
                          data-testid={`button-exam-${exam}`}
                        >
                          {exam}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === "subjects" && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t.subjects}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {t.subjects_hint}
                    </p>
                    <div className="space-y-2">
                      {SUBJECTS.map((subject) => (
                        <div
                          key={subject}
                          onClick={() => toggleSubject(subject)}
                          className="p-3 border-2 rounded-lg cursor-pointer transition-all"
                          style={{
                            borderColor: form.subjects.includes(subject) ? "#a855f7" : "#e5e7eb",
                            backgroundColor: form.subjects.includes(subject)
                              ? "rgba(168, 85, 247, 0.1)"
                              : "transparent",
                          }}
                          data-testid={`button-subject-${subject}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.subjects.includes(subject)}
                              onChange={() => {}}
                              className="w-4 h-4 rounded accent-purple-600"
                            />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {subject}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === "avatar" && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t.avatar}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {TEACHERS.map((teacher) => (
                        <div
                          key={teacher.id}
                          onClick={() => setForm({ ...form, avatar: teacher.id })}
                          className="p-4 border-2 rounded-lg cursor-pointer transition-all text-center"
                          style={{
                            borderColor: form.avatar === teacher.id ? "#a855f7" : "#e5e7eb",
                            backgroundColor:
                              form.avatar === teacher.id ? "rgba(168, 85, 247, 0.1)" : "transparent",
                          }}
                          data-testid={`button-avatar-${teacher.id}`}
                        >
                          <div className="text-4xl mb-2">{teacher.emoji}</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {teacher.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-8">
              {step !== "language" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const steps: Step[] = [
                      "language",
                      "board",
                      "class",
                      "exam",
                      "subjects",
                      "avatar",
                    ];
                    const currentIndex = steps.indexOf(step);
                    if (currentIndex > 0) setStep(steps[currentIndex - 1]);
                  }}
                  data-testid="button-back"
                >
                  {t.back}
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 hover:from-orange-600 hover:via-red-600 hover:to-purple-700"
                data-testid="button-next"
              >
                {step === "avatar"
                  ? loading
                    ? t.loading
                    : t.start
                  : t.next}
              </Button>
            </div>

            {/* Step indicator */}
            <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t.step(["language", "board", "class", "exam", "subjects", "avatar"].indexOf(step) + 1)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

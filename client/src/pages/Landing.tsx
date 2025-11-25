import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, BookOpen, Zap, ArrowRight, Play,
  MessageSquare, FileText, Target, Trophy, Star,
  CheckCircle2, Menu, X, Mic, Volume2, Clock, Users,
  Atom, Beaker, Calculator, Dna, ChevronDown, ChevronRight,
  GraduationCap, IndianRupee, Award, TrendingUp, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AuthModal from "@/components/landing/AuthModal";
import { useLanguage, LanguageToggle } from "@/contexts/LanguageContext";
import logoUrl from "../assets/logo.png";
import garimaAvatar from "@assets/generated_images/female_teacher_gradient_background.png";
import aaravAvatar from "@assets/generated_images/male_maths_gradient_background.png";
import priyaAvatar from "@assets/generated_images/female_chemistry_gradient_bg.png";
import vikramAvatar from "@assets/generated_images/male_teacher_gradient_background.png";
import docSathiImage from "@assets/generated_images/docsathi_ai_document_assistant.png";

const mentors = [
  { 
    id: 'garima',
    nameKey: 'mentors.garima.name',
    subjectKey: 'mentors.garima.subject',
    subject: 'Physics',
    color: 'bg-physics',
    icon: Atom,
    avatar: garimaAvatar
  },
  { 
    id: 'aarav',
    nameKey: 'mentors.aarav.name',
    subjectKey: 'mentors.aarav.subject',
    subject: 'Maths',
    color: 'bg-maths',
    icon: Calculator,
    avatar: aaravAvatar
  },
  { 
    id: 'priya',
    nameKey: 'mentors.priya.name',
    subjectKey: 'mentors.priya.subject',
    subject: 'Chemistry',
    color: 'bg-chemistry',
    icon: Beaker,
    avatar: priyaAvatar
  },
  { 
    id: 'vikram',
    nameKey: 'mentors.vikram.name',
    subjectKey: 'mentors.vikram.subject',
    subject: 'Biology',
    color: 'bg-biology',
    icon: Dna,
    avatar: vikramAvatar
  },
];

const examCategories = [
  { id: 'jee', labelKey: 'exams.jee', color: 'bg-jee', students: '5L+' },
  { id: 'neet', labelKey: 'exams.neet', color: 'bg-neet', students: '4L+' },
  { id: 'cbse', labelKey: 'exams.cbse', color: 'bg-cbse', students: '3L+' },
  { id: 'icse', labelKey: 'exams.icse', color: 'bg-icse', students: '1L+' },
];

const features = [
  {
    icon: Brain,
    titleKey: 'features.aiMentor.title',
    descKey: 'features.aiMentor.desc',
    gradient: 'from-orange-500 to-red-500',
    href: '/tutor',
    steps: ['features.aiMentor.step1', 'features.aiMentor.step2', 'features.aiMentor.step3'],
  },
  {
    icon: MessageSquare,
    titleKey: 'features.docSathi.title',
    descKey: 'features.docSathi.desc',
    gradient: 'from-blue-500 to-cyan-500',
    href: '/docsathi',
    steps: ['features.docSathi.step1', 'features.docSathi.step2', 'features.docSathi.step3'],
  },
  {
    icon: Target,
    titleKey: 'features.quiz.title',
    descKey: 'features.quiz.desc',
    gradient: 'from-purple-500 to-pink-500',
    href: '/quiz',
    steps: ['features.quiz.step1', 'features.quiz.step2', 'features.quiz.step3'],
  },
  {
    icon: Calendar,
    titleKey: 'features.studyPlan.title',
    descKey: 'features.studyPlan.desc',
    gradient: 'from-amber-500 to-orange-500',
    href: '/study-plan',
    steps: ['features.studyPlan.step1', 'features.studyPlan.step2', 'features.studyPlan.step3'],
  },
  {
    icon: FileText,
    titleKey: 'features.notes.title',
    descKey: 'features.notes.desc',
    gradient: 'from-green-500 to-emerald-500',
    href: '/notes',
    steps: ['features.notes.step1', 'features.notes.step2', 'features.notes.step3'],
  },
];

const comparisonData = [
  { key: 'cost', coachingKey: 'compare.coaching.cost', vaktaaiKey: 'compare.vaktaai.cost' },
  { key: 'availability', coachingKey: 'compare.coaching.availability', vaktaaiKey: 'compare.vaktaai.availability' },
  { key: 'attention', coachingKey: 'compare.coaching.attention', vaktaaiKey: 'compare.vaktaai.attention' },
  { key: 'doubts', coachingKey: 'compare.coaching.doubts', vaktaaiKey: 'compare.vaktaai.doubts' },
];

const stats = [
  { value: '10L+', labelKey: 'stats.students', icon: Users },
  { value: '4.8', labelKey: 'stats.rating', icon: Star },
  { value: '85%', labelKey: 'stats.improvement', icon: TrendingUp },
  { value: '1Cr+', labelKey: 'stats.doubts', icon: MessageSquare },
];

const faqItems = [
  { questionKey: 'faq.q1', answerKey: 'faq.a1' },
  { questionKey: 'faq.q2', answerKey: 'faq.a2' },
  { questionKey: 'faq.q3', answerKey: 'faq.a3' },
  { questionKey: 'faq.q4', answerKey: 'faq.a4' },
];

export default function Landing() {
  const { t } = useLanguage();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMentor, setActiveMentor] = useState(0);
  const [activeExam, setActiveExam] = useState('jee');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMentor((prev) => (prev + 1) % mentors.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const onStartLearning = () => {
    setAuthModalTab('signup');
    setIsAuthModalOpen(true);
  };

  const onSignIn = () => {
    setAuthModalTab('login');
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50'
            : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <motion.div
              className="flex items-center gap-2 sm:gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <img src={logoUrl} alt="VaktaAI" className="w-10 h-10 object-contain" />
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent">
                VaktaAI
              </span>
            </motion.div>

            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#features" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition" data-testid="link-features">
                {t('nav.features')}
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition" data-testid="link-how-it-works">
                {t('nav.howItWorks')}
              </a>
              <a href="#pricing" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 transition" data-testid="link-pricing">
                {t('nav.pricing')}
              </a>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageToggle />
              <Button
                onClick={onSignIn}
                variant="ghost"
                className="hidden sm:flex"
                data-testid="button-login"
              >
                {t('nav.login')}
              </Button>
              <Button
                onClick={onStartLearning}
                className="bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white shadow-lg"
                data-testid="button-start-learning"
              >
                <span className="hidden sm:inline">{t('nav.startFree')}</span>
                <span className="sm:hidden">{t('common.getStarted')}</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="px-4 py-4 space-y-3">
                <a href="#features" className="block text-gray-700 dark:text-gray-300 py-2">{t('nav.features')}</a>
                <a href="#how-it-works" className="block text-gray-700 dark:text-gray-300 py-2">{t('nav.howItWorks')}</a>
                <a href="#pricing" className="block text-gray-700 dark:text-gray-300 py-2">{t('nav.pricing')}</a>
                <Button onClick={onSignIn} variant="outline" className="w-full">{t('nav.login')}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-300/30 to-purple-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-300/30 to-blue-300/30 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <Badge className="mb-4 px-4 py-1.5 bg-gradient-to-r from-orange-100 to-purple-100 dark:from-orange-900/50 dark:to-purple-900/50 text-primary-600 dark:text-primary-400 border-0">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {t('hero.badge')}
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                <span className="block">{t('hero.title1')}</span>
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent">
                  {t('hero.title2')}
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0">
                {t('hero.subtitle')}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  onClick={onStartLearning}
                  size="lg"
                  className="bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white shadow-xl text-lg px-8"
                  data-testid="button-hero-cta"
                >
                  {t('hero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg"
                  data-testid="button-watch-demo"
                >
                  <Play className="mr-2 h-5 w-5" />
                  {t('hero.watchDemo')}
                </Button>
              </div>

              <div className="mt-10 flex items-center justify-center lg:justify-start gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">10L+</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('hero.stats.students')}</div>
                </div>
                <div className="w-px h-10 bg-gray-300 dark:bg-gray-600" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">4.8<Star className="inline w-4 h-4 text-yellow-500 ml-1" /></div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('hero.stats.rating')}</div>
                </div>
                <div className="w-px h-10 bg-gray-300 dark:bg-gray-600" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">24/7</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{t('hero.stats.available')}</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div 
                className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl p-6 sm:p-8 shadow-2xl cursor-pointer"
                onClick={onStartLearning}
                data-testid="hero-avatar-area"
              >
                <div className="flex items-center gap-4 mb-6">
                  <AnimatePresence mode="wait">
                    {mentors.map((mentor, index) => (
                      index === activeMentor && (
                        <motion.div
                          key={mentor.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center gap-3"
                        >
                          <div className={`w-12 h-12 rounded-full ${mentor.color} flex items-center justify-center`}>
                            <mentor.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{t(mentor.nameKey)}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{t(mentor.subjectKey)}</div>
                          </div>
                        </motion.div>
                      )
                    ))}
                  </AnimatePresence>

                  <div className="ml-auto flex gap-1">
                    {mentors.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => { e.stopPropagation(); setActiveMentor(index); }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === activeMentor ? 'bg-primary-500 w-4' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        data-testid={`button-mentor-${index}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-52 sm:h-64 rounded-2xl overflow-hidden mb-4 relative">
                  <img 
                    src={mentors[activeMentor].avatar} 
                    alt={t(mentors[activeMentor].nameKey)} 
                    className="w-full h-full object-cover rounded-2xl"
                  />
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <p className="text-gray-700 dark:text-gray-200 font-medium text-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm py-1.5 px-3 rounded-full inline-block shadow-lg">{t('avatar.clickToMeet')}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex-shrink-0 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 dark:text-gray-200 text-sm">
                        "{t('avatar.greeting')}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.onlineNow')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="rounded-full">
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-full">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DocSathi Hero Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <div 
                className="relative bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 rounded-3xl p-6 sm:p-8 shadow-2xl cursor-pointer"
                onClick={onStartLearning}
                data-testid="docsathi-hero-area"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{t('features.docSathi.title')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('docSathi.tagline')}</div>
                  </div>
                </div>

                <div className="h-52 sm:h-64 rounded-2xl overflow-hidden mb-4">
                  <img 
                    src={docSathiImage} 
                    alt="DocSathi" 
                    className="w-full h-full object-cover rounded-2xl"
                  />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 dark:text-gray-200 text-sm">
                        "{t('docSathi.greeting')}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('docSathi.ready')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">PDF</Badge>
                    <Badge variant="secondary" className="text-xs">Video</Badge>
                    <Badge variant="secondary" className="text-xs">Web</Badge>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left order-1 lg:order-2"
            >
              <Badge className="mb-4 px-4 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 text-blue-600 dark:text-blue-400 border-0">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {t('docSathi.badge')}
              </Badge>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                <span className="block">{t('docSathi.title1')}</span>
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {t('docSathi.title2')}
                </span>
              </h2>

              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0">
                {t('docSathi.subtitle')}
              </p>

              <div className="mt-8 space-y-4">
                {['docSathi.feature1', 'docSathi.feature2', 'docSathi.feature3'].map((key, i) => (
                  <div key={i} className="flex items-center gap-3 justify-center lg:justify-start">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">{t(key)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  onClick={onStartLearning}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-xl"
                  data-testid="button-docsathi-cta"
                >
                  {t('docSathi.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Exam Categories */}
      <section id="exams" className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {t('exams.title')}
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8">
            {examCategories.map((exam) => (
              <Button
                key={exam.id}
                variant={activeExam === exam.id ? "default" : "outline"}
                onClick={() => setActiveExam(exam.id)}
                className={`${activeExam === exam.id ? exam.color + ' text-white' : ''} transition-all`}
                data-testid={`button-exam-${exam.id}`}
              >
                {t(exam.labelKey)}
              </Button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {mentors.map((mentor) => (
              <motion.div
                key={mentor.id}
                whileHover={{ y: -4 }}
                className="cursor-pointer"
                onClick={onStartLearning}
              >
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className={`h-2 ${mentor.color}`} />
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-xl ${mentor.color} flex items-center justify-center mb-4`}>
                      <mentor.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                      {t(mentor.nameKey)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {t(mentor.subjectKey)}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t('mentor.expertIn')} {t(`subject.${mentor.subject.toLowerCase()}`)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Premium 5-Feature Showcase */}
      <section id="features" className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <Badge variant="secondary" className="mb-4 text-primary-500">
              <Sparkles className="w-3 h-3 mr-1" />
              {t('features.subtitle')}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('features.title')}
            </h2>
          </motion.div>

          {/* 5-Feature Grid with Equal Prominence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group cursor-pointer"
                onClick={onStartLearning}
              >
                <Card className="h-full border-0 shadow-lg group-hover:shadow-xl transition-all duration-300 overflow-hidden">
                  {/* Gradient top bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${feature.gradient}`} />
                  
                  <CardContent className="p-5">
                    {/* Icon with gradient background */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    
                    {/* Feature Title */}
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                      {t(feature.titleKey)}
                    </h3>
                    
                    {/* Feature Description */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 min-h-[3rem]">
                      {t(feature.descKey)}
                    </p>
                    
                    {/* Step-by-Step Mini Flow */}
                    <div className="space-y-2 mb-4">
                      {feature.steps.map((stepKey, stepIndex) => (
                        <div key={stepKey} className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-[10px] font-bold text-white">{stepIndex + 1}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t(stepKey)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Try Now Button */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full group-hover:bg-gray-100 dark:group-hover:bg-gray-700"
                      data-testid={`button-feature-${feature.titleKey.split('.')[1]}`}
                    >
                      {t('features.tryNow')}
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('compare.title')}
            </h2>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 text-gray-500 dark:text-gray-400 font-medium"></th>
                  <th className="p-4 text-center">
                    <div className="text-gray-600 dark:text-gray-300 font-semibold">{t('compare.coaching')}</div>
                  </th>
                  <th className="p-4 text-center">
                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold py-2 px-4 rounded-lg">
                      {t('compare.vaktaai')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={row.key} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}>
                    <td className="p-4 font-medium text-gray-700 dark:text-gray-300">
                      {t(`compare.${row.key}`)}
                    </td>
                    <td className="p-4 text-center text-gray-600 dark:text-gray-400">
                      {t(row.coachingKey)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 dark:text-green-400 font-medium">{t(row.vaktaaiKey)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-primary-500 via-red-500 to-secondary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.labelKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center text-white"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3 opacity-80" />
                <div className="text-3xl sm:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-white/80 text-sm sm:text-base">{t(stat.labelKey)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="pricing" className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('faq.title')}
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white dark:bg-gray-900 rounded-xl px-6 shadow-sm border-0"
              >
                <AccordionTrigger className="text-left font-medium text-gray-900 dark:text-white hover:no-underline" data-testid={`faq-question-${index}`}>
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-400">
                  {t(faq.answerKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              {t('cta.subtitle')}
            </p>
            <Button
              onClick={onStartLearning}
              size="lg"
              className="bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white shadow-xl text-lg px-10"
              data-testid="button-cta-final"
            >
              {t('cta.button')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="VaktaAI" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold text-white">VaktaAI</span>
            </div>
            <p className="text-center md:text-left">{t('footer.tagline')}</p>
            <p className="text-sm">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
}

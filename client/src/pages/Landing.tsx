import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Sparkles, Brain, BookOpen, Zap, ArrowRight, Play,
  MessageSquare, FileText, Target, Trophy, Star,
  CheckCircle2, Menu, X, Mic, Volume2, CheckCircle, Loader2,
  Atom, Beaker, Calculator, Dna, Book, PenTool, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/landing/AuthModal";
import UnityAvatar, { UnityAvatarHandle } from "@/components/tutor/UnityAvatar";
import logoUrl from "../assets/logo.png";

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  
  const avatarRef = useRef<UnityAvatarHandle>(null);
  const hasPlayedIntroduction = useRef(false); // Prevent replay on re-mount

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroY = useTransform(scrollY, [0, 300], [0, -50]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onStartLearning = () => {
    setAuthModalTab('signup');
    setIsAuthModalOpen(true);
  };

  const onSignIn = () => {
    setAuthModalTab('login');
    setIsAuthModalOpen(true);
  };

  const handleVoiceClick = () => {
    // Show signup modal for voice functionality
    setAuthModalTab('signup');
    setIsAuthModalOpen(true);
  };

  const handleAvatarReady = () => {
    console.log('[Landing] Unity avatar ready!');
    setAvatarReady(true);
    setAvatarLoading(false);
    
    // Play introduction speech only once (prevent replay on navigation back)
    if (!hasPlayedIntroduction.current) {
      hasPlayedIntroduction.current = true;
      
      setTimeout(() => {
        const introductionText = "Welcome to VaktaAI! I'm your AI mentor, here to help you excel in your studies. With VaktaAI, you can ask doubts in English or Hindi, chat with your PDFs and notes, practice with smart quizzes, and learn through natural voice conversations. If you want to experience all this in real-time, please login now and get the full experience!";
        
        if (avatarRef.current) {
          avatarRef.current.speak(introductionText, 'en')
            .then(() => console.log('[Landing] Introduction speech completed'))
            .catch(err => console.error('[Landing] Introduction speech failed:', err));
        }
      }, 1000); // Small delay to ensure avatar is fully ready
    } else {
      console.log('[Landing] Introduction speech already played, skipping');
    }
  };

  const handleAvatarError = (error: string) => {
    console.error('[Landing] Unity avatar error:', error);
    setAvatarError(error);
    setAvatarLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">

      {/* Modern Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50'
            : 'bg-white/60 backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">

            {/* Logo */}
            <motion.div
              className="flex items-center gap-2 sm:gap-3"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <img 
                src={logoUrl} 
                alt="VaktaAI" 
                className="w-10 h-10 object-contain"
              />
              <span className="text-xl sm:text-2xl font-display font-bold bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent">
                VaktaAI
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a href="#features" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition">
                How it Works
              </a>
              <a href="#pricing" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition">
                Pricing
              </a>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onSignIn}
                variant="ghost"
                className="hidden sm:flex text-gray-700 hover:text-primary-600 hover:bg-primary-50"
              >
                Login
              </Button>
              <Button
                onClick={onStartLearning}
                className="bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <span className="hidden sm:inline">Start Learning Free</span>
                <span className="sm:hidden">Get Started</span>
              </Button>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden py-4 border-t border-gray-200"
            >
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-gray-700 hover:text-primary-600 font-medium">Features</a>
                <a href="#how-it-works" className="text-gray-700 hover:text-primary-600 font-medium">How it Works</a>
                <a href="#pricing" className="text-gray-700 hover:text-primary-600 font-medium">Pricing</a>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* AVATAR HERO SECTION - 70% of screen */}
      <motion.section
        className="relative pt-20 pb-12 px-4 sm:px-6 min-h-[75vh] flex flex-col items-center justify-center overflow-hidden"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        <div className="max-w-6xl mx-auto w-full">
          
          {/* Avatar Greeting - Floating above */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4 text-center"
          >
            <motion.div
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-base font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Welcome! I'm your AI Mentor
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Always Online
                </div>
              </div>
            </motion.div>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-8 items-center">
            
            {/* Left - Main Message */}
            <div className="lg:col-span-2 text-center lg:text-left order-2 lg:order-1">
              <motion.h1
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
              >
                <span className="block text-gray-900">Have Any Doubts?</span>
                <span className="block bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent mt-1">
                  Ask Me Now!
                </span>
              </motion.h1>

              {/* Trust Bullets */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-6 text-sm text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">24/7</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary-600" />
                  <span className="font-medium">Hindi + English</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Instant</span>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-3 items-center lg:items-start mb-6"
              >
                <Button
                  onClick={handleVoiceClick}
                  size="lg"
                  className="group w-full sm:w-auto px-8 py-6 text-base rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 hover:from-orange-600 hover:via-red-600 hover:to-purple-700 text-white font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
                  data-testid="button-voice-start"
                >
                  <Mic className="w-5 h-5 mr-2 group-hover:scale-110 transition" />
                  <span>Try Voice Now - Free!</span>
                </Button>

                <Button
                  onClick={() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-6 py-5 text-sm rounded-2xl border-2 border-gray-300 hover:border-primary-500 font-semibold text-gray-700 hover:text-primary-600 transition-all"
                  data-testid="button-see-how-works"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span>See How It Works</span>
                </Button>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-gray-600"
              >
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span><span className="font-bold text-gray-900">10L+</span> students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-primary-600" />
                  <span><span className="font-bold text-gray-900">4.8/5</span> rating</span>
                </div>
              </motion.div>
            </div>

            {/* Right - ACTUAL UNITY 3D AVATAR */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="lg:col-span-3 order-1 lg:order-2 relative"
            >
              <div className="relative aspect-[4/3] w-full max-w-2xl mx-auto">
                {/* Avatar Container with glassmorphism background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
                  
                  {/* Unity 3D Avatar - Real WebGL */}
                  <div 
                    id="hero-unity-avatar" 
                    className="w-full h-full relative"
                    data-testid="hero-avatar-container"
                  >
                    {/* Loading Overlay */}
                    {avatarLoading && !avatarError && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 360],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className="mb-4"
                        >
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 via-red-400 to-purple-500 p-1">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <Brain className="w-10 h-10 text-orange-500" />
                            </div>
                          </div>
                        </motion.div>
                        
                        <div className="text-center space-y-3 px-6">
                          <div className="text-xl font-bold text-gray-900">
                            Loading Your AI Mentor...
                          </div>
                          <div className="text-sm text-gray-600">
                            3D Avatar initializing • This may take 10-15 seconds
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Downloading 97MB WebGL assets...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error State */}
                    {avatarError && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm p-8">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                          <X className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="text-center space-y-2">
                          <div className="text-lg font-bold text-gray-900">
                            Avatar Not Available
                          </div>
                          <div className="text-sm text-gray-600 max-w-md">
                            {avatarError}
                          </div>
                          <div className="text-xs text-gray-500 mt-4">
                            Don't worry! You can still chat via text after signing up.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Unity Avatar Component */}
                    <UnityAvatar
                      ref={avatarRef}
                      className="w-full h-full"
                      defaultAvatar="priya"
                      onReady={handleAvatarReady}
                      onError={handleAvatarError}
                    />

                    {/* Sample chat bubbles - only show when avatar ready */}
                    {avatarReady && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5, duration: 0.6 }}
                          className="absolute top-6 left-6 max-w-[200px] p-3 rounded-2xl rounded-tl-sm bg-gray-100 shadow-lg text-xs hidden sm:block z-20"
                        >
                          "Explain Pythagoras theorem"
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8, duration: 0.6 }}
                          className="absolute bottom-6 right-6 max-w-[200px] p-3 rounded-2xl rounded-br-sm bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-lg text-xs hidden sm:block z-20"
                        >
                          Sure! a² + b² = c²...
                        </motion.div>
                      </>
                    )}
                  </div>

                  {/* Floating indicator badges */}
                  {avatarReady && (
                    <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-green-200 z-20">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-semibold text-green-800">Avatar Live!</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Decorative glow effect around avatar */}
                <div className="absolute -inset-4 bg-gradient-to-r from-orange-300/20 via-purple-300/20 to-pink-300/20 rounded-3xl blur-2xl -z-10 animate-pulse" />
              </div>
            </motion.div>

          </div>
        </div>

        {/* Decorative gradient orbs - reduced on mobile */}
        <div className="absolute top-10 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-orange-200/30 to-red-200/30 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Why Students <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Love VaktaAI</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful AI features designed specifically for Indian students
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'AI Mentor in Multiple Languages',
                desc: 'Ask doubts in English or Hindi - AI understands and explains perfectly',
                color: 'from-primary-500 to-orange-600'
              },
              {
                icon: FileText,
                title: 'Chat with PDFs',
                desc: 'Upload NCERT books, notes - Ask questions directly to AI',
                color: 'from-blue-500 to-cyan-600'
              },
              {
                icon: MessageSquare,
                title: 'Voice Conversations',
                desc: 'Clear doubts via voice - AI responds with natural speech',
                color: 'from-purple-500 to-pink-600'
              },
              {
                icon: Target,
                title: 'Smart Quizzes',
                desc: 'Auto-generated quizzes from your study material',
                color: 'from-green-500 to-emerald-600'
              },
              {
                icon: Trophy,
                title: 'Gamified Learning',
                desc: 'Earn XP, badges, maintain streaks - Make learning fun',
                color: 'from-yellow-500 to-orange-600'
              },
              {
                icon: Sparkles,
                title: 'Personalized Plans',
                desc: 'AI-powered study plans tailored to your goals',
                color: 'from-indigo-500 to-purple-600'
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-2xl hover:border-primary-200 transition-all duration-300 cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary-600 transition">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Get Started in <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">3 Easy Steps</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Material', desc: 'Upload PDFs, notes, or YouTube videos', icon: FileText },
              { step: '02', title: 'Ask Questions', desc: 'Ask doubts in English or Hindi - AI answers instantly', icon: MessageSquare },
              { step: '03', title: 'Practice & Excel', desc: 'Solve quizzes, track progress, and excel', icon: Trophy },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-300 h-full">
                  <div className="text-6xl font-display font-bold text-primary-100 mb-4">{item.step}</div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center mb-4 shadow-lg">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-primary-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Subject Coverage Section */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">All Subjects</span> Covered
            </h2>
            <p className="text-lg text-gray-600">Ready for CBSE, JEE, and NEET</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Physics', icon: Atom, color: 'from-blue-500 to-cyan-600' },
              { name: 'Chemistry', icon: Beaker, color: 'from-green-500 to-emerald-600' },
              { name: 'Maths', icon: Calculator, color: 'from-purple-500 to-pink-600' },
              { name: 'Biology', icon: Dna, color: 'from-red-500 to-orange-600' },
              { name: 'English', icon: Book, color: 'from-indigo-500 to-blue-600' },
              { name: 'Hindi', icon: PenTool, color: 'from-yellow-500 to-orange-600' },
            ].map((subject, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                data-testid={`subject-badge-${subject.name.toLowerCase()}`}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${subject.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <subject.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-900 text-center">{subject.name}</p>
              </motion.div>
            ))}
          </div>

          {/* Board badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {['CBSE', 'JEE Main', 'JEE Advanced', 'NEET'].map((board, index) => (
              <div
                key={index}
                className="px-4 py-2 bg-white rounded-full border-2 border-primary-200 text-sm font-semibold text-gray-800 shadow-sm hover:shadow-md hover:border-primary-400 transition-all duration-300"
                data-testid={`board-badge-${board.toLowerCase().replace(' ', '-')}`}
              >
                {board}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Real Student</span> Reviews
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              10 lakh+ students learning with VaktaAI
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Priya Sharma',
                class: 'Class 12 • JEE Aspirant',
                rating: 5,
                review: 'The AI mentor explains tough Physics concepts so clearly! Even Maths feels easy now. Truly deserves 4.8/5!'
              },
              {
                name: 'Arjun Patel',
                class: 'Class 11 • NEET Prep',
                rating: 5,
                review: 'Clearing Biology and Chemistry doubts through voice is super convenient. The AI mentor is available 24/7 - even late at night!'
              },
              {
                name: 'Sneha Reddy',
                class: 'Class 10 • CBSE',
                rating: 5,
                review: 'Uploading NCERT PDFs and asking questions directly is incredibly helpful! Math practice questions generate automatically. Feeling confident for Board exams!'
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white to-primary-50/30 rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300"
                data-testid={`testimonial-${index}`}
              >
                {/* Rating stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Review text */}
                <p className="text-gray-700 mb-6 leading-relaxed italic">
                  "{testimonial.review}"
                </p>

                {/* Student info */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.class}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Enhanced Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 rounded-2xl p-8 shadow-2xl"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
              <div className="space-y-2">
                <div className="text-4xl font-bold" data-testid="stat-active-students">10L+</div>
                <div className="text-sm opacity-90">Active Students</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold" data-testid="stat-doubts-cleared">50L+</div>
                <div className="text-sm opacity-90">Doubts Cleared</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold" data-testid="stat-average-rating">4.8/5</div>
                <div className="text-sm opacity-90">Average Rating</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold" data-testid="stat-success-rate">95%</div>
                <div className="text-sm opacity-90">Success Rate</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4">
              Start for <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Free</span>
            </h2>
            <p className="text-lg text-gray-600">No credit card required • Cancel anytime</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '₹0',
                period: 'forever',
                features: [
                  '5 AI questions/day',
                  'Basic document upload',
                  'Community access',
                  'Mobile app'
                ],
                cta: 'Get Started',
                popular: false
              },
              {
                name: 'Pro',
                price: '₹99',
                period: '/month',
                features: [
                  'Unlimited AI questions',
                  'Unlimited document uploads',
                  'Voice conversations',
                  'Priority support',
                  'Advanced analytics',
                  'Custom study plans'
                ],
                cta: 'Start Free Trial',
                popular: true
              },
              {
                name: 'Pro Plus',
                price: '₹199',
                period: '/month',
                features: [
                  'Everything in Pro',
                  'Live doubt clearing sessions',
                  '1-on-1 mentorship',
                  'Exam prep modules',
                  'Offline access'
                ],
                cta: 'Contact Sales',
                popular: false
              },
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className={`relative bg-white rounded-2xl p-8 border-2 ${
                  plan.popular ? 'border-primary-500 shadow-2xl' : 'border-gray-200'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="px-4 py-1 bg-gradient-to-r from-primary-500 to-secondary-600 text-white text-sm font-semibold rounded-full shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={onStartLearning}
                  className={`w-full py-6 text-base font-semibold rounded-xl transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl'
                      : 'border-2 border-gray-300 hover:border-primary-500 bg-white text-gray-700 hover:text-primary-600'
                  }`}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold">VaktaAI</span>
          </div>
          <p className="text-gray-400 mb-6">
            Making education accessible for every Indian student
          </p>
          <div className="text-sm text-gray-500">
            © 2025 VaktaAI. All rights reserved.
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

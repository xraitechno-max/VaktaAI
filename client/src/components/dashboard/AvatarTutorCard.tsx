/**
 * 🎭 AI Avatar Tutor Hero Card - Dashboard Centerpiece
 * Large interactive card featuring Unity 3D avatar with "Ask Doubt" CTA
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Brain, Mic, ChevronRight, Sparkles, Languages,
  Atom, FlaskConical, Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AvatarTutorCardProps {
  className?: string;
}

export function AvatarTutorCard({ className = '' }: AvatarTutorCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Subject badges for Indian students (CBSE/JEE/NEET)
  const subjects = [
    { name: 'Physics', icon: Atom, color: 'from-blue-500 to-cyan-600' },
    { name: 'Chemistry', icon: FlaskConical, color: 'from-purple-500 to-pink-600' },
    { name: 'Maths', icon: Calculator, color: 'from-orange-500 to-red-600' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 p-8 sm:p-10 ${className}`}
      data-testid="card-avatar-tutor"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Floating Sparkles */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-8 right-8"
      >
        <Sparkles className="w-6 h-6 text-white/60" />
      </motion.div>

      <div className="relative z-10 flex flex-col h-full min-h-[400px] sm:min-h-[450px]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <Badge 
              variant="secondary" 
              className="bg-white/20 text-white backdrop-blur-sm border-white/30 hover:bg-white/30"
              data-testid="badge-ai-powered"
            >
              AI Powered
            </Badge>
          </div>

          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
            AI Avatar Mentor
          </h2>
          <p className="text-white/90 text-base sm:text-lg">
            Your 24/7 personal study companion with voice interaction
          </p>
        </div>

        {/* Unity Avatar Preview - MinimizedBubble Style */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <motion.div
            animate={{
              y: isHovered ? [0, -5, 0] : 0,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
            data-testid="avatar-preview-bubble"
          >
            {/* Pulse Ring Animation (Always Active) */}
            <motion.div
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-3xl border-4 border-white/40"
              style={{ transformOrigin: 'center' }}
            />

            {/* Avatar Bubble - MinimizedBubble Design */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 shadow-2xl shadow-purple-500/50 overflow-hidden">
              {/* Avatar Icon (User SVG from MinimizedBubble) */}
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-24 h-24 sm:w-32 sm:h-32 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>

              {/* Always Online Indicator (Speaking State Visual) */}
              <div className="absolute bottom-4 right-4">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                </span>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">AI Mentor Ready</span>
              </div>
            </div>

            {/* Live Badge */}
            <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center gap-1 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Always Online
            </div>
          </motion.div>
        </div>

        {/* Subject Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {subjects.map((subject) => (
            <Badge
              key={subject.name}
              variant="secondary"
              className="bg-white/15 text-white backdrop-blur-sm border-white/20 hover:bg-white/25"
              data-testid={`badge-subject-${subject.name.toLowerCase()}`}
            >
              <subject.icon className="w-3 h-3 mr-1" />
              {subject.name}
            </Badge>
          ))}
        </div>

        {/* Features List */}
        <div className="space-y-2 mb-6">
          {[
            { icon: Mic, text: 'Voice + Text Input' },
            { icon: Languages, text: 'English + Hindi Support' },
            { icon: Sparkles, text: 'Instant Doubt Solving' },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2 text-white/90 text-sm"
              data-testid={`text-feature-${index}`}
            >
              <feature.icon className="w-4 h-4 flex-shrink-0" />
              <span>{feature.text}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-auto">
          <Link href="/tutor" className="flex-1">
            <motion.div whileTap={{ scale: 0.97 }} className="w-full">
              <Button
                size="lg"
                className="w-full bg-white text-primary-600 hover:bg-white/90 font-semibold group/btn relative overflow-hidden"
                data-testid="button-start-voice-mentor"
              >
                {/* Ripple Effect Layer */}
                <motion.span
                  className="absolute inset-0 bg-white/30 rounded-lg"
                  initial={{ scale: 0, opacity: 0.6 }}
                  whileHover={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
                <Mic className="w-5 h-5 mr-2 group-hover/btn:scale-110 transition relative z-10" />
                <span className="relative z-10">Start Voice Session</span>
                <ChevronRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition relative z-10" />
              </Button>
            </motion.div>
          </Link>

          <Link href="/tutor?mode=text">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm relative overflow-hidden"
                data-testid="button-text-chat"
              >
                <motion.span
                  className="absolute inset-0 bg-white/20 rounded-lg"
                  initial={{ scale: 0, opacity: 0.4 }}
                  whileHover={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative z-10">Text Chat</span>
              </Button>
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

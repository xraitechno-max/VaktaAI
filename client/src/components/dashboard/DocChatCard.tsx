/**
 * 📄 Document Chat Hero Card - Dashboard Centerpiece
 * Large interactive card with drag-drop zone and PDF/image upload
 */

import { useState, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, ChevronRight, Image, FileIcon,
  BookOpen, Sparkles, Search, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DocChatCardProps {
  className?: string;
}

export function DocChatCard({ className = '' }: DocChatCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Navigate to docchat with dropped files
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      console.log('[DocChat] Files dropped:', files.map(f => f.name));
      
      // Show success animation
      setShowSuccess(true);
      
      // Show success toast
      toast({
        title: "File uploaded successfully! 📄",
        description: `${files.length} file${files.length > 1 ? 's' : ''} ready to chat with`,
      });
      
      // Navigate after short delay
      setTimeout(() => {
        setShowSuccess(false);
        setLocation('/docchat');
      }, 800);
    }
  }, [setLocation, toast]);

  // File types supported
  const fileTypes = [
    { name: 'PDF', icon: FileText, color: 'text-red-500' },
    { name: 'Images', icon: Image, color: 'text-blue-500' },
    { name: 'Documents', icon: FileIcon, color: 'text-green-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      whileHover={{ scale: 1.02 }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-600 p-8 sm:p-10 ${className}`}
      data-testid="card-doc-chat"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
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
          ease: "easeInOut",
          delay: 0.5
        }}
        className="absolute top-8 left-8"
      >
        <Sparkles className="w-6 h-6 text-white/60" />
      </motion.div>

      <div className="relative z-10 flex flex-col h-full min-h-[400px] sm:min-h-[450px]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <Badge 
              variant="secondary" 
              className="bg-white/20 text-white backdrop-blur-sm border-white/30 hover:bg-white/30"
              data-testid="badge-smart-search"
            >
              Smart Search
            </Badge>
          </div>

          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
            Document Chat
          </h2>
          <p className="text-white/90 text-base sm:text-lg">
            Upload PDFs, images, or notes and chat with AI about them
          </p>
        </div>

        {/* Drag-Drop Zone */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <motion.div
            animate={{
              scale: isDragging ? 1.05 : 1,
            }}
            className={`
              w-full max-w-sm p-8 rounded-2xl border-4 border-dashed 
              ${isDragging 
                ? 'border-white bg-white/20 backdrop-blur-md' 
                : 'border-white/40 bg-white/10 backdrop-blur-sm'
              }
              transition-all duration-300
            `}
            data-testid="zone-file-drop"
          >
            <div className="text-center relative">
              {/* Upload Icon with Animation */}
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  // Success Check Icon
                  <motion.div
                    key="success"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex justify-center mb-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-2xl">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>
                ) : (
                  // Upload Icon
                  <motion.div
                    key="upload"
                    animate={{
                      y: isDragging ? [0, -10, 0] : 0,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: isDragging ? Infinity : 0,
                    }}
                    className="flex justify-center mb-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <h3 className="text-xl font-semibold text-white mb-2">
                {isDragging ? 'Drop files here!' : 'Drag & Drop'}
              </h3>
              <p className="text-white/80 text-sm mb-4">
                or click to browse files
              </p>

              {/* File Type Icons */}
              <div className="flex justify-center gap-3">
                {fileTypes.map((type) => (
                  <div
                    key={type.name}
                    className="flex flex-col items-center gap-1"
                    data-testid={`icon-filetype-${type.name.toLowerCase()}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <type.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs text-white/70">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features List */}
        <div className="space-y-2 mb-6">
          {[
            { icon: Search, text: 'Instant Search & Citations' },
            { icon: Sparkles, text: 'AI-Powered Summaries' },
            { icon: BookOpen, text: 'Multiple Documents Support' },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="flex items-center gap-2 text-white/90 text-sm"
              data-testid={`text-feature-${index}`}
            >
              <feature.icon className="w-4 h-4 flex-shrink-0" />
              <span>{feature.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Recent Documents (Mock) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-sm font-medium">Recent Uploads</span>
            <Link href="/docchat">
              <button className="text-white/80 text-xs hover:text-white transition" data-testid="link-view-all">
                View all →
              </button>
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['NCERT Physics Ch1.pdf', 'Chemistry Notes.pdf', 'Maths Formula.jpg'].map((doc, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-white/15 text-white backdrop-blur-sm border-white/20 hover:bg-white/25 whitespace-nowrap"
                data-testid={`badge-recent-doc-${index}`}
              >
                <FileText className="w-3 h-3 mr-1" />
                {doc.split('.')[0].substring(0, 15)}...
              </Badge>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-auto">
          <Link href="/docchat" className="flex-1">
            <Button
              size="lg"
              className="w-full bg-white text-blue-600 hover:bg-white/90 font-semibold group/btn"
              data-testid="button-upload-document"
            >
              <Upload className="w-5 h-5 mr-2 group-hover/btn:scale-110 transition" />
              Upload Document
              <ChevronRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition" />
            </Button>
          </Link>

          <Link href="/docchat?demo=true">
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
              data-testid="button-try-demo"
            >
              Try Demo
            </Button>
          </Link>
        </div>
      </div>

      {/* Drag Overlay Effect */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/10 backdrop-blur-sm z-20 pointer-events-none"
        />
      )}
    </motion.div>
  );
}

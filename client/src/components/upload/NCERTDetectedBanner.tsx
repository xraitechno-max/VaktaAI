import React from 'react';
import { CheckCircle, BookOpen, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface NCERTBannerProps {
  book: {
    class: number;
    subject: string;
    board: string;
    chapters: any[];
  };
  onGenerateFlashcards: () => void;
}

export function NCERTDetectedBanner({ book, onGenerateFlashcards }: NCERTBannerProps) {
  return (
    <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-green-700">
              NCERT Detected! 🎉
            </h3>
          </div>

          <p className="text-gray-700 mb-3">
            We recognized this as <strong>NCERT {book.subject} Class {book.class}</strong>.
            Auto-fetched complete book with {book.chapters.length} chapters from DIKSHA.
          </p>

          {/* Chapter List */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Chapters Available:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {book.chapters.slice(0, 6).map(ch => (
                <div key={ch.ch} className="text-sm text-gray-600">
                  Ch {ch.ch}: {ch.title}
                </div>
              ))}
              {book.chapters.length > 6 && (
                <div className="text-sm text-gray-500">
                  +{book.chapters.length - 6} more...
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onGenerateFlashcards}
              className="bg-green-600 hover:bg-green-700"
            >
              Generate Flashcards
            </Button>
            <Button variant="outline">
              Take Quiz
            </Button>
            <Button variant="outline">
              Chat with Document
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}



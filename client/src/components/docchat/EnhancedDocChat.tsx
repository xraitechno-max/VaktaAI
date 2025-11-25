/**
 * Professional DocChat Interface
 * Clean, fast, and smooth chat experience
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface EnhancedDocChatProps {
  chatId: number;
  selectedDocuments: number[];
  onError?: (error: string) => void;
}

export function EnhancedDocChat({ chatId, selectedDocuments, onError }: EnhancedDocChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loadingState, setLoadingState] = useState<'analyzing' | 'searching' | 'generating' | null>(null);
  const [showTimeout, setShowTimeout] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom smoothly
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingContent]);

  // Auto-focus textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  const handleSendMessage = async (retryQuery?: string) => {
    const queryToSend = retryQuery || inputValue.trim();
    if (!queryToSend || isStreaming || selectedDocuments.length === 0) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryToSend,
      timestamp: new Date()
    };

    // Add user message instantly (only if not retrying)
    if (!retryQuery) {
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
    }

    setIsStreaming(true);
    setStreamingContent('');
    setLoadingState('analyzing');
    setShowTimeout(false);
    setLastFailedQuery(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // PHASE 4: Timeout warning after 10 seconds
      const timeoutWarning = setTimeout(() => {
        setShowTimeout(true);
      }, 10000);

      // Start timer for loading state transitions
      const analyzingTimer = setTimeout(() => setLoadingState('searching'), 500);
      const searchingTimer = setTimeout(() => setLoadingState('generating'), 1000);

      const response = await fetch('/api/docchat/enhanced-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          chatId,
          query: userMessage.content,
          documentIds: selectedDocuments
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response reader available');

      clearTimeout(timeoutWarning);
      clearTimeout(analyzingTimer);
      clearTimeout(searchingTimer);
      setLoadingState(null);
      setShowTimeout(false);

      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'content':
              case 'sentence':
                fullContent += data.content;
                setStreamingContent(fullContent);
                break;

              case 'done':
                // Save complete message
                const assistantMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: fullContent,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingContent('');
                break;

              case 'error':
                throw new Error(data.error);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        onError?.(error.message || 'Failed to get response');

        // PHASE 4: Enhanced error handling with retry
        setLastFailedQuery(queryToSend);

        // Add error message with retry indicator
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.',
          timestamp: new Date(),
          error: true
        }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setLoadingState(null);
      setShowTimeout(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Ask me anything about your documents
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                I can help you understand, summarize, or find specific information.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              <button
                onClick={() => setInputValue("es doc me kya hai?")}
                className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
              >
                What's in this document?
              </button>
              <button
                onClick={() => setInputValue("What are the main topics?")}
                className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
              >
                Main topics
              </button>
              <button
                onClick={() => setInputValue("Summarize this chapter")}
                className="px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
              >
                Summarize
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 items-start animate-fadeIn",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Avatar - Left (Assistant) */}
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all",
                message.role === 'user'
                  ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
                  : message.error
                  ? "bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              )}
            >
              {message.error && (
                <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Error</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
              <div className={cn(
                "mt-1.5 text-xs opacity-60",
                message.role === 'user' ? "text-white" : message.error ? "text-red-600" : "text-slate-500"
              )}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Avatar - Right (User) */}
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming Message */}
        {isStreaming && (
          <div className="flex gap-3 items-start animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>

            <div className="max-w-[75%] space-y-2">
              <div className="rounded-2xl px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                {streamingContent ? (
                  <>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">
                      {streamingContent}
                    </p>
                    <span className="inline-block w-0.5 h-4 ml-1 bg-purple-600 animate-pulse" />
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm">
                      {loadingState === 'analyzing' && 'Analyzing your question...'}
                      {loadingState === 'searching' && 'Searching documents...'}
                      {loadingState === 'generating' && 'Generating response...'}
                      {!loadingState && 'Thinking...'}
                    </span>
                  </div>
                )}
              </div>

              {/* PHASE 4: Timeout Warning */}
              {showTimeout && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Taking longer than usual... Still processing your request.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 4: Retry Button (appears after errors) */}
        {lastFailedQuery && !isStreaming && (
          <div className="flex justify-center animate-fadeIn">
            <Button
              onClick={() => handleSendMessage(lastFailedQuery)}
              variant="outline"
              size="sm"
              className="gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300"
            >
              <RefreshCw className="w-4 h-4" />
              Retry last question
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* PHASE 4: Input Area - Mobile Optimized */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-4 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedDocuments.length > 0
                ? "Ask a question... (Enter to send, Shift+Enter for new line)"
                : "Select documents to start chatting..."
            }
            disabled={selectedDocuments.length === 0 || isStreaming}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-500 transition-colors px-4 py-3 text-sm touch-manipulation"
            rows={1}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || selectedDocuments.length === 0 || isStreaming}
            className="h-11 w-11 min-w-[44px] rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95 touch-manipulation"
            size="icon"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {selectedDocuments.length > 0 && messages.length === 0 && (
          <div className="max-w-4xl mx-auto mt-3">
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              💡 <strong>Tip:</strong> Ask in Hindi/Hinglish or English. I understand both!
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

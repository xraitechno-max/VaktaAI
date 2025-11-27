import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  Loader2,
  FileText,
} from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
  fileUrl: string;
  title?: string;
  onPageChange?: (page: number, totalPages: number) => void;
}

export default function PDFViewer({ fileUrl, title, onPageChange }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1, 2, 3]));
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const fileConfig = useMemo(() => ({
    url: fileUrl,
    withCredentials: true,
  }), [fileUrl]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 32;
        setContainerWidth(Math.max(300, width));
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || '0', 10);
          if (pageNum > 0) {
            setVisiblePages((prev) => {
              const next = new Set(prev);
              if (entry.isIntersecting) {
                next.add(pageNum);
                for (let i = Math.max(1, pageNum - 1); i <= Math.min(numPages, pageNum + 2); i++) {
                  next.add(i);
                }
              }
              return next;
            });
          }
        });
      },
      { rootMargin: '200px 0px', threshold: 0.1 }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    setVisiblePages(new Set([1, 2, 3]));
    onPageChange?.(1, numPages);
  }, [onPageChange]);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setError(err.message || 'Failed to load PDF');
    setLoading(false);
  }, []);

  const handleZoomIn = () => {
    setFitToWidth(false);
    setScale(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setFitToWidth(false);
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const toggleFitToWidth = () => {
    setFitToWidth(prev => !prev);
    if (!fitToWidth) {
      setScale(1.0);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl, { credentials: 'include' });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const pageWidth = useMemo(() => {
    if (fitToWidth) {
      return containerWidth;
    }
    return containerWidth * scale;
  }, [fitToWidth, containerWidth, scale]);

  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el);
    } else {
      pageRefs.current.delete(pageNum);
    }
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 p-8">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Toolbar */}
      <div className="h-11 border-b border-border/50 flex items-center justify-between px-3 bg-card/50 backdrop-blur-sm shrink-0">
        {/* Page count */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {numPages > 0 ? `${numPages} pages` : 'Loading...'}
          </span>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
            disabled={!fitToWidth && scale <= 0.5}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
            {fitToWidth ? 'Fit' : `${Math.round(scale * 100)}%`}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
            disabled={!fitToWidth && scale >= 3}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <Button
            variant={fitToWidth ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={toggleFitToWidth}
            data-testid="button-fit-width"
            title="Fit to width"
          >
            {fitToWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRotate}
            data-testid="button-rotate"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            data-testid="button-download"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content - Scrollable all pages */}
      <ScrollArea className="flex-1" ref={containerRef}>
        <div className="flex flex-col items-center gap-4 py-4 px-4">
          <Document
            file={fileConfig}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary animate-spin" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-1 rounded-full bg-background" />
                  <div className="absolute inset-3 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            }
            error={
              <div className="text-center py-8 text-destructive">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Failed to load PDF</p>
              </div>
            }
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, index) => {
              const pageNum = index + 1;
              const isVisible = visiblePages.has(pageNum);
              
              return (
                <div
                  key={pageNum}
                  ref={(el) => setPageRef(pageNum, el)}
                  data-page={pageNum}
                  className="relative"
                  style={{ minHeight: isVisible ? 'auto' : '800px' }}
                >
                  {isVisible ? (
                    <Page
                      pageNumber={pageNum}
                      width={pageWidth}
                      rotate={rotation}
                      className="shadow-lg rounded-md overflow-hidden bg-white"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <div 
                          className="bg-card/50 flex items-center justify-center rounded-md"
                          style={{ width: pageWidth, height: pageWidth * 1.4 }}
                        >
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      }
                    />
                  ) : (
                    <div 
                      className="bg-card/30 rounded-md flex items-center justify-center"
                      style={{ width: pageWidth, height: pageWidth * 1.4 }}
                    >
                      <span className="text-xs text-muted-foreground">Page {pageNum}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </Document>
        </div>
      </ScrollArea>
    </div>
  );
}

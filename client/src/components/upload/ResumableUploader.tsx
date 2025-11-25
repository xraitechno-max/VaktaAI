import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

interface UploadSession {
  sessionId: string;
  chunkSize: number;
  totalChunks: number;
}

export function ResumableUploader() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [session, setSession] = useState<UploadSession | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  /**
   * Calculate file hash
   */
  const calculateHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Initialize upload
   */
  const initializeUpload = async (file: File): Promise<UploadSession> => {
    const fileHash = await calculateHash(file);

    const response = await axios.post('/api/upload/init', {
      fileName: file.name,
      fileSize: file.size,
      fileHash
    });

    return response.data.session;
  };

  /**
   * Upload chunk
   */
  const uploadChunk = async (
    session: UploadSession,
    file: File,
    chunkIndex: number
  ): Promise<void> => {
    const start = chunkIndex * session.chunkSize;
    const end = Math.min(start + session.chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('sessionId', session.sessionId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('chunk', chunk);

    await axios.post('/api/upload/chunk', formData);

    // Update progress
    const uploaded = chunkIndex + 1;
    const percent = Math.round((uploaded / session.totalChunks) * 100);
    setProgress(percent);
  };

  /**
   * Finalize upload
   */
  const finalizeUpload = async (session: UploadSession): Promise<string> => {
    const response = await axios.post('/api/upload/finalize', {
      sessionId: session.sessionId
    });

    return response.data.documentId;
  };

  /**
   * Handle file drop
   */
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setCurrentFile(file);
    setUploading(true);
    setProgress(0);

    try {
      // Initialize
      toast.info('Initializing upload...');
      const uploadSession = await initializeUpload(file);
      setSession(uploadSession);

      // Upload chunks
      toast.info(`Uploading ${file.name}...`);
      
      for (let i = 0; i < uploadSession.totalChunks; i++) {
        await uploadChunk(uploadSession, file, i);
      }

      // Finalize
      toast.info('Finalizing upload...');
      const documentId = await finalizeUpload(uploadSession);

      // Connect to WebSocket for progress
      connectToProgress(documentId);

      toast.success('Upload complete! Processing document...');

    } catch (error: any) {
      console.error('Upload failed:', error);
      
      if (error.response?.status === 429) {
        toast.error('Too many uploads. Please wait and try again.');
      } else {
        toast.error('Upload failed. You can resume later.');
      }
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * Resume upload
   */
  const resumeUpload = async () => {
    if (!session || !currentFile) return;

    setUploading(true);

    try {
      // Get missing chunks
      const response = await axios.get(`/api/upload/status/${session.sessionId}`);
      const { missingChunks } = response.data;

      toast.info(`Resuming upload... ${missingChunks.length} chunks remaining`);

      // Upload missing chunks
      for (const chunkIndex of missingChunks) {
        await uploadChunk(session, currentFile, chunkIndex);
      }

      // Finalize
      const documentId = await finalizeUpload(session);
      connectToProgress(documentId);

      toast.success('Upload complete!');

    } catch (error) {
      toast.error('Resume failed');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Connect to WebSocket for processing progress
   */
  const connectToProgress = (documentId: string) => {
    const ws = new WebSocket(`ws://localhost:3000/ws/document/${documentId}/progress`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'progress') {
        if (data.status === 'partially_ready') {
          toast.success(data.message);
        } else if (data.status === 'completed') {
          toast.success('Document ready! 🎉');
          // Redirect to document
          window.location.href = `/documents/${documentId}`;
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
    disabled: uploading
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isDragActive ? (
          <p className="text-blue-500 text-lg">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-gray-600 text-lg mb-2">
              📚 Drag & drop a document, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF, DOCX, Images • Max 100MB
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      {uploading && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Uploading...</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {/* Resume Button */}
      {session && !uploading && progress < 100 && (
        <Button
          onClick={resumeUpload}
          className="mt-4 w-full"
          variant="outline"
        >
          Resume Upload
        </Button>
      )}
    </div>
  );
}



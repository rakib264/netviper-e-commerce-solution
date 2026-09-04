'use client';

import { Progress } from '@/components/ui/progress';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, File, Image, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

interface FileUploadProps {
  onUpload?: (url: string) => void;
  onUploadMultiple?: (urls: string[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}

export default function FileUpload({
  onUpload,
  onUploadMultiple,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB
  multiple = false,
  className = ""
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url as string;
  };

  const isAcceptedType = (file: File) => {
    if (!accept || accept.trim() === '*' || accept.trim() === '*/*') return true;

    const tokens = accept
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const mime = (file.type || '').toLowerCase();
    const ext = file.name.includes('.')
      ? `.${file.name.split('.').pop()!.toLowerCase()}`
      : '';

    const mimeByExt: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
    };
    const effectiveMime = mime || mimeByExt[ext] || '';

    return tokens.some((token) => {
      // Extension token: .jpg, .mp4
      if (token.startsWith('.')) {
        return ext === token;
      }
      // Wildcard MIME: image/*, video/*
      if (token.endsWith('/*')) {
        return effectiveMime.startsWith(token.slice(0, -1));
      }
      // Exact MIME: video/mp4
      return effectiveMime === token;
    });
  };

  const validateFile = (file: File) => {
    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    if (!isAcceptedType(file)) {
      throw new Error('Invalid file type');
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const filesArray = Array.from(files);

      // Validate all files first
      try {
        filesArray.forEach(validateFile);
      } catch (err: any) {
        setError(err.message || 'Invalid file');
        setUploading(false);
        setProgress(0);
        return;
      }

      if (multiple) {
        const urls: string[] = [];
        for (let i = 0; i < filesArray.length; i++) {
          const url = await uploadSingleFile(filesArray[i]);
          urls.push(url);
          setProgress(Math.round(((i + 1) / filesArray.length) * 100));
        }
        // Callback for multiple
        if (onUploadMultiple) {
          onUploadMultiple(urls);
        } else if (onUpload) {
          urls.forEach(u => onUpload(u));
        }
      } else {
        const url = await uploadSingleFile(filesArray[0]);
        setProgress(100);
        onUpload && onUpload(url);
      }

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 400);
    } catch (error) {
      setError('Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-ring'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="space-y-4"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Upload className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Uploading...</p>
                <Progress value={progress} className="mt-2" />
                <p className="text-xs text-subtle-foreground mt-1">{progress}% complete</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="space-y-4"
            >
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto">
                {accept.includes('image') ? (
                  <Image className="text-subtle-foreground" size={24} />
                ) : (
                  <File className="text-subtle-foreground" size={24} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-subtle-foreground">
                  {accept} up to {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-destructive-600 text-sm"
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
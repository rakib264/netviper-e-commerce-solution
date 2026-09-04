'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Plus, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface MultiImageUploadProps {
  onUpload?: (urls: string[]) => void;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  existingImages?: string[];
}

export default function MultiImageUpload({
  onUpload,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  className = "",
  existingImages = []
}: MultiImageUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(existingImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url as string;
  };

  const validateFile = (file: File) => {
    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    
    // Check if adding these files would exceed the limit
    if (uploadedImages.length + filesArray.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} images total`);
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      // Validate all files first
      try {
        filesArray.forEach(validateFile);
      } catch (err: any) {
        setError(err.message || t('multiImageUpload.messages.invalidFile'));
        setUploading(false);
        setProgress(0);
        return;
      }

      const newUrls: string[] = [];
      for (let i = 0; i < filesArray.length; i++) {
        const url = await uploadSingleFile(filesArray[i]);
        newUrls.push(url);
        setProgress(Math.round(((i + 1) / filesArray.length) * 100));
      }

      const updatedImages = [...uploadedImages, ...newUrls];
      setUploadedImages(updatedImages);
      onUpload && onUpload(updatedImages);

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 400);
    } catch (error) {
      setError(t('multiImageUpload.messages.uploadFailedPleaseTryAgain'));
      setUploading(false);
      setProgress(0);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(updatedImages);
    onUpload && onUpload(updatedImages);
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

  const canUploadMore = uploadedImages.length < maxFiles;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image Preview Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {uploadedImages.map((url, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative group"
            >
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                <img
                  src={url}
                  alt={t('common.uploadIndex', { index: index + 1 })}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X size={12} />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canUploadMore && (
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
            accept="image/*"
            multiple
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
                  <p className="text-sm font-medium text-muted-foreground">{t('multiImageUpload.uploading')}</p>
                  <Progress value={progress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">{t('common.percentComplete', { percent: progress })}</p>
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
                <div className="w-12 h-12 bg-secondary-300 rounded-full flex items-center justify-center mx-auto">
                  <Plus className="text-muted-foreground" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedImages.length === 0 
                      ? t('multiImageUpload.dropImagesHereOrClickTo') 
                      : t('multiImageUpload.addMoreImages')
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('multiImageUpload.imagesUpToSize', { size: Math.round(maxSize / 1024 / 1024) })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {uploadedImages.length}/{maxFiles} {t('multiImageUpload.imagesUploaded')}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Error Message */}
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

      {/* Upload Limit Message */}
      {!canUploadMore && (
        <div className="text-center text-sm text-subtle-foreground">
          {t('multiImageUpload.maxImagesReached', { max: maxFiles })}
        </div>
      )}
    </div>
  );
}

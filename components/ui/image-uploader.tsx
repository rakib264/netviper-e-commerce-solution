'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  dimensions?: string; // e.g., "200x100px"
}

export function ImageUploader({
  value,
  onChange,
  label,
  description,
  disabled = false,
  accept = 'image/*',
  maxSize = 5,
  dimensions
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Image size must be less than ${maxSize}MB`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onChange(data.url);
      } else {
        setError('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {dimensions && (
          <p className="text-xs text-subtle-foreground">Recommended: {dimensions}</p>
        )}
      </div>

      {value ? (
        <div className="relative group">
          <div className="relative w-40 h-32 border border-border rounded-lg overflow-hidden bg-card shadow-sm">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain p-3"
              onError={(e) => {
                // Fallback to default logo if image fails to load
                const target = e.target as HTMLImageElement;
                if (label === 'Primary Logo' && target.src !== '/muscarimart.png') {
                  target.src = '/muscarimart.png';
                } else if (label === 'Secondary Logo' && target.src !== '/logo.png') {
                  target.src = '/logo.png';
                }
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => document.getElementById(`file-input-${label}`)?.click()}
                  disabled={disabled || uploading}
                  className="h-8"
                >
                  <Upload size={14} className="mr-1" />
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="h-8"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group">
          {/* Show default logo preview */}
          <div className="relative w-40 h-32 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted">
            {(label === 'Primary Logo' || label === 'Secondary Logo') ? (
              <img
                src={label === 'Primary Logo' ? '/muscarimart.png' : '/logo.png'}
                alt={`Default ${label}`}
                className="w-full h-full object-contain p-3 opacity-60"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={24} className="text-subtle-foreground" />
              </div>
            )}
            
            {/* Upload overlay */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-20 flex flex-col items-center justify-center cursor-pointer hover:bg-opacity-40 transition-all"
              onClick={() => !disabled && !uploading && document.getElementById(`file-input-${label}`)?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-white">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1 text-white">
                  <Upload size={20} />
                  <span className="text-xs text-center font-medium">Upload Logo</span>
                  <span className="text-xs opacity-80">Max {maxSize}MB</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        id={`file-input-${label}`}
        type="file"
        accept={accept}
        onChange={handleFileUpload}
        disabled={disabled || uploading}
        className="hidden"
      />

      {error && (
        <p className="text-sm text-destructive-600">{error}</p>
      )}
    </div>
  );
}

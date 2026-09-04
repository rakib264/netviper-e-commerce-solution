'use client';

import FileUpload from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createMediaId,
  isPlayableVideoFile,
  isVideoUrl,
  withPosterFrame,
  type MediaItem,
} from '@/lib/products/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Film, GripVertical, ImageIcon, Play, Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

function SortableMediaTile({
  item,
  onRemove,
}: {
  item: MediaItem;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
    >
      {item.type === 'image' ? (
        <Image src={item.url} alt="" fill className="object-cover" sizes="120px" />
      ) : isPlayableVideoFile(item.url) ? (
        <>
          <video
            src={withPosterFrame(item.url)}
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
            preload="metadata"
            onMouseEnter={(e) => {
              void e.currentTarget.play().catch(() => undefined);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0.1;
            }}
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/55 p-2 text-white">
              <Play className="h-4 w-4 fill-white" />
            </span>
          </span>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-foreground text-white">
          <Film className="h-6 w-6" />
          <span className="px-1 text-[10px] font-label uppercase tracking-wide">Embed</span>
        </div>
      )}
      <button
        type="button"
        className="absolute left-1 top-1 rounded bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded bg-destructive-600 p-1 text-white opacity-0 transition group-hover:opacity-100"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] uppercase text-white">
        {item.type}
      </span>
    </div>
  );
}

interface MediaGalleryEditorProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export default function MediaGalleryEditor({
  media,
  onChange,
  label = 'Media Gallery',
  required,
  error,
}: MediaGalleryEditorProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addImages = (urls: string[]) => {
    const next = [
      ...media,
      ...urls.map((url) => ({
        id: createMediaId(),
        type: (isVideoUrl(url) ? 'video' : 'image') as MediaItem['type'],
        url,
      })),
    ];
    onChange(next);
  };

  const addVideoLink = () => {
    const trimmed = videoUrl.trim();
    if (!trimmed) return;
    onChange([
      ...media,
      { id: createMediaId(), type: 'video', url: trimmed },
    ]);
    setVideoUrl('');
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = media.findIndex((m) => m.id === active.id);
    const newIndex = media.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(media, oldIndex, newIndex));
  };

  const imageCount = media.filter((m) => m.type === 'image').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">
          {label}
          {required ? <span className="text-destructive-500"> *</span> : null}
        </Label>
        <span className="text-xs font-caption text-subtle-foreground">
          {media.length} item{media.length === 1 ? '' : 's'}
          {required && imageCount === 0 ? ' · needs at least 1 image' : ''}
        </span>
      </div>

      <FileUpload
        multiple
        accept="image/*,video/mp4,video/webm"
        maxSize={25 * 1024 * 1024}
        onUploadMultiple={addImages}
        onUpload={(url) => addImages([url])}
      />

      <div className="flex gap-2">
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Or paste a video URL (mp4, YouTube, Vimeo)"
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={addVideoLink}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {media.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={media.map((m) => m.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {media.map((item) => (
                <SortableMediaTile
                  key={item.id}
                  item={item}
                  onRemove={() => onChange(media.filter((m) => m.id !== item.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-6 text-sm text-subtle-foreground">
          <ImageIcon className="h-4 w-4" />
          Drag to reorder after uploading. Images and videos can be mixed.
        </div>
      )}

      {error ? <p className="text-sm text-destructive-500">{error}</p> : null}
    </div>
  );
}

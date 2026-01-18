'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  default: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({
  size = 'default',
  className,
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// Full page loading spinner
interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = '読み込み中...' }: PageLoadingProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Inline loading spinner
interface InlineLoadingProps {
  text?: string;
}

export function InlineLoading({ text }: InlineLoadingProps) {
  return <LoadingSpinner size="sm" text={text} />;
}

// Button loading spinner (for use inside buttons)
export function ButtonLoading() {
  return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
}

// Overlay loading (for blocking UI during operations)
interface OverlayLoadingProps {
  isLoading: boolean;
  text?: string;
  children: React.ReactNode;
}

export function OverlayLoading({
  isLoading,
  text = '処理中...',
  children,
}: OverlayLoadingProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner size="lg" text={text} />
        </div>
      )}
    </div>
  );
}

export default LoadingSpinner;

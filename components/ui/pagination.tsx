'use client';

import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  className = ''
}: PaginationProps) {
  // Don't render if there's only one page or no pages
  if (totalPages <= 1) return null;

  // Calculate visible page numbers with progressive display
  const getVisiblePages = () => {
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-center ${className}`}
    >
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={isFirstPage || isLoading}
            className="bg-card border border-border rounded-xl hover:bg-muted hover:border-ring text-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm px-4 py-2"
          >
            <ChevronLeft size={16} className="mr-1" />
            Prev
          </Button>
          
          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            <AnimatePresence mode="wait">
              {visiblePages.map((pageNum) => (
                <motion.div
                  key={pageNum}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant={pageNum === currentPage ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    disabled={isLoading}
                    className={`w-10 h-10 rounded-xl transition-all duration-300 border font-navigation font-medium ${
                      pageNum === currentPage 
                        ? 'bg-primary-600 text-white shadow-lg border-primary-600 scale-105' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent hover:border-ring hover:scale-105'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {pageNum}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Next Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={isLastPage || isLoading}
            className="bg-card border border-border rounded-xl hover:bg-muted hover:border-ring text-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm px-4 py-2"
          >
            Next
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
        
        {/* Page Info */}
        <div className="text-center mt-3">
          <span className="text-xs font-caption text-muted-foreground bg-accent px-3 py-1 rounded-full">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Additional components for admin pages
export function PaginationContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center gap-2 ${className}`}>{children}</div>;
}

export function PaginationItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function PaginationLink({ 
  children, 
  onClick, 
  isActive = false, 
  disabled = false,
  className = '',
  href
}: { 
  children: React.ReactNode; 
  onClick?: (e: React.MouseEvent) => void; 
  isActive?: boolean; 
  disabled?: boolean;
  className?: string;
  href?: string;
}) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-10 rounded-xl transition-all duration-300 border font-navigation font-medium ${
        isActive 
          ? 'bg-primary-600 text-white shadow-lg border-primary-600 scale-105' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent hover:border-ring hover:scale-105'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </Button>
  );
}

export function PaginationPrevious({ 
  onClick, 
  disabled = false,
  className = '',
  href
}: { 
  onClick?: (e: React.MouseEvent) => void; 
  disabled?: boolean;
  className?: string;
  href?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`bg-card border border-border rounded-xl hover:bg-muted hover:border-ring text-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm px-4 py-2 ${className}`}
    >
      <ChevronLeft size={16} className="mr-1" />
      Prev
    </Button>
  );
}

export function PaginationNext({ 
  onClick, 
  disabled = false,
  className = '',
  href
}: { 
  onClick?: (e: React.MouseEvent) => void; 
  disabled?: boolean;
  className?: string;
  href?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`bg-card border border-border rounded-xl hover:bg-muted hover:border-ring text-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm px-4 py-2 ${className}`}
    >
      Next
      <ChevronRight size={16} className="ml-1" />
    </Button>
  );
}

// Pagination wrapper for admin pages that use children
export function PaginationWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-center ${className}`}
    >
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
        {children}
      </div>
    </motion.div>
  );
}

// Default export for backward compatibility
export default Pagination;
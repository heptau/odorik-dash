import { useState, useRef, useCallback, type ReactNode } from 'react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  pullDistance?: number;
}

export default function PullToRefresh({ children, onRefresh, pullDistance = 80 }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPullingRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (window.scrollY > 0) return;
    
    startY.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      setIsPulling(true);
      const progress = Math.min(diff / pullDistance, 1);
      setPullProgress(progress);
    }
  }, [isRefreshing, pullDistance]);

  const onTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    
    isPullingRef.current = false;
    setIsPulling(false);
    
    if (pullProgress >= 1 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullProgress(0);
      }
    } else {
      setPullProgress(0);
    }
  }, [pullProgress, isRefreshing, onRefresh]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ 
          height: isPulling || isRefreshing ? '60px' : '0px',
          opacity: isPulling || isRefreshing ? 1 : 0,
        }}
      >
        {isRefreshing ? (
          <div 
            className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
        ) : (
          <svg 
            className="w-6 h-6 transition-transform duration-200"
            style={{ 
              color: 'var(--accent)',
              transform: `rotate(${pullProgress * 180}deg)`,
            }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
      </div>
      
      {/* Content */}
      <div style={{ transform: isPulling ? `translateY(${pullProgress * 20}px)` : 'translateY(0)' }}>
        {children}
      </div>
    </div>
  );
}
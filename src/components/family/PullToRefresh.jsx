import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullingRef = useRef(false);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const PULL_THRESHOLD = 70;
  const MAX_PULL = 100;

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY <= 0 && !refreshing) {
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pullingRef.current || refreshing) return;
    const distance = e.touches[0].clientY - startYRef.current;
    if (distance > 0) {
      const clamped = Math.min(distance * 0.5, MAX_PULL);
      pullDistanceRef.current = clamped;
      setPullDistance(clamped);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await Promise.all([
          onRefreshRef.current(),
          new Promise((resolve) => setTimeout(resolve, 500)),
        ]);
      } finally {
        setRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <>
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        {refreshing ? (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        ) : pullDistance > 0 ? (
          <RefreshCw
            className="h-5 w-5 text-muted-foreground"
            style={{ transform: `rotate(${pullDistance * 3}deg)`, opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }}
          />
        ) : null}
      </div>
      {children}
    </>
  );
}
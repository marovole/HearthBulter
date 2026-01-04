'use client';

import { useRef, useEffect, useCallback } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export function useSwipe(options: SwipeOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefault = true,
  } = options;

  const touchStart = useRef<TouchPoint | null>(null);
  const touchEnd = useRef<TouchPoint | null>(null);

  const minSwipeDistance = threshold;

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (preventDefault) {
        e.preventDefault();
      }
      touchEnd.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
        time: Date.now(),
      };
    },
    [preventDefault],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current || !touchEnd.current) return;

      const startX = touchStart.current.x;
      const startY = touchStart.current.y;
      const endX = touchEnd.current.x;
      const endY = touchEnd.current.y;

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = Date.now() - touchStart.current.time;

      // 检查是否为有效的滑动（距离和时间）
      if (
        Math.abs(deltaX) < minSwipeDistance &&
        Math.abs(deltaY) < minSwipeDistance
      )
        return;
      if (deltaTime > 500) return; // 超过500ms不算滑动

      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontalSwipe) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    },
    [minSwipeDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown],
  );

  const addEventListeners = useCallback(
    (element: HTMLElement) => {
      element.addEventListener('touchstart', onTouchStart, {
        passive: !preventDefault,
      });
      element.addEventListener('touchmove', onTouchMove, {
        passive: !preventDefault,
      });
      element.addEventListener('touchend', onTouchEnd);
    },
    [onTouchStart, onTouchMove, onTouchEnd, preventDefault],
  );

  const removeEventListeners = useCallback(
    (element: HTMLElement) => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    },
    [onTouchStart, onTouchMove, onTouchEnd],
  );

  return {
    addEventListeners,
    removeEventListeners,
  };
}

interface LongPressOptions {
  onLongPress?: () => void;
  onClick?: () => void;
  threshold?: number;
}

export function useLongPress(options: LongPressOptions = {}) {
  const { onLongPress, onClick, threshold = 500 } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    isLongPress.current = false;

    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress?.();
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const click = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isLongPress.current) {
      onClick?.();
    }
  }, [onClick]);

  return {
    onMouseDown: start,
    onMouseUp: click,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: click,
  };
}

interface PinchZoomOptions {
  onPinchZoom?: (scale: number) => void;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
  minScale?: number;
  maxScale?: number;
}

export function usePinchZoom(options: PinchZoomOptions = {}) {
  const {
    onPinchZoom,
    onPinchStart,
    onPinchEnd,
    minScale = 0.5,
    maxScale = 3,
  } = options;

  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);

  const getDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance.current = getDistance(e.touches);
        initialScale.current = 1;
        onPinchStart?.();
      }
    },
    [onPinchStart],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance.current !== null) {
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialDistance.current;
        const clampedScale = Math.max(minScale, Math.min(maxScale, scale));
        onPinchZoom?.(clampedScale);
      }
    },
    [onPinchZoom, minScale, maxScale],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance.current = null;
        onPinchEnd?.();
      }
    },
    [onPinchEnd],
  );

  const addEventListeners = useCallback(
    (element: HTMLElement) => {
      element.addEventListener('touchstart', onTouchStart);
      element.addEventListener('touchmove', onTouchMove);
      element.addEventListener('touchend', onTouchEnd);
    },
    [onTouchStart, onTouchMove, onTouchEnd],
  );

  const removeEventListeners = useCallback(
    (element: HTMLElement) => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    },
    [onTouchStart, onTouchMove, onTouchEnd],
  );

  return {
    addEventListeners,
    removeEventListeners,
  };
}

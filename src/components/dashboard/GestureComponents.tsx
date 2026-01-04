"use client";

import React, { useRef, useEffect, useState } from "react";
import { useSwipe, useLongPress, usePinchZoom } from "@/lib/hooks/useGestures";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

interface GestureEnhancedCardProps {
  children: React.ReactNode;
  title?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  className?: string;
  showGestureHints?: boolean;
}

export function GestureEnhancedCard({
  children,
  title,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  className = "",
  showGestureHints = true,
}: GestureEnhancedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // 滑动手势
  const { addEventListeners: addSwipeListeners } = useSwipe({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold: 30,
  });

  // 长按手势
  const longPressHandlers = useLongPress({
    onLongPress,
    threshold: 500,
  });

  // 缩放手势
  const { addEventListeners: addPinchListeners } = usePinchZoom({
    onPinchZoom: (newScale) => {
      setScale(newScale);
    },
    onPinchStart: () => {
      setShowSwipeHint(false);
    },
    onPinchEnd: () => {
      // 缩放结束后恢复到正常大小
      setTimeout(() => setScale(1), 300);
    },
    minScale: 0.8,
    maxScale: 1.5,
  });

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    addSwipeListeners(element);
    addPinchListeners(element);

    // 显示手势提示
    if (showGestureHints) {
      const timer = setTimeout(() => setShowSwipeHint(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [addSwipeListeners, addPinchListeners, showGestureHints]);

  const resetScale = () => setScale(1);

  return (
    <div className={`relative ${className}`}>
      {/* 手势提示 */}
      {showGestureHints && showSwipeHint && (
        <div className="absolute -top-8 left-0 right-0 z-10 flex justify-center">
          <div className="bg-black bg-opacity-75 text-white text-xs px-3 py-1 rounded-full">
            {onSwipeLeft && onSwipeRight && "← 滑动切换 →"}
            {onSwipeUp && onSwipeDown && "↑ 滑动查看 ↓"}
            {onLongPress && "长按查看更多"}
          </div>
        </div>
      )}

      {/* 缩放控制 */}
      {scale !== 1 && (
        <div className="absolute -top-2 right-2 z-10 flex space-x-1">
          <button
            onClick={resetScale}
            className="bg-white rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
          >
            <Minimize2 className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* 主卡片 */}
      <div
        ref={cardRef}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-transform duration-300"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center",
        }}
        {...longPressHandlers}
      >
        {title && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          </div>
        )}

        <div className="p-4">{children}</div>

        {/* 滑动指示器 */}
        {(onSwipeLeft || onSwipeRight) && (
          <div className="absolute top-1/2 -translate-y-1/2 flex justify-between w-full px-2 pointer-events-none">
            {onSwipeLeft && (
              <div className="bg-white bg-opacity-80 rounded-full p-1 shadow-sm">
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </div>
            )}
            {onSwipeRight && (
              <div className="bg-white bg-opacity-80 rounded-full p-1 shadow-sm">
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface SwipeableCarouselProps {
  items: React.ReactNode[];
  onIndexChange?: (index: number) => void;
  className?: string;
}

export function SwipeableCarousel({
  items,
  onIndexChange,
  className = "",
}: SwipeableCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSwipeLeft = () => {
    const nextIndex = (currentIndex + 1) % items.length;
    setCurrentIndex(nextIndex);
    onIndexChange?.(nextIndex);
  };

  const handleSwipeRight = () => {
    const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    onIndexChange?.(prevIndex);
  };

  const { addEventListeners } = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    addEventListeners(element);
  }, [addEventListeners]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* 指示器 */}
      <div className="flex justify-center space-x-2 mt-4">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              onIndexChange?.(index);
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? "bg-blue-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      {/* 导航按钮 */}
      {items.length > 1 && (
        <>
          <button
            onClick={handleSwipeRight}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={handleSwipeLeft}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </>
      )}
    </div>
  );
}

// 移动端数据录入手势组件
interface GestureInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  placeholder?: string;
  type?: "text" | "number";
}

export function GestureInput({
  label,
  value,
  onChange,
  onSwipeUp,
  onSwipeDown,
  placeholder = "",
  type = "text",
}: GestureInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { addEventListeners } = useSwipe({
    onSwipeUp,
    onSwipeDown,
    threshold: 30,
  });

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    addEventListeners(element.parentElement!);
  }, [addEventListeners]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {(onSwipeUp || onSwipeDown) && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          <div className="text-xs">↑↓</div>
        </div>
      )}
    </div>
  );
}

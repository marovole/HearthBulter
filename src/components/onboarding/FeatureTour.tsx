"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Target,
  MousePointer,
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  content: string;
  selector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: string;
}

interface FeatureTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStart?: () => void;
}

export function FeatureTour({
  steps,
  isOpen,
  onComplete,
  onSkip,
  onStart,
}: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] =
    useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tourRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && steps[currentStep]?.selector) {
      highlightElement(steps[currentStep].selector);
    } else {
      removeHighlight();
    }
  }, [isOpen, currentStep, steps]);

  const highlightElement = (selector: string) => {
    removeHighlight();

    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      element.style.position = "relative";
      element.style.zIndex = "9999";

      // Create overlay
      const overlay = document.createElement("div");
      overlay.className = "feature-tour-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        pointer-events: none;
      `;
      document.body.appendChild(overlay);

      // Position tooltip
      const rect = element.getBoundingClientRect();
      const tooltipWidth = 350;
      const tooltipHeight = 200;

      let top = rect.bottom + 10;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // Adjust position if tooltip goes off screen
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 10;
      }

      if (left < 10) {
        left = 10;
      } else if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }

      setTooltipPosition({ top, left });

      // Scroll element into view
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const removeHighlight = () => {
    if (highlightedElement) {
      highlightedElement.style.zIndex = "";
      setHighlightedElement(null);
    }

    const overlay = document.querySelector(".feature-tour-overlay");
    if (overlay) {
      overlay.remove();
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    removeHighlight();
    onComplete();
  };

  const handleSkip = () => {
    removeHighlight();
    onSkip();
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <div
        ref={tourRef}
        className="fixed z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <Badge variant="outline" className="text-xs">
                  {currentStep + 1} / {steps.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">
                {currentStepData.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {currentStepData.content}
              </p>

              {currentStepData.action && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <MousePointer className="h-4 w-4" />
                    <span className="text-sm font-medium">操作提示</span>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    {currentStepData.action}
                  </p>
                </div>
              )}

              {/* Step indicators */}
              <div className="flex space-x-1 mb-4">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToStep(index)}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index === currentStep
                        ? "bg-blue-600"
                        : index < currentStep
                          ? "bg-green-500"
                          : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一步
                </Button>

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentStep === steps.length - 1 ? "完成" : "下一步"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Hook for managing feature tours
export function useFeatureTour() {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTour, setCurrentTour] = useState<string | null>(null);

  const startTour = (tourId: string) => {
    setCurrentTour(tourId);
    setIsTourActive(true);
  };

  const endTour = () => {
    setIsTourActive(false);
    setCurrentTour(null);
  };

  const skipTour = () => {
    setIsTourActive(false);
    setCurrentTour(null);
  };

  return {
    isTourActive,
    currentTour,
    startTour,
    endTour,
    skipTour,
  };
}

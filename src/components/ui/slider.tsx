"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, onValueChange, ...props }, ref) => {
    const resolvedValue = value?.[0];
    const resolvedDefault = defaultValue?.[0];

    return (
      <input
        type="range"
        ref={ref}
        className={cn("w-full", className)}
        value={resolvedValue}
        defaultValue={resolvedValue === undefined ? resolvedDefault : undefined}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          onValueChange?.([nextValue]);
        }}
        {...props}
      />
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

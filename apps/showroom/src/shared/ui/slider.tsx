"use client";

import { Slider as RadixSlider } from "radix-ui";

export interface SliderProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  "aria-label"?: string;
}

export function Slider({ id, value, min, max, step = 1, onValueChange, ...aria }: SliderProps) {
  return (
    <RadixSlider.Root
      id={id}
      className="relative flex h-5 w-full touch-none select-none items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => v !== undefined && onValueChange(v)}
    >
      <RadixSlider.Track className="relative h-1 grow rounded-full bg-line">
        <RadixSlider.Range className="absolute h-full rounded-full bg-brand" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={aria["aria-label"]}
        className="block size-4 rounded-full border-2 border-brand bg-white shadow focus-visible:outline-2 focus-visible:outline-brand"
      />
    </RadixSlider.Root>
  );
}

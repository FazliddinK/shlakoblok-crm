"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SelectOption = {
  value: string;
  label: string;
};

type LabeledSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

export function LabeledSelect({
  value,
  onValueChange,
  options,
  placeholder = "Выберите...",
  triggerClassName,
  disabled,
}: LabeledSelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={(next) => next && onValueChange(next)} disabled={disabled}>
      <SelectTrigger className={triggerClassName ?? "w-full"}>
        <SelectValue placeholder={placeholder}>
          {selected?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getOptionLabel(options: SelectOption[], value: string, fallback = value) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ options, value, onChange, placeholder = "Select...", className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const displayValue = value.length === 0 
    ? placeholder 
    : value.length === 1 
      ? options.find(o => o.value === value[0])?.label 
      : `${value.length} selected`;

  return (
    <div className={cn("relative min-w-[150px]", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full input flex items-center justify-between text-sm h-[38px] bg-white"
      >
        <span className="truncate mr-2 text-slate-700">{displayValue}</span>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 w-full min-w-[200px] mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className="flex items-center px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
            >
              <div className={cn(
                "w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors flex-shrink-0",
                value.includes(opt.value) ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
              )}>
                {value.includes(opt.value) && <Check size={12} className="text-white" />}
              </div>
              <span className="truncate">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

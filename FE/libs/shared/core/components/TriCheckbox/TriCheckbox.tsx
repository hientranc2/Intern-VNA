"use client";

import { useEffect, useRef } from "react";

type TriCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
};

export function TriCheckbox({ checked, indeterminate = false, onChange, className, disabled = false, title }: TriCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      title={title}
      onChange={(e) => onChange(e.target.checked)}
      className={className ?? "h-[15px] w-[15px] cursor-pointer accent-primary disabled:cursor-not-allowed"}
    />
  );
}

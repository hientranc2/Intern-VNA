"use client";

type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  ariaLabel?: string;
};

export function Switch({ checked, onChange, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-[38px] rounded-full transition-colors ${checked ? "bg-primary" : "bg-[#d1d5db]"}`}
    >
      <span
        className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[21px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

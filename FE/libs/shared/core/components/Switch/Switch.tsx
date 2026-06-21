"use client";

import MuiSwitch from "@mui/material/Switch";

type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
};

export function Switch({ checked, onChange, ariaLabel, disabled }: SwitchProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : undefined,
        pointerEvents: disabled ? "none" : undefined,
        flexShrink: 0,
      }}
    >
      <MuiSwitch
        checked={checked}
        disabled={disabled}
        onChange={(_, val) => onChange(val)}
        slotProps={{ input: { "aria-label": ariaLabel } }}
      />
    </span>
  );
}

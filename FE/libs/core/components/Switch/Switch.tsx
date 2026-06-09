"use client";

import MuiSwitch from "@mui/material/Switch";

type SwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  ariaLabel?: string;
};

export function Switch({ checked, onChange, ariaLabel }: SwitchProps) {
  return (
    <MuiSwitch
      checked={checked}
      onChange={(_, val) => onChange(val)}
      slotProps={{ input: { "aria-label": ariaLabel } }}
      sx={{
        width: 44,
        height: 24,
        padding: 0,
        "& .MuiSwitch-switchBase": {
          padding: 0,
          margin: "2px",
          transitionDuration: "200ms",
          "&.Mui-checked": {
            transform: "translateX(20px)",
            "& + .MuiSwitch-track": {
              backgroundColor: "#bfdbfe",
              opacity: 1,
            },
            "& .MuiSwitch-thumb": {
              backgroundColor: "#1d4ed8",
            },
          },
        },
        "& .MuiSwitch-thumb": {
          width: 20,
          height: 20,
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        },
        "& .MuiSwitch-track": {
          borderRadius: 12,
          backgroundColor: "#d1d5db",
          opacity: 1,
        },
      }}
    />
  );
}

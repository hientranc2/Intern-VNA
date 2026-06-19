"use client";

import { useState } from "react";
import {
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  FormHelperText,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

interface PasswordFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  errorText?: string;
  helperText?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordField({
  id = "password",
  label = "Mật khẩu",
  value,
  onChange,
  hasError,
  errorText,
  helperText,
  placeholder,
  autoComplete,
  required,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const helper = errorText || helperText;

  return (
    <FormControl fullWidth size="small" error={hasError} required={required}>
      <InputLabel htmlFor={`${id}-input`}>{label}</InputLabel>
      <OutlinedInput
        id={`${id}-input`}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              onClick={() => setShowPassword((s) => !s)}
              onMouseDown={(e) => e.preventDefault()}
              edge="end"
              size="small"
            >
              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        }
        label={label}
      />
      {helper && <FormHelperText>{helper}</FormHelperText>}
    </FormControl>
  );
}
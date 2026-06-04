type GovSealProps = {
  size?: number;
  className?: string;
};

export function GovSeal({ size = 72, className }: GovSealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quốc huy Việt Nam"
      role="img"
    >
      <circle cx="50" cy="50" r="48" fill="#c0392b" stroke="#f39c12" strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="#c0392b" stroke="#f1c40f" strokeWidth="1.5" />
      <polygon
        points="50,18 54,34 70,34 58,44 62,60 50,50 38,60 42,44 30,34 46,34"
        fill="#f1c40f"
      />
      <path d="M32 85 Q50 92 68 85 Q60 88 50 89 Q40 88 32 85Z" fill="#f1c40f" />
    </svg>
  );
}

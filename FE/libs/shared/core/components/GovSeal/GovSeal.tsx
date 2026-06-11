import Image from "next/image";

type GovSealProps = {
  size?: number;
  className?: string;
};

export function GovSeal({ size = 72, className }: GovSealProps) {
  return (
    <Image
      src="/Emblem_of_Vietnam.svg"
      alt="Quốc huy Việt Nam"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

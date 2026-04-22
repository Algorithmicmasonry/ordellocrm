interface OrdelloLogoProps {
  size?: number;
}

export function OrdelloLogo({ size = 40 }: OrdelloLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="80" height="80" rx="18" fill="#0D1F3C" />
      <circle cx="40" cy="40" r="22" stroke="white" strokeWidth="2" fill="none" opacity="0.25" />
      <circle cx="40" cy="40" r="16" stroke="white" strokeWidth="2.5" fill="none" opacity="0.6" />
      <circle cx="40" cy="40" r="10" stroke="white" strokeWidth="3" fill="none" />
      <circle cx="40" cy="40" r="4" fill="white" />
    </svg>
  );
}

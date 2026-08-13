type LogoProps = {
  className?: string;
};

export function Logo({ className = "h-10 w-10" }: LogoProps) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-card ${className}`}>
      <svg 
        width="56%" 
        height="56%" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 17l4-10 4 7 5-9 5 12" />
      </svg>
    </div>
  );
}

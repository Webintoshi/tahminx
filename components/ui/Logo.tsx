interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: "text-lg" },
    md: { icon: 32, text: "text-xl" },
    lg: { icon: 40, text: "text-2xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <div 
        className="flex items-center justify-center rounded-xl bg-[#7A84FF]"
        style={{ width: icon, height: icon }}
      >
        <svg 
          width={icon * 0.5} 
          height={icon * 0.5} 
          viewBox="0 0 24 24" 
          fill="none"
        >
          {/* B harfi stilize */}
          <path 
            d="M6 4h8c2.5 0 4 1.5 4 3.5S16.5 11 14 11H6V4z" 
            stroke="black" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M6 11h9c2.5 0 4 1.5 4 3.5S17.5 18 15 18H6V11z" 
            stroke="black" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M6 4v14" 
            stroke="black" 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      {/* Text */}
      <span 
        className={`font-bold tracking-tight text-[#ECEDEF] ${text}`}
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        betify
      </span>
    </div>
  );
}

import React from 'react';

interface RichieRichLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export const RichieRichLogo: React.FC<RichieRichLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  variant = 'dark',
}) => {
  const dimensionMap = {
    sm: { box: 'w-8 h-8', iconSize: 32 },
    md: { box: 'w-11 h-11', iconSize: 44 },
    lg: { box: 'w-16 h-16', iconSize: 64 },
    xl: { box: 'w-24 h-24', iconSize: 96 },
  };

  const currentDim = dimensionMap[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Luxury 3D Gold Crown & RR Crest Emblem (Transparent Background) */}
      <div
        className={`${currentDim.box} shrink-0 relative flex items-center justify-center bg-transparent`}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Rich Metallic 3D Gold Gradients */}
            <linearGradient id="rrGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF1B8" />
              <stop offset="25%" stopColor="#DFAD36" />
              <stop offset="50%" stopColor="#FFF8D6" />
              <stop offset="75%" stopColor="#B37D14" />
              <stop offset="100%" stopColor="#E5B842" />
            </linearGradient>

            <linearGradient id="rrCrownBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF4BE" />
              <stop offset="30%" stopColor="#E2AE35" />
              <stop offset="70%" stopColor="#A36F0F" />
              <stop offset="100%" stopColor="#6C4703" />
            </linearGradient>

            <radialGradient id="rrSphereGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#FFF0B3" />
              <stop offset="60%" stopColor="#D99F26" />
              <stop offset="90%" stopColor="#8C5B05" />
              <stop offset="100%" stopColor="#4A2F02" />
            </radialGradient>

            <linearGradient id="rrRimGrad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#7E560E" />
              <stop offset="20%" stopColor="#F9E28C" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="80%" stopColor="#DFAD36" />
              <stop offset="100%" stopColor="#7E560E" />
            </linearGradient>
          </defs>

          {/* ======================================================== */}
          {/* ROYAL GOLDEN CROWN (Top Component) */}
          {/* ======================================================== */}
          <g transform="translate(0, 4)">
            {/* Crown Base Arch / Rim */}
            <ellipse cx="60" cy="46" rx="30" ry="7" fill="url(#rrRimGrad)" stroke="#4A3103" strokeWidth="1" />
            <ellipse cx="60" cy="45" rx="27" ry="5" fill="#3D2602" opacity="0.6" />

            {/* Crown Solid Body & Peaks */}
            <path
              d="M32 44 
                 C 31 32, 23 20, 24 18 
                 C 25 18, 38 31, 44 22 
                 C 48 16, 58 8, 60 7 
                 C 62 8, 72 16, 76 22 
                 C 82 31, 95 18, 96 18 
                 C 97 20, 89 32, 88 44 
                 C 82 48, 38 48, 32 44 Z"
              fill="url(#rrCrownBody)"
              stroke="url(#rrGoldGrad)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {/* Crown Inner Velvet Arch highlight */}
            <path
              d="M38 44 C 42 30, 78 30, 82 44 C 75 41, 45 41, 38 44 Z"
              fill="#D49B22"
              opacity="0.5"
            />

            {/* Crown Front Center Arch Rib */}
            <path
              d="M59 8 Q 60 28 60 45"
              stroke="url(#rrGoldGrad)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M44 22 Q 50 35 48 45"
              stroke="url(#rrGoldGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M76 22 Q 70 35 72 45"
              stroke="url(#rrGoldGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* Crown Peak Golden Spheres / Pearls */}
            {/* Center Top Pearl */}
            <circle cx="60" cy="7" r="4.5" fill="url(#rrSphereGrad)" stroke="#6A4604" strokeWidth="0.8" />
            {/* Left Main Peak Pearl */}
            <circle cx="24" cy="18" r="3.8" fill="url(#rrSphereGrad)" stroke="#6A4604" strokeWidth="0.8" />
            {/* Right Main Peak Pearl */}
            <circle cx="96" cy="18" r="3.8" fill="url(#rrSphereGrad)" stroke="#6A4604" strokeWidth="0.8" />
            {/* Left Mid Pearl */}
            <circle cx="44" cy="22" r="3.2" fill="url(#rrSphereGrad)" stroke="#6A4604" strokeWidth="0.8" />
            {/* Right Mid Pearl */}
            <circle cx="76" cy="22" r="3.2" fill="url(#rrSphereGrad)" stroke="#6A4604" strokeWidth="0.8" />

            {/* Crown Base Jewels / Studs */}
            <circle cx="60" cy="46" r="2.2" fill="url(#rrSphereGrad)" />
            <circle cx="45" cy="45" r="1.8" fill="url(#rrSphereGrad)" />
            <circle cx="75" cy="45" r="1.8" fill="url(#rrSphereGrad)" />
            <circle cx="34" cy="43" r="1.4" fill="url(#rrSphereGrad)" />
            <circle cx="86" cy="43" r="1.4" fill="url(#rrSphereGrad)" />
          </g>

          {/* ======================================================== */}
          {/* INTERTWINED "RR" MONOGRAM CIPHER (Bottom Component) */}
          {/* ======================================================== */}
          <g id="rrMonogram" transform="translate(0, 5)">
            {/* Center Vertical Split Stem (Central Column of RR) */}
            {/* Left mirrored stem */}
            <path
              d="M55 52 L59 52 L58 96 C56 97 53 97 51 96 L55 52 Z"
              fill="url(#rrGoldGrad)"
              stroke="#593902"
              strokeWidth="0.6"
            />
            {/* Right stem */}
            <path
              d="M65 52 L61 52 L62 96 C64 97 67 97 69 96 L65 52 Z"
              fill="url(#rrGoldGrad)"
              stroke="#593902"
              strokeWidth="0.6"
            />

            {/* Center Arch Peak above stems */}
            <path
              d="M55 53 C57 48 63 48 65 53"
              stroke="url(#rrGoldGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* LEFT MIRRORED "R" LOOP */}
            <path
              d="M56 54 
                 C 48 49, 34 50, 34 62 
                 C 34 74, 48 74, 57 74"
              fill="none"
              stroke="url(#rrGoldGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Left R Inner Shading Loop */}
            <path
              d="M55 57 
                 C 49 53, 38 54, 38 62 
                 C 38 70, 49 71, 57 71"
              fill="none"
              stroke="#8A5A07"
              strokeWidth="0.8"
            />

            {/* RIGHT "R" LOOP */}
            <path
              d="M64 54 
                 C 72 49, 86 50, 86 62 
                 C 86 74, 72 74, 63 74"
              fill="none"
              stroke="url(#rrGoldGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Right R Inner Shading Loop */}
            <path
              d="M65 57 
                 C 71 53, 82 54, 82 62 
                 C 82 70, 71 71, 63 71"
              fill="none"
              stroke="#8A5A07"
              strokeWidth="0.8"
            />

            {/* LEFT MIRRORED SWEEPING LEG WITH TERMINAL BALL */}
            <path
              d="M55 74 
                 C 47 75, 41 85, 34 94 
                 C 28 100, 20 99, 21 93"
              fill="none"
              stroke="url(#rrGoldGrad)"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            {/* Left Terminal Golden Ball */}
            <circle cx="21" cy="91" r="7.5" fill="url(#rrSphereGrad)" stroke="#5A3903" strokeWidth="1" />

            {/* RIGHT SWEEPING LEG WITH TERMINAL BALL */}
            <path
              d="M65 74 
                 C 73 75, 79 85, 86 94 
                 C 92 100, 100 99, 99 93"
              fill="none"
              stroke="url(#rrGoldGrad)"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            {/* Right Terminal Golden Ball */}
            <circle cx="99" cy="91" r="7.5" fill="url(#rrSphereGrad)" stroke="#5A3903" strokeWidth="1" />

            {/* Monogram Fine Filigree flourishes in middle */}
            <path
              d="M53 68 C 50 67, 45 74, 52 78"
              fill="none"
              stroke="url(#rrGoldGrad)"
              strokeWidth="1.2"
              opacity="0.85"
            />
            <path
              d="M67 68 C 70 67, 75 74, 68 78"
              fill="none"
              stroke="url(#rrGoldGrad)"
              strokeWidth="1.2"
              opacity="0.85"
            />
          </g>
        </svg>
      </div>

      {/* Optional Rich Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1
              className={`font-black uppercase tracking-wider text-base sm:text-lg ${
                variant === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              RICHIE RICH
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-400 uppercase tracking-wider">
              PAN HOUSE
            </span>
          </div>
          <p className="text-[11px] text-amber-300/90 font-medium tracking-tight whitespace-nowrap">
            Pan | Coffee | Essentials | 24x7
          </p>
        </div>
      )}
    </div>
  );
};

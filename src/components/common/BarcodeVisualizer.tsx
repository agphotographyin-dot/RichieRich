import React from 'react';

interface BarcodeVisualizerProps {
  value: string;
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
  fontSize?: number;
}

export const BarcodeVisualizer: React.FC<BarcodeVisualizerProps> = ({
  value,
  className = '',
  width = 140,
  height = 36,
  showText = true,
  fontSize,
}) => {
  // Generate deterministic bar widths from value string
  const bars: number[] = [];
  const str = value || '890100101';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  // Guard stripes at start
  bars.push(1, 0, 1);

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const pattern = (code + i * 7 + Math.abs(hash)) % 16;
    for (let bit = 3; bit >= 0; bit--) {
      bars.push((pattern >> bit) & 1);
    }
    bars.push(0); // spacing
  }

  // Guard stripes at end
  bars.push(1, 0, 1);

  const barWidth = Math.max(1.2, width / bars.length);

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-white p-1 rounded-xs"
      >
        {bars.map((isBlack, index) => {
          if (!isBlack) return null;
          return (
            <rect
              key={index}
              x={index * barWidth}
              y={0}
              width={barWidth}
              height={height}
              fill="#111827"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-widest text-slate-400 mt-0.5 font-bold">
          {str}
        </span>
      )}
    </div>
  );
};

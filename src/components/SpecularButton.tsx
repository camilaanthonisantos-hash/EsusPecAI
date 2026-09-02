import React, { useState, useRef } from 'react';

interface SpecularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  shineSize?: number;
  thickness?: number;
  speed?: number;
  autoAnimate?: boolean;
  radius?: number;
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'none';
}

export const SpecularButton: React.FC<SpecularButtonProps> = ({
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
  title,
  tint = 'rgba(255, 255, 255, 0.08)',
  lineColor = 'rgba(20, 184, 166, 0.7)',
  baseColor = 'rgba(15, 23, 42, 0.1)',
  intensity = 1.3,
  thickness = 2,
  radius = 12,
  size = 'none',
  autoAnimate = false,
  ...props
}) => {
  const divRef = useRef<HTMLButtonElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'p-2 text-sm',
    none: '',
  };

  return (
    <button
      ref={divRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      style={{
        borderRadius: radius ? `${radius}px` : undefined,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        ...props.style,
      }}
      className={`relative overflow-hidden transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer group ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {/* Specular Mouse-Following Light Effect */}
      {isHovered && (
        <div
          className="absolute pointer-events-none transition-opacity duration-300 z-0"
          style={{
            top: mousePosition.y - 75,
            left: mousePosition.x - 75,
            width: '150px',
            height: '150px',
            background: `radial-gradient(circle, ${lineColor} 0%, transparent 70%)`,
            opacity: intensity,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Auto-animate or shimmer rim light */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-teal-500/15 to-transparent pointer-events-none z-0" />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
        {children}
      </span>
    </button>
  );
};

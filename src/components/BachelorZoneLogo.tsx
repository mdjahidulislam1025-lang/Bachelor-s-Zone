import React from 'react';
import { Home, Utensils, Sparkles, Building } from 'lucide-react';

interface BachelorZoneLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  theme?: 'dark' | 'light' | 'white';
}

export const BachelorZoneLogo: React.FC<BachelorZoneLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
  theme = 'dark',
}) => {
  const iconSizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  const mainIconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const badgeIconSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-xl font-extrabold',
    xl: 'text-2xl sm:text-3xl font-extrabold',
  };

  const isWhite = theme === 'white';

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Brand Icon combining Mess Home + Meals + Management */}
      <div
        className={`relative shrink-0 flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-md shadow-emerald-700/20 border border-emerald-500/30 ${iconSizeClasses[size]}`}
      >
        <Home className={`${mainIconSizes[size]} text-white`} />
        {/* Utensils / Food accent badge */}
        <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full p-0.5 sm:p-1 shadow-xs border border-white dark:border-slate-900 flex items-center justify-center">
          <Utensils className={badgeIconSizes[size]} />
        </div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`tracking-tight ${
                isWhite ? 'text-white' : 'text-slate-900 dark:text-white'
              } ${titleSizes[size]}`}
            >
              Bachelor <span className="text-emerald-600 dark:text-emerald-400">Zone</span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 hidden sm:inline-block animate-pulse" />
          </div>
          {subtitle !== undefined ? (
            <span
              className={`text-[11px] sm:text-xs truncate ${
                isWhite ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {subtitle}
            </span>
          ) : (
            <span
              className={`text-[10px] sm:text-[11px] font-medium tracking-wide ${
                isWhite ? 'text-emerald-100/90' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Mess Management System
            </span>
          )}
        </div>
      )}
    </div>
  );
};

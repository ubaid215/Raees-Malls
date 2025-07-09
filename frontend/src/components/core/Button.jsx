import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  // Variant styles
  const variantStyles = {
    primary: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    outline: 'border border-red-300 hover:bg-red-50 text-gray-700 focus:ring-red-500',
    ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-red-500',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
  };

  // Responsive size styles - mobile first approach
  const sizeStyles = {
    small: 'px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm',
    medium: 'px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base',
    large: 'px-4 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg',
  };

  // Responsive icon sizes
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'h-3 w-3 sm:h-4 sm:w-4';
      case 'medium':
        return 'h-4 w-4 sm:h-5 sm:w-5';
      case 'large':
        return 'h-5 w-5 sm:h-6 sm:w-6';
      default:
        return 'h-4 w-4 sm:h-5 sm:w-5';
    }
  };

  return (
    <>
      <style>{`
        @keyframes vibrate {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(2px, 1px) rotate(0.5deg); }
          40% { transform: translate(-1px, -1px) rotate(-0.5deg); }
          60% { transform: translate(1px, -1px) rotate(0.5deg); }
          80% { transform: translate(-1px, 1px) rotate(-0.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .vibrate-on-hover:hover {
          animation: vibrate 0.4s ease-in-out;
        }
        @media (max-width: 640px) {
          .vibrate-on-hover:hover {
            animation: vibrate 0.3s ease-in-out;
          }
        }
      `}</style>
      <button
        className={`
          rounded-md font-medium transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-70 disabled:cursor-not-allowed
          flex items-center justify-center gap-1.5 sm:gap-2
          active:scale-95 transform transition-transform
          ${fullWidth ? 'w-full' : 'w-auto'}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          vibrate-on-hover
          min-h-[32px] sm:min-h-[36px]
          touch-manipulation
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={`animate-spin ${getIconSize()}`} />
            <span className="truncate">Loading...</span>
          </>
        ) : (
          <>
            {Icon && <Icon className={getIconSize()} />}
            <span className="truncate">{children}</span>
          </>
        )}
      </button>
    </>
  );
};

export default Button;
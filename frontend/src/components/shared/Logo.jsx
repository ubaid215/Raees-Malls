import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const Logo = ({ 
  variant = 'default', 
  size = 'md', 
  className = '', 
  withText = true,
  isLink = true,
  onClick = null
}) => {
  // Size variants
  const sizeClasses = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    xl: 'h-14'
  };

  // Color variants
  const variants = {
    default: {
      primary: 'text-red-600',
      secondary: 'text-gray-50'
    },
    light: {
      primary: 'text-red-400',
      secondary: 'text-gray-200'
    },
    dark: {
      primary: 'text-red-800',
      secondary: 'text-gray-900'
    },
    mono: {
      primary: 'text-gray-800',
      secondary: 'text-gray-600'
    }
  };

  // Logo content
  const logoContent = (
    <div 
      className={`flex items-center ${className}`}
      onClick={onClick}
    >
      {/* Icon/Symbol part */}
      <div className={`${sizeClasses[size]} w-auto flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <path
            d="M50 0L100 50L50 100L0 50L50 0Z"
            className={`fill-current ${variants[variant].primary}`}
          />
          <path
            d="M30 30L70 30L70 70L30 70L30 30Z"
            className={`fill-current ${variants[variant].secondary}`}
          />
        </svg>
      </div>
      
      {/* Text part */}
      {withText && (
        <div className="ml-2">
          <span className={`block font-bold ${variants[variant].primary} ${size === 'xl' ? 'text-2xl' : 'text-lg'}`}>
            Raees
          </span>
          <span className={`block font-medium ${variants[variant].primary} ${size === 'xl' ? 'text-xl' : 'text-base'}`}>
            Malls
          </span>
        </div>
      )}
    </div>
  );

  return isLink ? (
    <Link to="/" className="inline-block focus:outline-none focus:ring-2 focus:ring-red-500 rounded">
      {logoContent}
    </Link>
  ) : (
    <div className="inline-block">
      {logoContent}
    </div>
  );
};

Logo.propTypes = {
  variant: PropTypes.oneOf(['default', 'light', 'dark', 'mono']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
  withText: PropTypes.bool,
  isLink: PropTypes.bool,
  onClick: PropTypes.func
};

export default Logo;
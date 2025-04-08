import React from 'react';

const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  className = '',
  withText = false,
  text = 'Loading...',
  textPosition = 'bottom',
  fullScreen = false
}) => {
  const sizeClasses = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-10 w-10 border-4',
    xl: 'h-12 w-12 border-4'
  };

  const colorClasses = {
    primary: 'border-t-red-600 border-r-red-600 border-b-red-100 border-l-red-100',
    white: 'border-t-white border-r-white border-b-gray-200 border-l-gray-200',
    gray: 'border-t-gray-500 border-r-gray-500 border-b-gray-200 border-l-gray-200',
    dark: 'border-t-gray-800 border-r-gray-800 border-b-gray-300 border-l-gray-300'
  };

  const textPositionClasses = {
    right: 'flex-row items-center space-x-3',
    left: 'flex-row-reverse items-center space-x-reverse space-x-3',
    top: 'flex-col-reverse items-center space-y-reverse space-y-2',
    bottom: 'flex-col items-center space-y-2'
  };

  const spinner = (
    <div
      className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );

  if (!withText) {
    return fullScreen ? (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        {spinner}
      </div>
    ) : (
      spinner
    );
  }

  return (
    <div className={`flex ${textPositionClasses[textPosition]}`}>
      {spinner}
      <span className={`text-${color === 'white' ? 'white' : 'gray-700'}`}>{text}</span>
    </div>
  );
};

export default LoadingSpinner;
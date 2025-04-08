import React from 'react';

const LoadingSkeleton = ({
  type = 'rectangle',
  width = '100%',
  height = '1rem',
  count = 1,
  circle = false,
  className = '',
  containerClassName = '',
  inline = false,
  animation = 'pulse',
  ...props
}) => {
  // Validate count
  const validCount = Math.max(1, Math.min(count, 10));
  
  // Generate skeleton elements
  const skeletons = Array.from({ length: validCount }).map((_, index) => {
    const baseClasses = `bg-gray-200 rounded ${animation === 'pulse' ? 'animate-pulse' : 'animate-shimmer'} ${className}`;
    
    const style = {
      width,
      height: circle ? width : height,
      borderRadius: circle ? '50%' : undefined,
      marginBottom: index !== validCount - 1 ? '0.5rem' : undefined,
    };

    switch (type) {
      case 'text':
        return (
          <div
            key={index}
            className={`${baseClasses}`}
            style={style}
            {...props}
          />
        );
      case 'image':
        return (
          <div
            key={index}
            className={`${baseClasses} aspect-square`}
            style={{ width, height: 'auto' }}
            {...props}
          />
        );
      case 'card':
        return (
          <div
            key={index}
            className={`${baseClasses} p-4`}
            style={{ width, height }}
            {...props}
          >
            <div className="bg-gray-300 h-32 mb-3 rounded"></div>
            <div className="bg-gray-200 h-4 w-3/4 mb-2 rounded"></div>
            <div className="bg-gray-200 h-4 w-1/2 rounded"></div>
          </div>
        );
      default:
        return (
          <div
            key={index}
            className={baseClasses}
            style={style}
            {...props}
          />
        );
    }
  });

  return (
    <div
      className={inline ? 'inline-flex space-x-2' : containerClassName}
      aria-live="polite"
      aria-busy="true"
    >
      {skeletons}
    </div>
  );
};

export default LoadingSkeleton;
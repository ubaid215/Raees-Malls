import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiImage } from 'react-icons/fi';

const ImagePreview = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/placeholder-image.png',
  loadingComponent = (
    <div className="flex items-center justify-center bg-gray-100 text-gray-400">
      <FiImage className="animate-pulse h-8 w-8" />
    </div>
  ),
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const imageSrc = hasError ? fallbackSrc : src;

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          {loadingComponent}
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        {...props}
      />
    </div>
  );
};

ImagePreview.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  fallbackSrc: PropTypes.string,
  loadingComponent: PropTypes.node,
};

export default ImagePreview;
import React from 'react';
import Button from './Button'; 

const Card = ({
  children,
  title,
  description,
  image,
  imageAlt = '',
  actionText,
  onAction,
  variant = 'default',
  className = '',
  imageClassName = '',
  contentClassName = '',
  overlay = false,
  ...props
}) => {

  //  ----------- Variant styles -----------
  const variantStyles = {
    default: 'border border-gray-200 hover:shadow-md',
    elevated: 'shadow-sm hover:shadow-lg',
    flat: 'border-0',
    outline: 'border border-gray-300',
  };

  //  --------- Image position variants ------------
  // eslint-disable-next-line no-unused-vars
  const imageLayout = {
    top: 'flex-col',
    left: 'flex-row',
    right: 'flex-row-reverse',
  };

  return (
    <div
      className={`
        rounded-lg overflow-hidden
        bg-white transition-all duration-200
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
        
      {/************ Image section **********/}
      {image && (
        <div className={`relative ${imageClassName}`}>
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-auto object-cover"
          />
          {overlay && (
            <div className="absolute inset-0 bg-black bg-opacity-20" />
          )}
        </div>
      )}

      {/************ Content section ************/}
      <div className={`p-4 ${contentClassName}`}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-gray-600 mb-4">{description}</p>
        )}
        {children}

        {actionText && (
          <div className="mt-4">
            <Button
              variant="primary"
              size="small"
              onClick={onAction}
            >
              {actionText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
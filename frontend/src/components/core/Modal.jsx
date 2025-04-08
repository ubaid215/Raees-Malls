/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  actionButton,
  secondaryActionButton,
  size = 'md',
  disableClickOutside = false,
  isLoading = false,
  loadingText = 'Processing...',
  className = '',
}) => {
  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 500 }
    },
    exit: { opacity: 0, y: 20 }
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full w-full mx-4',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay with animation */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={!disableClickOutside && !isLoading ? onClose : undefined}
          />

          {/* Modal Container with animation */}
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalVariants}
              className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl w-full ${sizeClasses[size]} ${className}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
            >
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-3"></div>
                    <p className="text-gray-700">{loadingText}</p>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex justify-between items-start p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {title}
                </h3>
                {!isLoading && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                    aria-label="Close"
                    disabled={isLoading}
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-4 relative">
                {children}
              </div>

              {/* Footer (if actions provided) */}
              {(actionButton || secondaryActionButton) && (
                <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 border-t border-gray-200">
                  {secondaryActionButton && (
                    <Button
                      variant="outline"
                      onClick={secondaryActionButton.onClick}
                      disabled={secondaryActionButton.disabled || isLoading}
                    >
                      {secondaryActionButton.text}
                    </Button>
                  )}
                  {actionButton && (
                    <Button
                      variant="primary"
                      onClick={actionButton.onClick}
                      disabled={actionButton.disabled || isLoading}
                      isLoading={isLoading}
                    >
                      {actionButton.text}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
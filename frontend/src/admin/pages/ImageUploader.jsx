import React, { useCallback, useState, useRef, useEffect } from 'react';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';
import PropTypes from 'prop-types';

const ImageUploader = ({ 
  onUpload, 
  maxFiles = 10, 
  accept = 'image/*',
  maxSizeMB = 5
}) => {
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = useCallback((file) => {
    if (!file.type.match('image.*')) {
      setError('Only image files are allowed');
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size should be less than ${maxSizeMB}MB`);
      return false;
    }
    return true;
  }, [maxSizeMB]);

  const handleFiles = useCallback((files) => {
    setError(null);
    const filesArray = Array.from(files);
    
    setPreviews(prevPreviews => {
      if (prevPreviews.length + filesArray.length > maxFiles) {
        setError(`You can upload a maximum of ${maxFiles} files`);
        return prevPreviews;
      }

      const validFiles = filesArray.filter(validateFile);
      if (validFiles.length === 0) return prevPreviews;

      const newPreviews = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));

      onUpload(validFiles);
      return [...prevPreviews, ...newPreviews];
    });
  }, [maxFiles, onUpload, validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback((e) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [handleFiles]);

  const removeImage = useCallback((index) => {
    setPreviews(prev => {
      const updatedPreviews = prev.filter((_, i) => i !== index);
      onUpload(updatedPreviews.map(p => p.file));
      return updatedPreviews;
    });
  }, [onUpload]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        URL.revokeObjectURL(preview.preview);
      });
    };
  }, []); // Empty dependency array - runs only on unmount

  return (
    <div className="space-y-3">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        role="button"
        tabIndex={0}
        aria-label="Image upload area"
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <FiUpload className="text-gray-400 text-2xl" />
          <p className="text-sm text-gray-600">
            Drag & drop images here, or click to browse
          </p>
          <p className="text-xs text-gray-500">
            Supported formats: JPG, PNG, GIF (Max {maxSizeMB}MB each)
          </p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept={accept}
          multiple
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {previews.length > 0 && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {previews.map((preview, index) => (
              <div key={`${preview.file.name}-${index}`} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={preview.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Y2EwYWIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMi41Ii8+PHBhdGggZD0iTTIxIDE1bC0zLjMtMy4zYTIgMiAwIDAgMC0yLjggMGwtLjQuNCIvPjwvc3ZnPg==';
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <FiX size={12} />
                </button>
                <div className="text-xs text-gray-500 truncate mt-1">
                  {preview.file.name}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500">
            {previews.length} of {maxFiles} files selected
          </div>
        </>
      )}
    </div>
  );
};

ImageUploader.propTypes = {
  onUpload: PropTypes.func.isRequired,
  maxFiles: PropTypes.number,
  accept: PropTypes.string,
  maxSizeMB: PropTypes.number
};

export default React.memo(ImageUploader);
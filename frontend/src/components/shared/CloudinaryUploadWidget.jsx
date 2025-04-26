/* eslint-disable no-undef */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const CloudinaryUploadWidget = ({ children, onUpload, uploadPreset, cloudName }) => {
  useEffect(() => {
    // Load Cloudinary script if not already loaded
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const showWidget = () => {
    if (!window.cloudinary) {
      console.error('Cloudinary script not loaded yet');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
        uploadPreset: uploadPreset || process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
        cropping: true,
        multiple: false,
        sources: ['local', 'url', 'camera'],
        styles: {
          palette: {
            window: '#FFFFFF',
            windowBorder: '#90A0B3',
            tabIcon: '#0078FF',
            menuIcons: '#5A616A',
            textDark: '#000000',
            textLight: '#FFFFFF',
            link: '#0078FF',
            action: '#FF620C',
            inactiveTabIcon: '#0E2F5A',
            error: '#F44235',
            inProgress: '#0078FF',
            complete: '#20B832',
            sourceBg: '#E4EBF1'
          },
          fonts: {
            default: null,
            "'Poppins', sans-serif": {
              url: 'https://fonts.googleapis.com/css?family=Poppins',
              active: true
            }
          }
        }
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          onUpload(error, {
            info: {
              secure_url: result.info.secure_url,
              public_id: result.info.public_id,
              original_filename: result.info.original_filename
            },
            event: result.event
          });
        } else if (error) {
          onUpload(error, result);
        }
      }
    );

    widget.open();
  };

  return React.Children.map(children, child => 
    React.cloneElement(child, { onClick: showWidget })
)};

CloudinaryUploadWidget.propTypes = {
  children: PropTypes.node.isRequired,
  onUpload: PropTypes.func.isRequired,
  uploadPreset: PropTypes.string,
  cloudName: PropTypes.string
};

export default CloudinaryUploadWidget;
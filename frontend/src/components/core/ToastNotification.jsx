import { useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastNotification = ({ type, message }) => {
  useEffect(() => {
    if (!message) return;

    const toastOptions = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toast.warning(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
      default:
        toast(message, toastOptions);
    }
  }, [type, message]);

  return null;
};

export default ToastNotification;

// Helper functions for easy usage
export const showToast = (type, message) => {
  return <ToastNotification type={type} message={message} />;
};

export const toastSuccess = (message) => showToast('success', message);
export const toastError = (message) => showToast('error', message);
export const toastWarning = (message) => showToast('warning', message);
export const toastInfo = (message) => showToast('info', message);
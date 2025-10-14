import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/core/Button';

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handlePaymentReturnFromGateway } = useOrder();
  const { user } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState('processing');
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const processPaymentReturn = async () => {
      try {
        const queryParams = {
          transaction_id: searchParams.get('transaction_id'),
          response_code: searchParams.get('response_code'),
          response_message: searchParams.get('response_message'),
          basket_id: searchParams.get('basket_id')
        };

        console.log('Payment return parameters:', queryParams);

        if (!queryParams.transaction_id) {
          setPaymentStatus('error');
          setError('Invalid payment response');
          return;
        }

        const result = await handlePaymentReturnFromGateway(queryParams);
        setOrderDetails(result.order);

        if (queryParams.response_code === '00') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('failed');
          setError(queryParams.response_message || 'Payment failed');
        }
      } catch (err) {
        console.error('Error processing payment return:', err);
        setPaymentStatus('error');
        setError(err.message || 'Failed to process payment');
      }
    };

    processPaymentReturn();
  }, [searchParams, handlePaymentReturnFromGateway]);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
        return <FiCheckCircle className="h-12 w-12 text-green-500" />;
      case 'failed':
        return <FiXCircle className="h-12 w-12 text-red-500" />;
      case 'error':
        return <FiXCircle className="h-12 w-12 text-red-500" />;
      default:
        return <FiClock className="h-12 w-12 text-blue-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Payment Successful!';
      case 'failed':
        return 'Payment Failed';
      case 'error':
        return 'Payment Error';
      default:
        return 'Processing Payment...';
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Your payment has been processed successfully. Your order is now being processed.';
      case 'failed':
        return error || 'The payment could not be processed. Please try again.';
      case 'error':
        return error || 'An error occurred while processing your payment.';
      default:
        return 'Please wait while we process your payment...';
    }
  };

  if (paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="animate-pulse">
            <FiClock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600 mb-6">Please wait while we verify your payment...</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          {getStatusIcon()}
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {getStatusTitle()}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {getStatusMessage()}
        </p>

        {orderDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
            <p className="text-sm text-gray-600">
              <strong>Order ID:</strong> {orderDetails.orderId}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Amount:</strong> PKR {orderDetails.totalAmount?.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Status:</strong> {orderDetails.status}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {paymentStatus === 'success' && (
            <>
              <Button
                onClick={() => navigate(`/orders/${orderDetails?.orderId}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
              >
                View Order Details
              </Button>
              <Button
                onClick={() => navigate('/products')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md"
              >
                Continue Shopping
              </Button>
            </>
          )}

          {paymentStatus === 'failed' && (
            <>
              <Button
                onClick={() => navigate('/cart')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md"
              >
                Return to Cart
              </Button>
              <Button
                onClick={() => navigate('/products')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-md"
              >
                Continue Shopping
              </Button>
            </>
          )}

          {paymentStatus === 'error' && (
            <Button
              onClick={() => navigate('/support')}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-md"
            >
              Contact Support
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentReturn;
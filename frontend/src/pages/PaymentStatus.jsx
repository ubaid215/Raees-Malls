import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/core/Button';

const PaymentStatus = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { checkOrderPaymentStatus, retryOrderPayment } = useOrder();
  const { user } = useAuth();
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      if (!orderId) return;
      
      try {
        setLoading(true);
        const data = await checkOrderPaymentStatus(orderId, true);
        setPaymentData(data);
      } catch (err) {
        console.error('Error fetching payment status:', err);
        setError(err.message || 'Failed to fetch payment status');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();

    // Set up polling for pending payments
    const interval = setInterval(() => {
      if (paymentData?.paymentStatus === 'pending') {
        fetchPaymentStatus();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [orderId, checkOrderPaymentStatus]);

  const handleRetryPayment = async () => {
    try {
      setRetrying(true);
      const result = await retryOrderPayment(orderId);
      
      // The retry function will handle the redirection
      // If we get here, it means redirection didn't happen
      if (result.payment) {
        if (result.order.paymentMethod === 'credit_card') {
          // Credit card redirect happens automatically
        } else {
          window.location.href = result.payment.paymentUrl;
        }
      }
    } catch (err) {
      console.error('Error retrying payment:', err);
      setError(err.message || 'Failed to retry payment');
    } finally {
      setRetrying(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      completed: {
        icon: <FiCheckCircle className="h-12 w-12 text-green-500" />,
        title: 'Payment Completed',
        message: 'Your payment has been successfully processed.',
        color: 'green'
      },
      pending: {
        icon: <FiClock className="h-12 w-12 text-blue-500" />,
        title: 'Payment Pending',
        message: 'Your payment is being processed. This may take a few moments.',
        color: 'blue'
      },
      failed: {
        icon: <FiXCircle className="h-12 w-12 text-red-500" />,
        title: 'Payment Failed',
        message: 'The payment could not be processed. Please try again.',
        color: 'red'
      },
      not_required: {
        icon: <FiCheckCircle className="h-12 w-12 text-green-500" />,
        title: 'Order Confirmed',
        message: 'Your order has been placed successfully. No payment required.',
        color: 'green'
      }
    };

    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="animate-pulse">
            <FiClock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Payment Status</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <FiXCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => navigate('/orders')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
          >
            View My Orders
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(paymentData?.paymentStatus);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          {statusConfig.icon}
        </div>
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {statusConfig.title}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {statusConfig.message}
        </p>

        {paymentData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
            <h3 className="font-semibold text-gray-900 mb-2">Order Information</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">{paymentData.order?.orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium">PKR {paymentData.order?.totalAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium capitalize">
                {paymentData.order?.paymentMethod?.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium capitalize ${
                statusConfig.color === 'green' ? 'text-green-600' :
                statusConfig.color === 'red' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {paymentData.paymentStatus}
              </span>
            </div>
            
            {paymentData.alfaPayment?.transactionId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-medium text-xs">{paymentData.alfaPayment.transactionId}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {paymentData?.paymentStatus === 'failed' && (
            <Button
              onClick={handleRetryPayment}
              disabled={retrying}
              loading={retrying}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md"
            >
              {retrying ? 'Retrying...' : 'Retry Payment'}
            </Button>
          )}

          {paymentData?.paymentStatus === 'pending' && (
            <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
              <FiRefreshCw className="h-4 w-4 animate-spin" />
              <span>Automatically updating...</span>
            </div>
          )}

          <Button
            onClick={() => navigate(`/orders/${orderId}`)}
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
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
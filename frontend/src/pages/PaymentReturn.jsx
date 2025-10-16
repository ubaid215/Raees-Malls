import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock, ArrowLeft, ExternalLink } from 'lucide-react';

const PaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { handlePaymentReturnFromGateway } = useOrder();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const processPaymentReturn = async () => {
      try {
        const queryParams = Object.fromEntries(new URLSearchParams(location.search));
        const result = await handlePaymentReturnFromGateway(queryParams);
        setPaymentResult(result);
      } catch (err) {
        setError(err.message || 'Failed to process payment return');
      } finally {
        setLoading(false);
      }
    };

    processPaymentReturn();
  }, [location.search, handlePaymentReturnFromGateway]);

  const isPaymentSuccessful = paymentResult?.paymentDetails?.responseCode === '00' || 
                             paymentResult?.paymentDetails?.transaction_status === 'success';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Processing Payment
          </h2>
          <p className="text-gray-600 mb-2">
            Please wait while we verify your payment.
          </p>
          <div className="flex justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Complete
          </h1>
          <p className="text-gray-600">Your payment has been processed</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isPaymentSuccessful ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {isPaymentSuccessful ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-600" />
                )}
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${
                isPaymentSuccessful ? 'text-green-900' : 'text-red-900'
              }`}>
                {isPaymentSuccessful ? 'Payment Successful!' : 'Payment Failed'}
              </h2>
              <p className="text-gray-600">
                {isPaymentSuccessful 
                  ? 'Thank you for your payment. Your order has been confirmed.'
                  : error || paymentResult?.paymentDetails?.message || 'Your payment could not be processed.'
                }
              </p>
            </div>

            {paymentResult?.order && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-medium text-gray-900">{paymentResult.order.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-green-600">
                      PKR {paymentResult.order.totalAmount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      paymentResult.order.status === 'processing' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {paymentResult.order.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => navigate('/orders')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-700 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
              >
                Continue Shopping
              </button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-6">
            {/* Next Steps */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">What's Next?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Order Confirmation</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      You'll receive an email confirmation with your order details.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Order Processing</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      We'll start preparing your order for shipment.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Shipping Updates</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Track your order with real-time shipping updates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-blue-100 text-sm mb-4">
                Our customer support team is here to assist you with any questions.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-200">Email:</span>
                  <span>support@raeesmalls.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-200">Phone:</span>
                  <span>+92 300 6530063</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isPaymentSuccessful && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/checkout')}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Try Payment Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;
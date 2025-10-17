import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowLeft, ExternalLink, Copy } from 'lucide-react';

const PaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  useEffect(() => {
    // ✅ Parse URL parameters directly - no API call needed
    const processPaymentReturn = () => {
      try {
        const queryParams = Object.fromEntries(new URLSearchParams(location.search));
        console.log('[PaymentReturn] URL params:', queryParams);
        
        // Extract status from URL
        const status = queryParams.status;
        const orderId = queryParams.orderId || queryParams.O;
        const transactionId = queryParams.transactionId || queryParams.TID;
        const amount = queryParams.amount;
        const responseCode = queryParams.responseCode || queryParams.code;
        const message = queryParams.message;

        if (!orderId) {
          setPaymentResult({
            success: false,
            error: 'Order ID not found in payment response'
          });
          setLoading(false);
          return;
        }

        // Set result based on status
        const isSuccess = status === 'success';
        
        setPaymentResult({
          success: isSuccess,
          order: {
            orderId: orderId,
            totalAmount: parseFloat(amount) || 0,
            paymentStatus: isSuccess ? 'completed' : 'failed',
            status: isSuccess ? 'confirmed' : 'payment_failed'
          },
          paymentDetails: {
            transaction_id: transactionId,
            transaction_status: status,
            responseCode: responseCode,
            message: message
          }
        });
        
        console.log('[PaymentReturn] Payment result set:', {
          success: isSuccess,
          orderId,
          status
        });
        
      } catch (err) {
        console.error('[PaymentReturn] Error:', err);
        setPaymentResult({
          success: false,
          error: err.message || 'Failed to process payment return'
        });
      } finally {
        setLoading(false);
      }
    };

    processPaymentReturn();
  }, [location.search]);

  const copyOrderId = () => {
    if (paymentResult?.order?.orderId) {
      navigator.clipboard.writeText(paymentResult.order.orderId);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    }
  };

  const isPaymentSuccessful = paymentResult?.success && 
                             (paymentResult?.paymentDetails?.transaction_status === 'success' ||
                              paymentResult?.order?.paymentStatus === 'completed');

  const orderId = paymentResult?.order?.orderId || 'N/A';

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
                  : decodeURIComponent(paymentResult?.paymentDetails?.message || paymentResult?.error || 'Your payment could not be processed.')
                }
              </p>
            </div>

            {/* Order Details Section */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
              <div className="space-y-3 text-sm">
                {/* Order ID with Copy Functionality */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 bg-white px-2 py-1 rounded border">
                      {orderId}
                    </span>
                    <button
                      onClick={copyOrderId}
                      className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Copy Order ID"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {copiedOrderId && (
                  <div className="text-xs text-green-600 text-right animate-pulse">
                    Copied to clipboard!
                  </div>
                )}

                {/* Amount */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">
                    PKR {paymentResult?.order?.totalAmount?.toLocaleString() || 'N/A'}
                  </span>
                </div>

                {/* Payment Status */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isPaymentSuccessful 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isPaymentSuccessful ? 'Completed' : 'Failed'}
                  </span>
                </div>

                {/* Order Status */}
                {paymentResult?.order?.status && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      paymentResult.order.status === 'confirmed' || paymentResult.order.status === 'processing'
                        ? 'bg-blue-100 text-blue-800'
                        : paymentResult.order.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {paymentResult.order.status.charAt(0).toUpperCase() + paymentResult.order.status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                )}

                {/* Transaction ID */}
                {paymentResult?.paymentDetails?.transaction_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium text-gray-900 text-xs">
                      {paymentResult.paymentDetails.transaction_id}
                    </span>
                  </div>
                )}

                {/* Response Code */}
                {paymentResult?.paymentDetails?.responseCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Response Code:</span>
                    <span className="font-medium text-gray-900 text-xs">
                      {paymentResult.paymentDetails.responseCode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/account/orders')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                View Order Details
                <ExternalLink className="h-4 w-4" />
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
              <h3 className="font-semibold text-gray-900 mb-4">
                {isPaymentSuccessful ? "What's Next?" : "What to Do Next?"}
              </h3>
              <div className="space-y-4">
                {isPaymentSuccessful ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Order Confirmation</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          You'll receive an email confirmation with your order details and receipt.
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
                          We'll start preparing your order for shipment within 24 hours.
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
                          Track your order with real-time shipping updates in your account.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-yellow-600 font-semibold text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Retry Payment</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          You can try the payment again with the same order.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Contact Support</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          If the issue persists, contact our support team for assistance.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 font-semibold text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Check Payment Method</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Ensure your payment method has sufficient funds and is valid.
                        </p>
                      </div>
                    </div>
                  </>
                )}
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
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-blue-200">Reference:</span>
                  <span className="font-mono">Order: {orderId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isPaymentSuccessful && (
          <div className="mt-8 text-center space-y-4">
            <p className="text-gray-600">
              Having trouble with your payment? You can try again or contact support.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/account/orders')}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;
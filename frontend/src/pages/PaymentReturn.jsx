import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowLeft, ExternalLink, Copy, Package, Truck, ShoppingBag } from 'lucide-react';
import { useOrder } from '../context/OrderContext';

const PaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchOrderDetails, checkOrderPaymentStatus, syncPaymentStatus } = useOrder();
  
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState(false);

  useEffect(() => {
    const processPaymentReturn = async () => {
      try {
        const queryParams = Object.fromEntries(new URLSearchParams(location.search));
        console.log('[PaymentReturn] URL params:', queryParams);
        
        // Extract status from URL
        const status = queryParams.status;
        const orderId = queryParams.orderId || queryParams.O || queryParams.basket_id;
        const transactionId = queryParams.transactionId || queryParams.TID;
        const amount = queryParams.amount;
        const responseCode = queryParams.responseCode || queryParams.code || queryParams.RC;
        const message = queryParams.message || queryParams.response_message;

        if (!orderId) {
          setPaymentResult({
            success: false,
            error: 'Order ID not found in payment response'
          });
          setLoading(false);
          return;
        }

        // Set initial result based on URL parameters
        const isSuccess = status === 'success' || 
                         responseCode === '00' || 
                         responseCode === '000' ||
                         queryParams.transaction_status === 'success';

        const initialResult = {
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
            message: decodeURIComponent(message || '')
          }
        };

        setPaymentResult(initialResult);
        
        // Fetch detailed order information
        try {
          console.log('[PaymentReturn] Fetching order details for:', orderId);
          const orderData = await fetchOrderDetails(orderId, true); // Force refresh
          setOrderDetails(orderData);
          
          // Also check payment status for verification
          const paymentStatus = await checkOrderPaymentStatus(orderId, true);
          console.log('[PaymentReturn] Payment status:', paymentStatus);
          
          // Update result with actual order data
          if (orderData) {
            setPaymentResult(prev => ({
              ...prev,
              order: {
                ...prev.order,
                ...orderData,
                totalAmount: orderData.totalAmount || prev.order.totalAmount
              }
            }));
          }
        } catch (fetchError) {
          console.warn('[PaymentReturn] Could not fetch order details:', fetchError);
          // Continue with basic info from URL params
        }
        
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
  }, [location.search, fetchOrderDetails, checkOrderPaymentStatus]);

  const handleSyncPayment = async () => {
    if (!paymentResult?.order?.orderId) return;
    
    setSyncingPayment(true);
    try {
      const result = await syncPaymentStatus(paymentResult.order.orderId);
      console.log('[PaymentReturn] Sync result:', result);
      
      // Refresh order details after sync
      const updatedOrder = await fetchOrderDetails(paymentResult.order.orderId, true);
      setOrderDetails(updatedOrder);
      
      // Update payment result
      setPaymentResult(prev => ({
        ...prev,
        success: updatedOrder?.paymentStatus === 'completed',
        order: updatedOrder || prev.order
      }));
      
    } catch (error) {
      console.error('[PaymentReturn] Sync error:', error);
    } finally {
      setSyncingPayment(false);
    }
  };

  const copyOrderId = () => {
    if (paymentResult?.order?.orderId) {
      navigator.clipboard.writeText(paymentResult.order.orderId);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    }
  };

  const getOrderStatusInfo = (status) => {
    const statusInfo = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed', icon: ShoppingBag },
      processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing', icon: Package },
      shipped: { color: 'bg-indigo-100 text-indigo-800', label: 'Shipped', icon: Truck },
      delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: XCircle },
      payment_failed: { color: 'bg-red-100 text-red-800', label: 'Payment Failed', icon: XCircle }
    };
    
    return statusInfo[status] || statusInfo.pending;
  };

  const getPaymentStatusInfo = (status) => {
    const statusInfo = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      not_required: { color: 'bg-gray-100 text-gray-800', label: 'Not Required' }
    };
    
    return statusInfo[status] || statusInfo.pending;
  };

 // In your PaymentReturn component, update the status handling:
const isPaymentSuccessful = paymentResult?.success && 
  (paymentResult?.order?.paymentStatus === 'completed' ||
   paymentResult?.paymentDetails?.responseCode === '00');

// Status mapping that matches your model
const orderStatusMap = {
  'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  'processing': { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
  'shipped': { color: 'bg-purple-100 text-purple-800', label: 'Shipped' },
  'delivered': { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  'returned': { color: 'bg-orange-100 text-orange-800', label: 'Returned' },
  'payment_failed': { color: 'bg-red-100 text-red-800', label: 'Payment Failed' }
};

const paymentStatusMap = {
  'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  'processing': { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
  'completed': { color: 'bg-green-100 text-green-800', label: 'Completed' },
  'failed': { color: 'bg-red-100 text-red-800', label: 'Failed' },
  'refunded': { color: 'bg-orange-100 text-orange-800', label: 'Refunded' },
  'not_required': { color: 'bg-gray-100 text-gray-800', label: 'Not Required' }
};

  const orderId = paymentResult?.order?.orderId || 'N/A';
  const orderStatusInfo = getOrderStatusInfo(paymentResult?.order?.status);
  const paymentStatusInfo = getPaymentStatusInfo(paymentResult?.order?.paymentStatus);

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
                  : paymentResult?.paymentDetails?.message || paymentResult?.error || 'Your payment could not be processed.'
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

                {/* Items Count */}
                {orderDetails?.items && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium text-gray-900">
                      {orderDetails.items.length} item{orderDetails.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Order Date */}
                {orderDetails?.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(orderDetails.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Payment Status */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Status:</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusInfo.color}`}>
                      {paymentStatusInfo.label}
                    </span>
                    {!isPaymentSuccessful && (
                      <button
                        onClick={handleSyncPayment}
                        disabled={syncingPayment}
                        className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        {syncingPayment ? 'Syncing...' : 'Sync Status'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Order Status */}
                {paymentResult?.order?.status && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Order Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${orderStatusInfo.color}`}>
                      {orderStatusInfo.label}
                    </span>
                  </div>
                )}

                {/* Transaction ID */}
                {paymentResult?.paymentDetails?.transaction_id && paymentResult.paymentDetails.transaction_id !== 'N/A' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium text-gray-900 text-xs">
                      {paymentResult.paymentDetails.transaction_id}
                    </span>
                  </div>
                )}

                {/* Response Code */}
                {paymentResult?.paymentDetails?.responseCode && paymentResult.paymentDetails.responseCode !== 'N/A' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Response Code:</span>
                    <span className={`font-medium text-xs ${
                      paymentResult.paymentDetails.responseCode === '00' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {paymentResult.paymentDetails.responseCode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items Preview */}
            {orderDetails?.items && orderDetails.items.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {orderDetails.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 truncate flex-1">
                        {item.itemName || `Item ${index + 1}`}
                      </span>
                      <span className="text-gray-900 font-medium ml-2">
                        Qty: {item.quantity || 1}
                      </span>
                    </div>
                  ))}
                  {orderDetails.items.length > 3 && (
                    <div className="text-xs text-gray-500 text-center pt-2 border-t">
                      +{orderDetails.items.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            )}

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
                          You can try the payment again from your order history.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Sync Payment Status</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Use the sync button to check if your payment was processed.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 font-semibold text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Contact Support</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          If the issue persists, contact our support team for assistance.
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
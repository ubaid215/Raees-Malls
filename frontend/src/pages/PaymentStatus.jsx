import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  ArrowLeft,
  CreditCard,
  Package,
  Truck
} from 'lucide-react';

const PaymentStatus = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { checkOrderPaymentStatus, retryOrderPayment, fetchOrderDetails } = useOrder();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statusData, orderData] = await Promise.all([
          checkOrderPaymentStatus(orderId, true),
          fetchOrderDetails(orderId, true)
        ]);
        setPaymentStatus(statusData);
        setOrderDetails(orderData);
      } catch (err) {
        setError(err.message || 'Failed to fetch payment status');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchData();
    }
  }, [orderId, checkOrderPaymentStatus, fetchOrderDetails]);

  const handleRetryPayment = async () => {
    try {
      setRefreshing(true);
      await retryOrderPayment(orderId);
    } catch (err) {
      setError(err.message || 'Failed to retry payment');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const [statusData, orderData] = await Promise.all([
        checkOrderPaymentStatus(orderId, true),
        fetchOrderDetails(orderId, true)
      ]);
      setPaymentStatus(statusData);
      setOrderDetails(orderData);
    } catch (err) {
      setError(err.message || 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      completed: {
        icon: CheckCircle,
        color: 'green',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
        borderColor: 'border-green-200',
        label: 'Payment Completed'
      },
      pending: {
        icon: Clock,
        color: 'yellow',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600',
        borderColor: 'border-yellow-200',
        label: 'Payment Pending'
      },
      failed: {
        icon: XCircle,
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
        borderColor: 'border-red-200',
        label: 'Payment Failed'
      },
      processing: {
        icon: RefreshCw,
        color: 'blue',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-200',
        label: 'Processing'
      }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Loading Payment Status
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch your payment details...
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(orderDetails?.paymentStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Status
          </h1>
          <p className="text-gray-600">Track your payment and order details</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Status Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Overview */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 ${statusConfig.bgColor} rounded-2xl flex items-center justify-center`}>
                  <statusConfig.icon className={`h-8 w-8 ${statusConfig.textColor}`} />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {statusConfig.label}
                  </h2>
                  <p className="text-gray-600">
                    Order #{orderId}
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Order Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">Order Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Order Placed</p>
                      <p className="text-sm text-gray-600">Your order has been received</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${
                      orderDetails?.paymentStatus === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                    } rounded-full flex items-center justify-center flex-shrink-0`}>
                      <CreditCard className={`h-4 w-4 ${
                        orderDetails?.paymentStatus === 'completed' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Payment Processing</p>
                      <p className="text-sm text-gray-600">
                        {orderDetails?.paymentStatus === 'completed' 
                          ? 'Payment completed successfully'
                          : 'Waiting for payment confirmation'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Order Processing</p>
                      <p className="text-sm text-gray-600">Preparing your items for shipment</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Shipped</p>
                      <p className="text-sm text-gray-600">Your order is on the way</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            {paymentStatus && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Payment Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                    <p className="font-medium text-gray-900">{paymentStatus.transactionId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Response Code</p>
                    <p className="font-medium text-gray-900">{paymentStatus.responseCode || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Message</p>
                    <p className="font-medium text-gray-900">{paymentStatus.message || 'Processing'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                    <p className="font-medium text-gray-900">
                      {paymentStatus.updatedAt ? new Date(paymentStatus.updatedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            {orderDetails && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID</span>
                    <span className="font-medium text-gray-900">{orderDetails.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {orderDetails.paymentMethod?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      orderDetails.paymentStatus === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : orderDetails.paymentStatus === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {orderDetails.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-blue-600">
                      PKR {orderDetails.totalAmount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  View All Orders
                </button>
                
                {orderDetails?.paymentStatus === 'failed' && (
                  <button
                    onClick={handleRetryPayment}
                    disabled={refreshing}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
                  >
                    {refreshing ? 'Processing...' : 'Retry Payment'}
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-700 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
                >
                  Continue Shopping
                </button>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-blue-100 text-sm mb-4">
                Contact our support team for assistance with your payment.
              </p>
              <div className="space-y-2 text-sm">
                <div>📧 support@raeesmalls.com</div>
                <div>📞 +92 300 6530063</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
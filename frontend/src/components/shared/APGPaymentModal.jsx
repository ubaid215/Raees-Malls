// components/APGPaymentModal.jsx
import React, { useState } from 'react';
import { FiCreditCard, FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-toastify';
import Button from '../core/Button';
import Input from '../core/Input';

const APGPaymentModal = ({ order, onSuccess, onClose }) => {
  const [step, setStep] = useState('method'); // method, details, otp, processing
  const [loading, setLoading] = useState(false);
  
  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('1'); // 1=Wallet, 2=Account
  const [accountNumber, setAccountNumber] = useState('');
  const [mobile, setMobile] = useState('');
  
  // OTP data
  const [otpData, setOtpData] = useState({
    smsOTP: '',
    smsOTAC: '',
    emailOTAC: ''
  });
  
  // Transaction data
  const [transactionData, setTransactionData] = useState(null);
  const [error, setError] = useState('');

  // Safe order data access
  const safeOrder = order || {};
  const orderId = safeOrder.orderId || 'N/A';
  const totalAmount = safeOrder.totalAmount || 0;
  const shippingAddress = safeOrder.shippingAddress || {};
  const userEmail = shippingAddress.email || safeOrder.userId?.email || '';

  // Validate order data
  if (!order || !order.orderId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <FiAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Invalid Order Data
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Unable to process payment. Please try placing the order again.
            </p>
            <Button
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Initialize Payment
  const handleInitializePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate inputs
    if (!accountNumber.trim()) {
      setError('Account number is required');
      setLoading(false);
      return;
    }

    if (!mobile.trim()) {
      setError('Mobile number is required');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/orders/apg/initialize', {
        orderId: orderId,
        paymentMethodType: paymentMethod,
        accountNumber: accountNumber.trim(),
        amount: totalAmount,
        email: userEmail,
        mobile: mobile.trim()
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setTransactionData(response.data.data);
        setStep('otp');
        toast.success('OTP sent! Please check your phone/email.');
      } else {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }
    } catch (err) {
      console.error('APG Initialize Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to initialize payment';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Complete Payment
  const handleVerifyPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStep('processing');

    // Validate OTP inputs
    if (paymentMethod === '1' && !otpData.smsOTP.trim()) {
      setError('SMS OTP is required for Alfa Wallet');
      setStep('otp');
      setLoading(false);
      return;
    }

    if (paymentMethod === '2' && (!otpData.smsOTAC.trim() || !otpData.emailOTAC.trim())) {
      setError('Both SMS and Email OTAC are required for Bank Account');
      setStep('otp');
      setLoading(false);
      return;
    }

    try {
      const requestData = {
        transactionRef: transactionData?.transactionRef,
        authToken: transactionData?.authToken,
        hashKey: transactionData?.hashKey,
        paymentMethodType: paymentMethod,
        ...(paymentMethod === '1' ? {
          smsOTP: otpData.smsOTP.trim()
        } : {
          smsOTAC: otpData.smsOTAC.trim(),
          emailOTAC: otpData.emailOTAC.trim()
        })
      };

      const response = await axios.post('/api/orders/apg/verify', requestData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        toast.success('Payment successful!');
        onSuccess(response.data.data);
      } else {
        throw new Error(response.data.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('APG Verify Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Payment verification failed';
      setError(errorMsg);
      toast.error(errorMsg);
      setStep('otp'); // Go back to OTP step
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close with confirmation
  const handleClose = () => {
    if (step === 'processing') {
      toast.warning('Payment is being processed. Please wait...');
      return;
    }
    
    if (step !== 'method') {
      const confirmClose = window.confirm(
        'Are you sure you want to cancel? Your order has been created but payment is incomplete.'
      );
      if (!confirmClose) return;
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Complete Payment
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            disabled={loading || step === 'processing'}
          >
            ✕
          </button>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Order ID:</span>
            <span className="font-medium">{orderId}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount:</span>
            <span className="text-red-600">PKR {totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Payment Method & Details */}
        {step === 'method' && (
          <form onSubmit={handleInitializePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="1"
                    checked={paymentMethod === '1'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <FiCreditCard className="ml-3 mr-2 text-gray-600" />
                  <span className="text-sm font-medium">Alfa Wallet</span>
                </label>
                
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="2"
                    checked={paymentMethod === '2'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <FiLock className="ml-3 mr-2 text-gray-600" />
                  <span className="text-sm font-medium">Alfalah Bank Account</span>
                </label>
              </div>
            </div>

            <Input
              label={paymentMethod === '1' ? 'Wallet Number' : 'Account Number'}
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={paymentMethod === '1' ? 'Enter 15-digit wallet number' : 'Enter account number'}
              required
              disabled={loading}
            />

            <Input
              label="Mobile Number"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="03001234567"
              required
              disabled={loading}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FiLock className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Your payment is secured by Bank Alfalah. An OTP will be sent to verify the transaction.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 py-2 rounded-md"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md"
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Processing...' : 'Continue'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyPayment} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <FiCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  {paymentMethod === '1' 
                    ? 'OTP sent to your mobile number. Please enter the 8-digit code.'
                    : 'OTACs sent to your mobile and email. Please enter both codes.'}
                </p>
              </div>
            </div>

            {paymentMethod === '1' ? (
              <Input
                label="SMS OTP (8 digits)"
                type="text"
                value={otpData.smsOTP}
                onChange={(e) => setOtpData({ ...otpData, smsOTP: e.target.value })}
                placeholder="12345678"
                maxLength="8"
                required
                className="text-center text-lg tracking-widest"
                disabled={loading}
              />
            ) : (
              <>
                <Input
                  label="SMS OTAC (4 digits)"
                  type="text"
                  value={otpData.smsOTAC}
                  onChange={(e) => setOtpData({ ...otpData, smsOTAC: e.target.value })}
                  placeholder="1234"
                  maxLength="4"
                  required
                  className="text-center text-lg tracking-widest"
                  disabled={loading}
                />
                <Input
                  label="Email OTAC (4 characters)"
                  type="text"
                  value={otpData.emailOTAC}
                  onChange={(e) => setOtpData({ ...otpData, emailOTAC: e.target.value.toUpperCase() })}
                  placeholder="ABCD"
                  maxLength="4"
                  required
                  className="text-center text-lg tracking-widest uppercase"
                  disabled={loading}
                />
              </>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => {
                  setStep('method');
                  setError('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 py-2 rounded-md"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md"
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Pay'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing payment...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait, do not close this window</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default APGPaymentModal;
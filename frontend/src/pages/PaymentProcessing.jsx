import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, Lock, CreditCard } from 'lucide-react';

const PaymentProcessing = () => {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Header */}
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Redirecting to Payment Gateway
        </h1>
        
        <p className="text-lg text-gray-600 mb-2">
          You will be automatically redirected in
        </p>
        
        <div className="text-4xl font-bold text-blue-600 mb-6">
          {countdown} seconds
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${(5 - countdown) * 20}%` }}
          ></div>
        </div>

        {/* Security Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <Shield className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <div className="font-semibold text-green-900">Secure</div>
              <div className="text-sm text-green-700">256-bit SSL</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <Lock className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold text-blue-900">Encrypted</div>
              <div className="text-sm text-blue-700">Bank-level security</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <CreditCard className="h-6 w-6 text-purple-600" />
            <div className="text-left">
              <div className="font-semibold text-purple-900">Verified</div>
              <div className="text-sm text-purple-700">PCI DSS compliant</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-600 text-sm font-bold">!</span>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Important</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Please do not close this window or refresh the page</li>
                <li>• Keep your payment details ready</li>
                <li>• You will be redirected back automatically after payment</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Manual Redirect */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/orders')}
            className="text-blue-600 hover:text-blue-700 font-medium underline transition-colors"
          >
            Click here if you are not redirected automatically
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentProcessing;
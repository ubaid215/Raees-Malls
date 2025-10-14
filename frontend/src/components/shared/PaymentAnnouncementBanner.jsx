// components/shared/PaymentAnnouncementBanner.jsx
import React from 'react';
import { FiCreditCard, FiShield } from 'react-icons/fi';

const PaymentAnnouncementBanner = () => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 mb-6 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white bg-opacity-20 p-2 rounded-full">
            <FiCreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Secure Online Payments</h3>
            <p className="text-xs opacity-90">
              Now accepting Alfa Wallet & Alfalah Bank payments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <FiShield className="h-4 w-4" />
          <span>Bank Alfalah Secured</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnnouncementBanner;
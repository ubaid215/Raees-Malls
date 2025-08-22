import React, { useState } from "react";
import { FaCreditCard, FaTimes, FaExclamationTriangle, FaClock, FaShieldAlt } from "react-icons/fa";
import { MdPayment, MdSecurity } from "react-icons/md";
import { BsLightningChargeFill } from "react-icons/bs";

const PaymentAnnouncementBanner = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="relative mb-6 mx-4 md:mx-0">
      {/* Main Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600-600 to-blue-700 rounded-xl shadow-lg overflow-hidden border-2 border-blue-200">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 animate-pulse"></div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-all"
          aria-label="Close announcement"
        >
          <FaTimes className="text-white text-sm" />
        </button>

        <div className="relative px-4 py-4 md:px-6 md:py-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 rounded-full">
                <MdPayment className="text-white text-xl" />
              </div>
              <div className="flex items-center gap-1">
                <BsLightningChargeFill className="text-yellow-300 text-sm animate-pulse" />
                <span className="text-white font-bold text-sm md:text-base">IMPORTANT UPDATE</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-lg md:text-xl leading-tight">
              Online Payment Gateway Coming Soon!
            </h3>
            
            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
              We're currently integrating secure online payment options with our banking partners. 
              In the meantime, <span className="font-semibold text-white">feel free to explore our website</span> and add your favorite items to the cart.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <FaClock className="text-blue-200 text-sm flex-shrink-0" />
                <span className="text-white text-xs md:text-sm font-medium">Coming This Month</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <FaShieldAlt className="text-green-300 text-sm flex-shrink-0" />
                <span className="text-white text-xs md:text-sm font-medium">Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <FaCreditCard className="text-yellow-300 text-sm flex-shrink-0" />
                <span className="text-white text-xs md:text-sm font-medium">Multiple Options</span>
              </div>
            </div>

           
          </div>
        </div>
      </div>

      {/* Bottom Info Strip */}
      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2 justify-center">
          <FaExclamationTriangle className="text-amber-600 text-sm" />
          <span className="text-amber-800 text-xs md:text-sm font-medium">
            Your order security and satisfaction remain our top priority
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnnouncementBanner;
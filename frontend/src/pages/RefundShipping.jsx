import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  as: Component = 'button',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    outline: 'border border-red-300 hover:bg-red-50 py-2 px-3 text-gray-700 focus:ring-red-500',
    ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-red-500',
    danger: 'bg-red-500 hover:bg-red-600 py-1 px-2 text-white focus:ring-red-500',
  };

  const sizeStyles = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <>
      <style>{`
        @keyframes vibrate {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(3px, 1px) rotate(0.7deg); }
          40% { transform: translate(-1px, -2px) rotate(-0.7deg); }
          60% { transform: translate(1px, -1px) rotate(0.7deg); }
          80% { transform: translate(-2px, 1px) rotate(-0.7deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .vibrate-on-hover:hover {
          animation: vibrate 0.5s ease-in-out;
        }
      `}</style>
      <Component
        className={`
          rounded-md font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-70 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          ${fullWidth ? 'w-full' : 'w-auto'}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          vibrate-on-hover
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {Icon && <Icon className="h-5 w-5" />}
            {children}
          </>
        )}
      </Component>
    </>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-lg p-6 transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}>
    {children}
  </div>
);

const RefundShipping = () => {
  const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
  const staggerChildren = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };

  return (
    <div className="bg-gray-50">
      <motion.section
        className="relative bg-gradient-to-r from-red-600 to-red-800 py-20 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >
        <div className="absolute inset-0 bg-pattern opacity-10" style={{ backgroundImage: 'url(/pattern.png)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4" variants={fadeInUp}>
            Refund & Shipping
          </motion.h1>
          <motion.p className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto mb-8" variants={fadeInUp}>
            Seamless Shipping, Effortless Refunds – Your Satisfaction, Raees Malls Priority
          </motion.p>
        </div>
      </motion.section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Refund Policy</motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Refunds apply to approved returns and pre-dispatch cancellations. The customer is responsible for shipping costs and the safety of returned devices.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Non-Refundable Conditions for Used Devices:</motion.h3>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Change of mind or disinterest.</li>
            <li>Device not returned in original condition.</li>
            <li>Customer-caused damage (physical or software).</li>
            <li>Missing parts (e.g., SIM tray, S-Pen).</li>
            <li>Third-party repairs or tampering.</li>
            <li>Outside the 14-day guarantee period.</li>
            <li>Locked devices (password, pattern, etc.).</li>
            <li>Signed-in accounts (Gmail, iCloud).</li>
            <li>Broken or missing warranty seal.</li>
          </motion.ul>
          <motion.p className="text-lg text-gray-600 mt-4" variants={fadeInUp}>
            <strong>Note:</strong> Brand-new devices are not refundable by Raees Malls; contact the manufacturer’s service center for issues.
          </motion.p>
          <motion.p className="text-lg text-gray-600" variants={fadeInUp}>
            Refunds are processed within 15 working days via bank transfer.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Cancellation Policy</motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Orders can be canceled before shipping. Contact our support team at{' '}
            <a href="tel:+923006530063" className="text-red-600 hover:underline">+923006530063</a> or{' '}
            <a href="mailto:raeesmalls1@gmail.com" className="text-red-600 hover:underline">raeesmalls1@gmail.com</a>.
          </motion.p>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Refunds for canceled orders (partial or full payment) are processed within 10-15 working days.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Seller-Initiated Cancellations:</motion.h3>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Product unavailability or price changes.</li>
            <li>Orders from shopkeepers/wholesalers (B2C model).</li>
            <li>Multiple quantity orders indicating bulk purchase.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Shipping & Delivery</motion.h2>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>We ship via various courier services with 3-5 business day delivery across Pakistan.</li>
            <li>Order confirmation via SMS and call; non-response within 3 days cancels the order.</li>
            <li>Tracking information provided post-confirmation.</li>
            <li>Delivery may be delayed due to unforeseen conditions (e.g., floods, political instability).</li>
            <li>Accurate shipping information is required to avoid delays or returns.</li>
            <li>Packaging fliers cannot be opened before payment.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Payment Methods</motion.h2>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Online payments via bank accounts.</li>
            <li>Installments available for most products.</li>
            <li>Cash on Delivery (COD) option.</li>
            <li>Credit/debit card payments (5% partial or full payment).</li>
            <li>Full COD unavailable for orders above PKR 100,000.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Contact Us</motion.h2>
          <motion.div className="space-y-4" variants={fadeInUp}>
            <p className="text-lg text-gray-600 flex items-center">
              <Phone className="text-red-600 mr-2" size={20} />
              <a href="tel:+923006530063" className="text-red-600 hover:underline">+923006530063</a>
            </p>
            <p className="text-lg text-gray-600 flex items-center">
              <Mail className="text-red-600 mr-2" size={20} />
              <a href="mailto:raeesmalls1@gmail.com" className="text-red-600 hover:underline">raeesmalls1@gmail.com</a>
            </p>
            <Button
              variant="outline"
              size="medium"
              as="a"
              href="https://wa.me/923006530063?text=Hello%20Raees%20Malls%20Support"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default RefundShipping;
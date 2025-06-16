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

const ReturnPolicy = () => {
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
            Return Policy
          </motion.h1>
          <motion.p className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto mb-8" variants={fadeInUp}>
            Worry Less, Shop More – Explore Raees Malls’ Simple and Convenient Return Process
          </motion.p>
        </div>
      </motion.section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Return Policy Overview</motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            You may request a return within 14 days if your device is damaged, incorrect, incomplete, or missing at delivery. Returns are subject to our policy, and reshipping costs are the customer’s responsibility.
          </motion.p>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>“Change of mind” returns are not accepted.</li>
            <li>Prior approval is required; unapproved returns are not accepted.</li>
            <li>Brand-new devices with visible issues (e.g., removed seal) must be reported within 24 hours.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Valid Causes for Return</motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Returns are accepted if the device is:
          </motion.p>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Physically damaged, broken, defective, or water-damaged.</li>
            <li>Incorrect (wrong device, size, or color).</li>
            <li>Different from the advertised description.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Return Conditions</motion.h2>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Provide an unboxing video as proof of condition upon receipt.</li>
            <li>Device must be unused, unharmed, and include all accessories, tags, manuals, and invoices.</li>
            <li>Return in original, undamaged packaging without tape or stickers.</li>
            <li>Include order number and return tracking ID on the package.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Processing Your Return</motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            To initiate a return, contact our customer support team with:
          </motion.p>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>A detailed explanation of the issue.</li>
            <li>A video of the issue, uploaded to a cloud service, with the link shared.</li>
            <li>An unboxing video of the packaging and box.</li>
          </motion.ul>
          <motion.p className="text-lg text-gray-600 mt-4" variants={fadeInUp}>
            Email these details to{' '}
            <a href="mailto:raeesmalls1@gmail.com" className="text-red-600 hover:underline">raeesmalls1@gmail.com</a>.
          </motion.p>
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

export default ReturnPolicy;
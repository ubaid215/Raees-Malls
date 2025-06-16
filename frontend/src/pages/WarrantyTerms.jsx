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

const WarrantyTerms = () => {
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
            Warranty & Terms
          </motion.h1>
          <motion.p className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto mb-8" variants={fadeInUp}>
            Transparency & Trust with Raees Malls – Shop Worry-Free
          </motion.p>
        </div>
      </motion.section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Warranty</motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Raees Malls offers warranties provided by sellers, which vary by product. For inquiries, contact our support team.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Brand-New Phones</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Brand-new smartphones come with a 12-month manufacturer warranty. For issues not caused by the owner, visit the manufacturer’s official service center.
          </motion.p>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            <strong>Note:</strong> Record an unboxing video to avoid ambiguity during warranty claims.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Non-Applicable Warranty Conditions</motion.h3>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Physical damage (e.g., cracked screens).</li>
            <li>Unauthorized modifications or repairs.</li>
            <li>Water damage.</li>
            <li>Bent devices.</li>
            <li>Unauthorized software use (e.g., rooting).</li>
            <li>Normal wear and tear.</li>
            <li>Accidental damage (e.g., drops).</li>
            <li>Excessive force on components.</li>
            <li>Prior repairs negating the warranty.</li>
          </motion.ul>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Before Claiming Warranty</motion.h3>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Return in original packaging with warranty seal and accessories.</li>
            <li>Back up data and wipe personal information.</li>
            <li>Remove all locks (screen, app).</li>
            <li>Verify no physical damage or port issues.</li>
            <li>Obtain an RMA number from customer service.</li>
            <li>Keep shipment documents and tracking details.</li>
            <li>Follow up with customer service post-shipment.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Terms and Conditions</motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            By using Raees Malls, you agree to these terms. Non-compliance may result in termination of access.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Account Creation</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Provide accurate name, email, and contact information. Keep your password secure and notify us of unauthorized access.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Use of Site</motion.h3>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Comply with laws and regulations.</li>
            <li>Do not infringe intellectual property.</li>
            <li>Avoid transmitting harmful code.</li>
            <li>Refrain from spamming or harassing others.</li>
            <li>No unauthorized commercial use.</li>
          </motion.ul>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Product Availability & Pricing</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            We strive for accuracy but may offer refunds or alternatives if products are unavailable. Prices may fluctuate based on market conditions.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Orders & Payments</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Orders are confirmed via call and email. We accept bank transfers, cards, and COD. See{' '}
            <a href="/refund-shipping" className="text-red-600 hover:underline">Refund & Shipping</a> for details.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Shipping & Delivery</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Free shipping on all orders, delivered within 3-5 business days. Open Parcel available in select cities.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Returns & Refunds</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            14-day return policy for used phones; brand-new phones have manufacturer warranties. See{' '}
            <a href="/return-policy" className="text-red-600 hover:underline">Return Policy</a> and{' '}
            <a href="/refund-shipping" className="text-red-600 hover:underline">Refund & Shipping</a>.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Order Cancellation</motion.h3>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Vendor/shopkeeper orders.</li>
            <li>Multiple orders.</li>
            <li>Product unavailability.</li>
            <li>Suspicious activity.</li>
            <li>Incomplete or incorrect address.</li>
            <li>Failed payment.</li>
            <li>Non-response within 3 days.</li>
            <li>Price fluctuations.</li>
          </motion.ul>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Intellectual Property</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            All content is protected by copyright. Unauthorized use is prohibited.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Limitation of Liability</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Raees Malls is not liable for damages arising from site use or purchased products.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Governing Law</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Governed by Pakistani law.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Dispute Resolution</motion.h3>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            Disputes will be resolved through arbitration in Faisalabad, with jurisdiction in Faisalabad courts.
          </motion.p>
          <motion.h3 className="text-lg font-semibold text-gray-800 mb-2" variants={fadeInUp}>Additional Terms</motion.h3>
          <motion.ul className="list-disc pl-6 text-lg text-gray-600 space-y-2" variants={fadeInUp}>
            <li>Use the site for lawful purposes.</li>
            <li>Avoid posting illegal or defamatory content.</li>
            <li>Indemnify Raees Malls for losses due to violations.</li>
            <li>Terms may be modified without notice.</li>
          </motion.ul>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerChildren}>
          <motion.h2 className="text-2xl font-semibold text-gray-900 mb-4" variants={fadeInUp}>Contact Us</motion.h2>
          <motion.div className="space-y-4" variants={fadeInUp}>
            <p className="text-lg text-grey-600 flex items-center">
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

export default WarrantyTerms;
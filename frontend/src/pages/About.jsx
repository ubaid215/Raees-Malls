import React from 'react';
import { Loader2, ShoppingBag, Globe, Shield, Recycle, Truck, Star, CheckCircle, Heart, Smartphone, Package, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Button component
const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    outline: 'border border-red-300 hover:bg-red-50 text-gray-700 focus:ring-red-500',
    ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-red-500',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
  };

  const sizeStyles = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`
        rounded-md font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-70 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${fullWidth ? 'w-full' : 'w-auto'}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
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
    </button>
  );
};

// Card component
const Card = ({ children, className = '' }) => (
  <div
    className={`
      bg-white rounded-lg shadow-lg p-6 transition-transform duration-300 hover:shadow-xl hover:-translate-y-1
      ${className}
    `}
  >
    {children}
  </div>
);

const About = () => {
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <motion.section
        className="relative bg-gradient-to-r from-red-600 to-red-800 py-20 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >
        <div className="absolute inset-0 bg-pattern opacity-10" style={{ backgroundImage: 'url(/pattern.png)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            className="text-4xl sm:text-5xl font-extrabold text-white mb-4"
            variants={fadeInUp}
          >
            About Raees Malls
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto mb-8"
            variants={fadeInUp}
          >
            Your trusted marketplace for refurbished mobile phones, laptops, and tech gadgets
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Button
              variant="secondary"
              size="large"
              className="bg-white text-red-600 hover:bg-red-50 absolute bottom-2 left-[50%] transform -translate-x-[50%] -translate-y-[50%]"
              as="a"
              href="/products"
            >
              Shop Now
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* About Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Introduction */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center"
            variants={fadeInUp}
          >
            About Raees Malls
          </motion.h2>
          <motion.div className="max-w-3xl mx-auto text-center" variants={fadeInUp}>
            <p className="text-lg text-gray-600">
              We are a dependable marketplace for refurbished mobile phones, laptops, and other tech gadgets, committed to quality and sustainability.
            </p>
          </motion.div>
        </motion.div>

        {/* How We Make a Difference */}
        <motion.div
          className="grid md:grid-cols-2 gap-12 items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.div variants={fadeInUp}>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">How We Make a Difference</h3>
            <p className="text-gray-600 text-lg mb-4">
              We promote recycling and reusing old, pre-owned, and defective handsets to reduce e-waste. By selling refurbished mobile phones, we help protect the environment while offering top-notch devices at affordable prices.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <Card className="p-6 text-center">
                <ShoppingBag className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-2">1000+ Products</h4>
                <p className="text-gray-600 text-sm">An enormous range from top brands.</p>
              </Card>
              <Card className="p-6 text-center">
                <Globe className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-2">100+ Brands</h4>
                <p className="text-gray-600 text-sm">A versatile collection for your needs.</p>
              </Card>
              <Card className="p-6 text-center">
                <Package className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-2">10+ Categories</h4>
                <p className="text-gray-600 text-sm">Mobiles, laptops, tablets, smartwatches, and more.</p>
              </Card>
              <Card className="p-6 text-center">
                <CheckCircle className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-2">1000+ Successful Orders</h4>
                <p className="text-gray-600 text-sm">Trusted by over 1000 satisfied customers.</p>
              </Card>
            </div>
          </motion.div>
          <motion.div
            className="relative rounded-xl overflow-hidden shadow-2xl"
            variants={fadeInUp}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src="/recycling-tech.jpg"
              alt="Recycling Technology"
              className="w-full h-64 sm:h-80 object-cover"
              onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1697545806245-9795b6056141?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </motion.div>
        </motion.div>

        {/* Our Business Model */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h3
            className="text-2xl font-semibold text-gray-900 mb-6 text-center"
            variants={fadeInUp}
          >
            Our Business Model
          </motion.h3>
          <motion.div className="max-w-3xl mx-auto text-center" variants={fadeInUp}>
            <p className="text-lg text-gray-600 mb-4">
              With over 50 million tons of e-waste produced annually, we aim to reduce this by promoting refurbished mobile phones, cutting the demand for new devices and minimizing their carbon footprint.
            </p>
          </motion.div>
        </motion.div>

        {/* Why Choose Raees Malls */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h3
            className="text-2xl font-semibold text-gray-900 mb-8 text-center"
            variants={fadeInUp}
          >
            Why Choose Raees Malls?
          </motion.h3>
          <motion.p
            className="text-lg text-gray-600 max-w-3xl mx-auto mb-8 text-center"
            variants={fadeInUp}
          >
            We stand out in Pakistan’s market with superior customer service, commitment to quality, and some of the lowest prices available.
          </motion.p>
          <motion.div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8" variants={staggerChildren}>
            <motion.div variants={fadeInUp}>
              <Card className="p-8">
                <Star className="text-red-600 mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Great Value</h4>
                <p className="text-gray-600 text-sm">
                  Competitive prices ensure you get the best deal on mobile phones and gadgets in Pakistan.
                </p>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="p-8">
                <Globe className="text-red-600 mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Dependable Vendor Network</h4>
                <p className="text-gray-600 text-sm">
                  90% of our stock is sourced locally through reliable partners, ensuring consistent supply.
                </p>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="p-8">
                <Truck className="text-red-600 mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Free Express Shipping</h4>
                <p className="text-gray-600 text-sm">
                  Enjoy free courier delivery anywhere in Pakistan, from metros to suburbs.
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Price Beat Guarantee */}
        <motion.div
          className="bg-white py-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h3
            className="text-2xl font-semibold text-gray-900 mb-8 text-center"
            variants={fadeInUp}
          >
            Price Beat Guarantee
          </motion.h3>
          <motion.div className="max-w-3xl mx-auto text-center space-y-6" variants={fadeInUp}>
            <p className="text-lg text-gray-600">
              By promoting refurbished devices, we reduce pollution and offer smartphones, tablets, laptops, smartwatches, and more at some of the lowest prices in Pakistan.
            </p>
            <ul className="text-gray-600 text-left max-w-md mx-auto space-y-2">
              <li className="flex items-center"><CheckCircle className="text-red-600 mr-2" size={20} /> 1-Year warranty for brand-new mobile phones</li>
              <li className="flex items-center"><CheckCircle className="text-red-600 mr-2" size={20} /> Similar cosmetic condition</li>
              <li className="flex items-center"><CheckCircle className="text-red-600 mr-2" size={20} /> Free shipping nationwide</li>
              <li className="flex items-center"><CheckCircle className="text-red-600 mr-2" size={20} /> Open parcel service (Faisalabad only)</li>
              <li className="flex items-center"><CheckCircle className="text-red-600 mr-2" size={20} /> Self pick-up option</li>
              <li className="flex items-center"><CheckCircle className="text-red-600 mr-2" size={20} /> Reliable customer support</li>
            </ul>
            <p className="text-lg text-gray-600">
              Our low prices are driven by our commitment to affordability, ensuring everyone can access amazing devices.
            </p>
          </motion.div>
        </motion.div>

        {/* Additional Services */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h3
            className="text-2xl font-semibold text-gray-900 mb-8 text-center"
            variants={fadeInUp}
          >
            Shop with Confidence
          </motion.h3>
          <motion.div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8" variants={staggerChildren}>
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center">
                <Shield className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">14-Day Money-Back Guarantee</h4>
                <p className="text-gray-600 text-sm">
                  Return faulty products within 14 days for a full refund. 
                </p>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center">
                <Star className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">12-Month Warranty</h4>
                <p className="text-gray-600 text-sm">
                  Enjoy peace of mind with a 12-month warranty on all brand-new mobile phones.
                </p>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center">
                <Heart className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Proudly Pakistani</h4>
                <p className="text-gray-600 text-sm">
                  A Pakistani-owned business serving with passion and local pride.
                </p>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center">
                <CheckCircle className="text-red-600 mx-auto mb-4" size={36} />
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Quality Assurance</h4>
                <p className="text-gray-600 text-sm">
                  Every device is rigorously tested by our in-house engineers using Blancco diagnostics.
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* FAQs */}
        <motion.div
          className="bg-white py-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center"
            variants={fadeInUp}
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.div className="max-w-3xl mx-auto space-y-4" variants={fadeInUp}>
            <p className="text-lg text-gray-600 text-center mb-8">
              We know you may have questions. Here are answers to some common queries.
            </p>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Raees Malls Shop Questions</h3>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">What Payment Methods Does Raees Malls Offer?</summary>
              <p className="text-gray-600 mt-2">
                We offer Debit Visa Card/Mastercard, bank transfer, cash on delivery (COD), Credit Cards, and installment options for your convenience.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">How Will Raees Malls Deliver My Device?</summary>
              <p className="text-gray-600 mt-2">
                We partner with reputable courier services for nationwide delivery. In Faisalabad, our own riders are operational.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">What Products Does Raees Malls Offer?</summary>
              <p className="text-gray-600 mt-2">
                We offer brand-new and refurbished tech gadgets, including mobile phones, laptops, tablets, and smartwatches, sourced from certified sellers.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">What Is Raees Malls?</summary>
              <p className="text-gray-600 mt-2">
                Raees Malls is an online store offering mobile phones, accessories, and smart devices with free delivery across Pakistan at competitive prices.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Does Raees Malls Have a Physical Store?</summary>
              <p className="text-gray-600 mt-2">
                We don’t have a physical store, but self-pickup is available from our office in Faisalabad.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Can I Return the Device to Raees Malls?</summary>
              <p className="text-gray-600 mt-2">
                Yes, you can return faulty devices within 14 days for a refund, ensuring customer satisfaction.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">How Many Charges Does Raees Malls Take for Delivery?</summary>
              <p className="text-gray-600 mt-2">
                Shipping is free nationwide, with no additional delivery charges.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Does Raees Malls Sell Brand-New Mobile Phones?</summary>
              <p className="text-gray-600 mt-2">
                Yes, we sell brand-new mobile phones at some of the best prices in Pakistan.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Does Raees Malls Sell the Latest Mobile Phones?</summary>
              <p className="text-gray-600 mt-2">
                Yes, we stock the latest models from brands like Samsung, Oppo, Infinix, Apple, and more, updated monthly.
              </p>
            </details>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Customer Support Questions</h3>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">What Is the Response Time at Raees Malls?</summary>
              <p className="text-gray-600 mt-2">
                Phone and chat support are available 24/7 with instant responses. Email responses may take up to 24 hours.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">How to Stay Updated on Raees Malls Promotions and Discounts?</summary>
              <p className="text-gray-600 mt-2">
                Follow us on{' '}
                <a href="https://facebook.com/raeesmalls" className="text-red-600 hover:underline">Facebook</a>,{' '}
                <a href="https://instagram.com/raeesmalls" className="text-red-600 hover:underline">Instagram</a>,{' '}
                <a href="https://youtube.com" className="text-red-600 hover:underline">YouTube</a>, and{' '}
                <a href="https://twitter.com" className="text-red-600 hover:underline">Twitter</a> for updates.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Does Raees Malls Provide Phones in Every Budget Range?</summary>
              <p className="text-gray-600 mt-2">
                Yes, we offer devices at multiple price points. Use the price filter on our categories to find budget-friendly options.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">How Can I Complain to Raees Malls?</summary>
              <p className="text-gray-600 mt-2">
                Contact us via phone at <a href="tel:03006530063" className="text-red-600 hover:underline">0300-6530063</a>, live chat on our site, or email at{' '}
                <a href="mailto:raeesmalls1@gmail.com" className="text-red-600 hover:underline">raeesmalls1@gmail.com</a>.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Can I Sell on Raees Malls?</summary>
              <p className="text-gray-600 mt-2">
                Individual consumers cannot sell on our platform, but vendors can contact us to sell smart devices.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Why Is Raees Malls the Best Brand-New Mobile Phone Seller in Pakistan?</summary>
              <p className="text-gray-600 mt-2">
                We offer an extensive range of brand-new devices from certified vendors at competitive prices, endorsed by celebrities like Qari Ibtsam Ilahi Zahir, Misbha ul Haq, Shoaib Akhtar, and Younas Khan.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Can I Trust Raees Malls?</summary>
              <p className="text-gray-600 mt-2">
                As a trusted seller in Pakistan, we’re endorsed by top celebrities and have a strong presence on social media, ensuring reliability.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow-md p-4">
              <summary className="text-lg font-medium text-gray-800 cursor-pointer">Does Raees Malls Ship Overseas?</summary>
              <p className="text-gray-600 mt-2">
                We don’t ship overseas but operate in Pakistan, Australia, UAE, and England.
              </p>
            </details>
          </motion.div>
        </motion.div>
      </section>

      {/* Location */}
      <motion.section
        className="bg-white py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerChildren}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center"
            variants={fadeInUp}
          >
            Visit Us
          </motion.h2>
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-start"
            variants={staggerChildren}
          >
            <motion.div variants={fadeInUp}>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Our Location</h3>
              <p className="text-gray-600 text-lg mb-4">
                Masjid Bazar, Opposite Jamia Masjid<br />
                Jaranwala, Pakistan
              </p>
              <p className="text-gray-600 text-lg mb-6">
                <strong>Store Hours:</strong><br />
                Monday - Sunday: 9:00 AM - 9:00 PM<br />
              </p>
              <Button
                variant="outline"
                size="medium"
                className="mt-4"
                as="a"
                href="https://maps.app.goo.gl/VEqNrovGVVdPE2Lr9"
                target="_blank"
              >
                Get Directions
              </Button>
            </motion.div>
            <motion.div
              className="h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden shadow-lg"
              variants={fadeInUp}
            >
              <iframe
                title="Raees Malls Location"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src="https://maps.google.com/maps?q=Masjid+Bazar+Opposite+Jamia+Masjid+Jaranwala&output=embed"
              ></iframe>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default About;
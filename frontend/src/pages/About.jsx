import React from 'react';
import { Loader2, ShoppingBag, Globe, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

// Your Button component (from April 15, 2025)
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

// Assumed Card component (modern, aligned with Button style)
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
            Your trusted destination for premium mobile accessories and imported products
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          className="grid md:grid-cols-2 gap-12 items-center mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.div variants={fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Our Story
            </h2>
            <p className="text-gray-600 text-lg mb-4">
              Founded in the heart of Jaranwala, Raees Malls is dedicated to bringing you the finest mobile accessories from around the globe. Since our inception, we’ve been passionate about quality, style, and customer satisfaction.
            </p>
            <p className="text-gray-600 text-lg mb-6">
              Our curated collection of imported products ensures durability and elegance at competitive prices. From protective cases to cutting-edge chargers, we’re here to enhance your mobile experience.
            </p>
            <Button
              variant="primary"
              size="medium"
              className="mt-4"
              as="a"
              href="/products"
            >
              Explore Our Products
            </Button>
          </motion.div>
          <motion.div
            className="relative rounded-xl overflow-hidden shadow-2xl"
            variants={fadeInUp}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src="/store-interior.jpg"
              alt="Raees Malls Store"
              className="w-full h-64 sm:h-80 object-cover"
              onError={(e) => (e.currentTarget.src = 'https://plus.unsplash.com/premium_photo-1663045725034-b2ab0156dae6?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8bW9iaWxlJTIwc3RvcmV8ZW58MHx8MHx8fDA%3D')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </motion.div>
        </motion.div>

        {/* Values */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center"
            variants={fadeInUp}
          >
            Why Choose Us
          </motion.h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center">
                <ShoppingBag className="text-red-600 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Wide Selection</h3>
                <p className="text-gray-600">
                  Discover hundreds of products from top international brands, tailored to all your mobile accessory needs.
                </p>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center">
                <Globe className="text-red-600 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Imported Quality</h3>
                <p className="text-gray-600">
                  Sourced directly from global manufacturers, our products guarantee authenticity and superior craftsmanship.
                </p>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="p-8 text-center">
                <Shield className="text-red-600 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Customer Trust</h3>
                <p className="text-gray-600">
                  Built on honest practices and reliable products, we’ve earned the trust of our community since day one.
                </p>
              </Card>
            </motion.div>
          </div>
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
                Monday - Sunday: 9:00 AM -9:00 PM<br />
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
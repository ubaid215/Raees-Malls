import React, { useState } from 'react';
import { Loader2, MapPin, Phone, Clock, Mail, MessageCircle } from 'lucide-react';

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
          <span>Redirecting to WhatsApp...</span>
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

// Assumed Card component (aligned with About page)
const Card = ({ children, className = '' }) => (
  <div
    className={`
      bg-white rounded-lg shadow-md p-6 transition-transform duration-300 hover:shadow-lg hover:-translate-y-1
      ${className}
    `}
  >
    {children}
  </div>
);

// Assumed Input component (modern, with animation)
const Input = ({
  label,
  name,
  type = 'text',
  as = 'input',
  value,
  onChange,
  required,
  rows,
  className = '',
}) => {
  const Component = as;
  return (
    <div className="relative">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <Component
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        rows={rows}
        className={`
          w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500
          transition-all duration-200 hover:border-red-300
          ${className}
        `}
      />
    </div>
  );
};

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // WhatsApp number (without + sign, with country code)
  const whatsappNumber = '923006530063';

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      alert('Please fill in all required fields (Name, Email, and Message)');
      return;
    }

    setIsLoading(true);

    try {
      // Create WhatsApp message
      const whatsappMessage = `Hello Raees Malls!

*New Contact Form Submission*

*Name:* ${formData.name}
*Email:* ${formData.email}
${formData.phone ? `*Phone:* ${formData.phone}` : ''}

*Message:*
${formData.message}

---
Sent via Raees Malls Contact Form`;

      // Encode the message for URL
      const encodedMessage = encodeURIComponent(whatsappMessage);
      
      // Create WhatsApp URL
      const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Open WhatsApp
      window.open(whatsappURL, '_blank');
      
      // Clear form after successful redirect
      setFormData({ name: '', email: '', phone: '', message: '' });
      
    } catch (error) {
      console.error('Failed to redirect to WhatsApp:', error);
      alert('Failed to open WhatsApp. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-red-600 to-red-800 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" style={{ backgroundImage: 'url(/pattern.png)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Contact Raees Malls
          </h1>
          <p className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto mb-8">
            We're here to assist with all your mobile accessory needs
          </p>
          <Button
            variant="secondary"
            size="large"
            className="bg-white text-red-600 hover:bg-red-50 absolute bottom-3 left-[50%] transform -translate-x-[50%] -translate-y-[50%]"
            onClick={() => document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' })}
          >
            Get in Touch
          </Button>
        </div>
      </section>

      {/* Contact Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="lg:sticky lg:top-4" id="contact-form">
            <Card className="p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <MessageCircle className="text-green-600 mr-2" size={20} />
                  <p className="text-green-800 text-sm">
                    Your message will be sent directly to our WhatsApp for faster response!
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <Input
                  label="Your Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Phone Number (Optional)"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
                <Input
                  label="Your Message"
                  name="message"
                  as="textarea"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
                <Button
                  onClick={handleSubmit}
                  variant="primary"
                  size="large"
                  fullWidth
                  isLoading={isLoading}
                  icon={MessageCircle}
                >
                  Send via WhatsApp
                </Button>
              </div>
            </Card>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact Information</h2>
            <Card className="p-6">
              <div className="flex items-start">
                <MapPin className="text-red-600 mr-4 mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Address</h3>
                  <p className="text-gray-600">
                    <span className='font-semibold italic text-red-600'>Head Office</span> <br />
                    <span className='text-xl font-mono font-bold'>Raees Traders</span><br />
                    Opposite Ayesha Masjid Motor Market Jhang Road Faisalabad <hr /> <br />
                    <span className='font-semibold italic text-red-600'>Sub Office</span><br />
                    <span className='text-xl font-mono font-bold'>Raees Mobiles</span><br />
                    Masjid Bazar Opposite Jamia Masjid Jaranwala <hr /> 

                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start">
                <Phone className="text-red-600 mr-4 mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Phone Numbers</h3>
                  <p className="text-gray-600 mb-1">
                    <a href="tel:03007246696" className="hover:text-red-600">
                      0300-7246696
                    </a>
                  </p>
                  <p className="text-gray-600">
                    <a href="tel:03006530063" className="hover:text-red-600">
                      0300-6530063
                    </a>
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start">
                <MessageCircle className="text-red-600 mr-4 mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">WhatsApp</h3>
                  <p className="text-gray-600">
                    Reach us on WhatsApp:{' '}
                    <a
                      href="https://wa.me/923006530063"
                      className="hover:text-red-600 font-semibold"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      0300-6530063
                    </a>
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start">
                <Mail className="text-red-600 mr-4 mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">
                    <a href="mailto:raeesmalls1@gmail.com" className="hover:text-red-600">
                      raeesmalls1@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start">
                <Clock className="text-red-600 mr-4 mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Business Hours</h3>
                  <p className="text-gray-600 mb-1">Monday - Saturday: 9:00 AM - 9:00 PM</p>
                  <p className="text-gray-600">Sunday: 9:00 AM - 10:00 PM</p>
                </div>
              </div>
            </Card>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a
                  href="https://facebook.com/raeesmalls"
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <span className="sr-only">Facebook</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://instagram.com/raeesmalls"
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://wa.me/923006530063"
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <span className="sr-only">WhatsApp</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-6.29 3.01c-.173.246-.5.409-.928.409-.108 0-.215-.008-.322-.025-.173-.017-.406-.066-.585-.281-.173-.212-.692-.733-.941-.992-.247-.26-.413-.306-.578-.306-.148 0-.297.025-.421.074-.124.05-.272.125-.396.181-.124.057-.248.074-.372.074-.124 0-.248-.033-.347-.148-.099-.116-.396-.446-.396-.843 0-.397.198-.76.446-1.02.247-.26.545-.446.842-.595.297-.149.545-.223.793-.223.248 0 .396.025.545.124.149.099.297.264.421.43.124.166.248.347.347.446.099.099.198.124.347.074.149-.05.793-.306 1.188-.446.396-.14.693-.083.892.05.198.132.793.694.892.843.099.149.173.231.074.446-.099.214-.198.314-.347.463-.149.149-.297.306-.446.512zM12 2a10 10 0 00-8.617 15.06L2 22l4.94-1.383A10 10 0 1012 2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
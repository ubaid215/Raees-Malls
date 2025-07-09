import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/images/Raees Malls.png';

const Footer = () => {
  const footerLinks = [
    {
      title: 'Shop',
      links: [
        { name: 'All Products', path: '/products' },
        { name: 'New Arrivals', path: '/recent-products' },
        { name: 'Featured', path: '/featured-products' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', path: '/about' },
        { name: 'Contact', path: '/contact' },
      ],
    },
    {
      title: 'Support',
      links: [
        { name: 'WhatsApp: +923006530063', path: 'https://wa.me/923006530063' },
        { name: 'Complain : +923007246696', path: 'https://wa.me/923007246696' },
        { name: 'Shipping Info', path: '/refund-shipping' },
        { name: 'Returns', path: '/return-policy' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', path: '/privacy-policy' },
        { name: 'Terms & Conditions', path: '/warranty-terms' },
        { name: 'Return Policy', path: '/return-policy' },
        { name: 'Refund & Shipping', path: '/refund-shipping' },
      ],
    },
  ];

  return (
    <footer className="bg-white border-t shadow-sm px-4 lg:px-5">
      <div className="container mx-auto px-4 py-6 lg:py-8">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          
          {/* Logo and Description - Takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex items-center mb-3">
              <img src={Logo} alt="Raees Malls Logo" className="h-7 w-auto" />
            </Link>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xs">
              Your one-stop shop for all mobile accessories and gadgets.
            </p>
            
            {/* Social Media - Mobile/Tablet */}
            <div className="flex space-x-4 mt-4 lg:hidden">
              <a href="https://www.facebook.com/share/1L8iaCqwh5/" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://www.instagram.com/raeesmalls?igsh=MTQ0dHc4ZmxqOWttNg==" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://x.com/RaeesMalls?t=GUKlHdeBWzBWqejDe0PnXQ&s=09" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>

          {/* Footer Links - Takes 3 columns on large screens, 2 columns on mobile */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {footerLinks.map((section) => (
              <div key={section.title} className="min-w-0">
                <h3 className="text-xs font-semibold text-red-600 tracking-wider uppercase mb-2 lg:mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1 lg:space-y-2">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      {link.path.startsWith('http') ? (
                        <a
                          href={link.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs lg:text-sm text-gray-600 hover:text-red-600 transition-colors line-clamp-1"
                          title={link.name}
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          to={link.path}
                          className="text-xs lg:text-sm text-gray-600 hover:text-red-600 transition-colors line-clamp-1"
                          title={link.name}
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter - Takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <h3 className="text-xs font-semibold text-red-600 tracking-wider uppercase mb-2 lg:mb-3">
              Newsletter
            </h3>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Get special offers & updates
            </p>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="px-3 py-2 border border-gray-200 rounded-md text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
              <button className="bg-red-600 text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
            
            {/* Social Media - Desktop */}
            <div className="hidden lg:flex space-x-3 mt-4">
              <a href="https://www.facebook.com/share/1L8iaCqwh5/" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://www.instagram.com/raeesmalls?igsh=MTQ0dHc4ZmxqOWttNg==" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://x.com/RaeesMalls?t=GUKlHdeBWzBWqejDe0PnXQ&s=09" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright - Minimal spacing */}
        <div className="pt-4 mt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Raees Malls. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
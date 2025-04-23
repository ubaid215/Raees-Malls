import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

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
        { name: 'Help Center', path: '/support' },
        { name: 'Shipping Info', path: '/shipping' },
        { name: 'Returns', path: '/returns' },
      ],
    },
  ];

  return (
    <footer className="bg-[#232F3F] border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center">
              <Logo className="h-8 w-auto" />
            </Link>
            <p className="mt-4 text-sm text-white">
              Your one-stop shop for all mobile accessories and gadgets.
            </p>
          </div>

          {/* Footer links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-red-600 tracking-wider uppercase">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-sm text-zinc-50 hover:text-red-600"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-50 tracking-wider uppercase">
              Newsletter
            </h3>
            <p className="mt-4 text-sm text-gray-50">
              Subscribe to get special offers and updates
            </p>
            <div className="mt-4 flex">
              <input
                type="email"
                placeholder="Your email"
                className="px-3 py-2 border border-gray-300 rounded-l-md text-sm w-full focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button className="bg-red-600 text-white px-4 py-2 rounded-r-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-red-500 text-center">
            &copy; {new Date().getFullYear()} Raees Malls. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
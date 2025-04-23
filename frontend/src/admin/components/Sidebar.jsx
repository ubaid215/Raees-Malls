import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome,
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiDollarSign,
  FiPieChart,
} from 'react-icons/fi';
import { History, Image, ImagePlus, ListChecks, ShoppingBasket, UserCircle } from 'lucide-react';

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();

  const navSections = [
    {
      title: 'ANALYTICS',
      items: [
        { path: '/admin', icon: FiHome, label: 'Dashboard' },
        { path: '/admin/performance', icon: FiTrendingUp, label: 'Performance' },
        { path: '/admin/category', icon: ListChecks, label: 'Categories' },
        { path: '/admin/banner-upload', icon: Image, label: 'Banner' },
      ]
    },
    
    {
      title: 'SHOP',
      items: [
        { path: '/admin/add-products', icon: FiShoppingBag, label: 'ProductForm' },
        { path: '/admin/inventory', icon: ShoppingBasket, label: 'All Products' },
        { path: '/admin/hero-slider', icon: ImagePlus, label: 'Hero Images' },
        { path: '/admin/orders', icon: FiDollarSign, label: 'Orders' },
        { path: '/admin/orders-history', icon: History, label: 'Orders History' },
        { path: '/admin/profile', icon: UserCircle, label: 'Profile' }
      ]
    }
  ];

  return (
    <div className={`h-full bg-white border-r border-gray-200 flex flex-col ${isExpanded ? 'w-64' : 'w-20'} transition-all duration-300`}>
      {/* Logo / Toggle */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {isExpanded ? (
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        ) : (
          <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center">
            <FiHome className="text-white" />
          </div>
        )}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {navSections.map((section, index) => (
          <div key={index} className="mb-6">
            {isExpanded && (
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
            )}
            <ul>
              {section.items.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-2.5 mx-2 rounded-md transition-colors
                      ${location.pathname === item.path ? 
                        'bg-red-50 text-red-600' : 
                        'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className={`h-5 w-5 ${location.pathname === item.path ? 'text-red-600' : 'text-gray-400'}`} />
                    {isExpanded && (
                      <>
                        <span className="ml-3">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {item.count && (
                          <span className="ml-auto bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* User Profile (Collapsed shows just avatar) */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            {/* Replace with actual avatar */}
            <FiUsers className="text-gray-600" />
          </div>
          {isExpanded && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Admin User</p>
              <p className="text-xs text-gray-500">admin@raeesmalls.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
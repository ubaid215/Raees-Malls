import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FiHome,
  FiShoppingBag,
  FiDollarSign,
  FiLogOut,
} from 'react-icons/fi';
import { History, Image, ImagePlus, ListChecks, ShoppingBasket, UserCircle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useOrder } from '../../context/OrderContext';
import socketService from '../../services/socketService';

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logoutAdmin } = useAdminAuth();
  const { orders } = useOrder();

  // Calculate pending orders count
  const pendingOrdersCount = (orders || []).filter(
    (order) => order && order.status === 'pending'
  ).length;

  useEffect(() => {
    const setupSocket = () => {
      try {
        if (admin && !socketService.getConnectionState()) {
          socketService.connect(admin._id, admin.role);
        }

        // Listen for new orders
        socketService.on('orderCreated', (newOrder) => {
          if (newOrder && newOrder.orderId) {
            setNewOrderCount(prev => prev + 1);
          }
        });

        // Reset count when order status is updated
        socketService.on('orderStatusUpdated', (updatedOrder) => {
          if (updatedOrder && updatedOrder.status !== 'pending') {
            setNewOrderCount(prev => Math.max(0, prev - 1));
          }
        });

      } catch (err) {
        console.error('Sidebar: Socket setup error:', err);
      }
    };

    if (admin) {
      setupSocket();
    }

    return () => {
      socketService.off('orderCreated');
      socketService.off('orderStatusUpdated');
    };
  }, [admin]);

  // Reset new order count when visiting orders page
  useEffect(() => {
    if (location.pathname === '/admin/orders') {
      setNewOrderCount(0);
    }
  }, [location.pathname]);

  const navSections = [
    {
      title: 'ANALYTICS',
      items: [
        { path: '/admin', icon: FiHome, label: 'Dashboard' },
        { path: '/admin/category', icon: ListChecks, label: 'Categories' },
        { path: '/admin/banner-upload', icon: Image, label: 'Banner' },
      ]
    },
    {
      title: 'SHOP',
      items: [
        { path: '/admin/add-products', icon: FiShoppingBag, label: 'ProductForm' },
        { path: '/admin/inventory', icon: ShoppingBasket, label: 'All Products' },
        { 
          path: '/admin/orders', 
          icon: FiDollarSign, 
          label: 'Orders',
          count: newOrderCount > 0 ? newOrderCount : (pendingOrdersCount > 0 ? pendingOrdersCount : null)
        },
      ]
    },
    {
      title: 'PROFILE',
      items: [
        { path: '/admin/profile', icon: UserCircle, label: 'Profile' },
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className={`h-full bg-white border-r border-gray-200 flex flex-col ${isExpanded ? 'w-64' : 'w-20'} transition-all duration-300`}>
      {/* Logo / Toggle */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {isExpanded ? (
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        ) : (
          <div className="w-8 h-8 bg-[#E63946] rounded-md flex items-center justify-center">
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
                    className={`flex items-center px-4 py-2.5 mx-2 rounded-md transition-colors relative
                      ${location.pathname === item.path ? 
                        'bg-[#FFE6E8] text-[#E63946]' : 
                        'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className={`h-5 w-5 ${location.pathname === item.path ? 'text-[#E63946]' : 'text-gray-400'}`} />
                    {isExpanded && (
                      <>
                        <span className="ml-3">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-[#FFE6E8] text-[#E63946] text-xs px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {item.count && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium min-w-[20px] text-center">
                            {item.count > 99 ? '99+' : item.count}
                          </span>
                        )}
                      </>
                    )}
                    {/* Count badge for collapsed sidebar */}
                    {!isExpanded && item.count && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center leading-none">
                        {item.count > 9 ? '9+' : item.count}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Section - Profile and Logout */}
      <div className="mt-auto">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-4 py-3 mx-2 rounded-md text-red-600 hover:bg-red-50 hover:text-red-900 transition-colors`}
        >
          <FiLogOut className="h-5 w-5 text-gray-400" />
          {isExpanded && (
            <span className="ml-3">Logout</span>
          )}
        </button>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <UserCircle className="text-gray-600" />
            </div>
            {isExpanded && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{admin?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{admin?.email || 'N/A'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
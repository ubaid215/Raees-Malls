import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiTrendingUp, 
  FiShoppingBag, 
  FiDollarSign, 
  FiUsers,
  FiPieChart,
  FiCalendar,
  FiPackage,
  FiCreditCard
} from 'react-icons/fi';
import Card from '../../components/core/Card';
import { useOrder } from '../../context/OrderContext';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { orders, fetchAllOrders, loading, error } = useOrder();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Current YYYY-MM
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    products: 0
  });

  // Generate month options (last 12 months)
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7); // YYYY-MM
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  // Fetch and calculate stats for the selected month
  const calculateStats = useCallback(() => {
    if (!orders || orders.length === 0) {
      setStats({ revenue: 0, orders: 0, customers: 0, products: 0 });
      return;
    }

    const filteredOrders = orders.filter(order => {
      if (!order || !order.createdAt) return false;
      return new Date(order.createdAt).toISOString().slice(0, 7) === selectedMonth;
    });

    const revenue = filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const orderCount = filteredOrders.length;
    const uniqueCustomers = new Set(filteredOrders.map(order => order.userId?.email)).size;
    const uniqueProducts = new Set(
      filteredOrders.flatMap(order => (order.items || []).map(item => item.productId?._id))
    ).size;

    setStats({
      revenue,
      orders: orderCount,
      customers: uniqueCustomers,
      products: uniqueProducts
    });
  }, [orders, selectedMonth]);

  // Fetch orders when component mounts or month changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Dashboard: Fetching orders for month:', selectedMonth);
        await fetchAllOrders(1, 100); // Fetch up to 100 orders for simplicity
        calculateStats();
      } catch (err) {
        console.error('Dashboard: Error fetching orders:', err);
        toast.error(err.message || 'Failed to fetch dashboard data');
      }
    };

    fetchData();
  }, [fetchAllOrders, selectedMonth, calculateStats]);

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  // Get recent orders (last 5, sorted by date)
  const recentOrders = (orders || [])
    .filter(order => order && order.orderId && order.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map(order => ({
      id: order.orderId,
      customer: order.userId?.name || 'Unknown',
      amount: order.totalPrice || 0,
      status: order.status || 'unknown',
      date: new Date(order.createdAt).toLocaleDateString()
    }));

  // Calculate percentage change (mocked for now)
  const getPercentageChange = (current, type) => {
    // Mocked percentage changes; replace with actual logic if historical data is available
    const changes = {
      revenue: 12,
      orders: 8,
      customers: 5.2,
      products: 3
    };
    return `+${changes[type]}% from last month`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <div className="flex items-center space-x-2">
          <label htmlFor="month-select" className="text-sm text-gray-600">Select Month:</label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-red-500 focus:border-red-500"
          >
            {getMonthOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue Card */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">{formatPrice(stats.revenue)}</p>
              <p className="text-sm text-green-600 mt-1">{getPercentageChange(stats.revenue, 'revenue')}</p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiDollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        {/* Orders Card */}
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-800">{stats.orders}</p>
              <p className="text-sm text-green-600 mt-1">{getPercentageChange(stats.orders, 'orders')}</p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiShoppingBag className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>

        {/* Customers Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-800">{stats.customers.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">{getPercentageChange(stats.customers, 'customers')}</p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiUsers className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Products Card */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-2xl font-bold text-gray-800">{stats.products}</p>
              <p className="text-sm text-green-600 mt-1">{getPercentageChange(stats.products, 'products')}</p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiPackage className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Second Bento Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Sales Overview</h2>
            <button className="text-sm text-red-600 hover:text-red-800">View Report</button>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <FiTrendingUp className="h-16 w-16 text-gray-300" />
            {/* Replace with actual chart component */}
          </div>
        </Card>

        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
            <button className="text-sm text-red-600 hover:text-red-800">View All</button>
          </div>
          {loading && !orders.length ? (
            <div className="text-center text-gray-600 text-sm">Loading orders...</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center text-gray-600 text-sm">No recent orders</div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">{order.id}</p>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                    <p className="text-xs text-gray-500">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(order.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Third Bento Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Performance */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Top Products</h2>
            <button className="text-sm text-red-600 hover:text-red-800">View All</button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-md mr-4 flex-shrink-0 overflow-hidden">
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <FiPackage className="text-gray-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">Product {item}</h3>
                  <p className="text-sm text-gray-600">${(item * 99).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">{item * 15} sold</p>
                  <p className="text-sm text-green-600">+{item * 5}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Calendar */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Events</h2>
            <button className="text-sm text-red-600 hover:text-red-800">View Calendar</button>
          </div>
          <div className="h-full min-h-[200px] bg-gray-50 rounded-lg flex items-center justify-center">
            <FiCalendar className="h-16 w-16 text-gray-300" />
            {/* Replace with actual calendar component */}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
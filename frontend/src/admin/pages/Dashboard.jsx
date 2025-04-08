import React from 'react';
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

const Dashboard = () => {
  // Mock data - replace with real API calls
  const stats = {
    revenue: 12540,
    orders: 342,
    customers: 1289,
    products: 87
  };

  const recentOrders = [
    { id: '#ORD-001', customer: 'John Doe', amount: 359, status: 'shipped' },
    { id: '#ORD-002', customer: 'Sarah Smith', amount: 249, status: 'processing' },
    { id: '#ORD-003', customer: 'Michael Johnson', amount: 599, status: 'delivered' }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>
      
      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue Card */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">${stats.revenue.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">+12% from last month</p>
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
              <p className="text-sm text-green-600 mt-1">+8% from last month</p>
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
              <p className="text-sm text-green-600 mt-1">+5.2% from last month</p>
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
              <p className="text-sm text-green-600 mt-1">+3 new this week</p>
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
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-800">{order.id}</p>
                  <p className="text-sm text-gray-600">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${order.amount}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
                  {/* Product image placeholder */}
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
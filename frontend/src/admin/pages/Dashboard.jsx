import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiTrendingUp,
  FiShoppingBag,
  FiDollarSign,
  FiUsers,
  FiPieChart,
  FiPackage,
  FiCreditCard,
  FiBarChart2,
  FiActivity,
} from "react-icons/fi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useOrder } from "../../context/OrderContext";
import { toast } from "react-toastify";

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className} transition-all duration-300 hover:shadow-lg`}
  >
    {children}
  </div>
);

const Dashboard = () => {
  const {
    orders,
    loading,
    error,
    fetchAllOrders,
    fetchUserOrders,
    isAdmin,
    isRegularUser,
    forceRefreshOrders,
  } = useOrder();

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [chartType, setChartType] = useState("line"); // 'line' or 'bar'
  const [chartFilter, setChartFilter] = useState("weekly"); // 'daily', 'weekly', 'monthly'

  // Fetch orders on mount and when selectedMonth or chartFilter changes
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const startDate = new Date(selectedMonth);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1); // Fetch one month of data
        const params = {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        };

        if (isAdmin) {
          await fetchAllOrders(1, 100, "", "", true, params);
        } else if (isRegularUser) {
          await fetchUserOrders(1, 100, "", true, params);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        toast.error(err.message || "Failed to load dashboard data");
      }
    };

    fetchOrders();
  }, [isAdmin, isRegularUser, fetchAllOrders, fetchUserOrders, selectedMonth]);

  // Enhanced stats calculation
  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        revenue: 0,
        orders: 0,
        customers: 0,
        products: 0,
        averageOrderValue: 0,
        topSellingProduct: "N/A",
        conversionRate: 0,
      };
    }

    const filteredOrders = orders.filter((order) => {
      if (!order || !order.createdAt) return false;
      return (
        new Date(order.createdAt).toISOString().slice(0, 7) === selectedMonth
      );
    });

    const revenue = filteredOrders.reduce(
      (sum, order) => sum + (order.totalPrice || 0),
      0
    );
    const orderCount = filteredOrders.length;
    const uniqueCustomers = new Set(
      filteredOrders.map((order) => order.userId?.email)
    ).size;
    const uniqueProducts = new Set(
      filteredOrders.flatMap((order) =>
        (order.items || []).map((item) => item.productId?._id)
      )
    ).size;

    const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    const productSales = {};
    filteredOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const productName = item.productId?.name || "Unknown";
        productSales[productName] =
          (productSales[productName] || 0) + item.quantity;
      });
    });
    const topSellingProduct = Object.keys(productSales).reduce(
      (a, b) => (productSales[a] > productSales[b] ? a : b),
      "N/A"
    );

    return {
      revenue,
      orders: orderCount,
      customers: uniqueCustomers,
      products: uniqueProducts,
      averageOrderValue,
      topSellingProduct,
      conversionRate:
        uniqueCustomers > 0 ? (orderCount / uniqueCustomers) * 100 : 0,
    };
  }, [orders, selectedMonth]);

  // Fetch previous period data for percentage change
  const getPercentageChange = useCallback(
    async (current, type) => {
      try {
        const now = new Date(selectedMonth);
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = prevMonth.toISOString().slice(0, 7);

        let prevOrders = [];
        if (isAdmin) {
          const response = await fetchAllOrders(1, 100, "", "", true);
          prevOrders = response?.orders || [];
        } else if (isRegularUser) {
          const response = await fetchUserOrders(1, 100, "", true);
          prevOrders = response?.orders || [];
        }

        const prevFilteredOrders = prevOrders.filter(
          (order) =>
            order?.createdAt &&
            new Date(order.createdAt).toISOString().slice(0, 7) === prevMonthStr
        );

        let prevValue = 0;
        switch (type) {
          case "revenue":
            prevValue = prevFilteredOrders.reduce(
              (sum, order) => sum + (order.totalPrice || 0),
              0
            );
            break;
          case "orders":
            prevValue = prevFilteredOrders.length;
            break;
          case "customers":
            prevValue = new Set(
              prevFilteredOrders.map((order) => order.userId?.email)
            ).size;
            break;
          case "products":
            prevValue = new Set(
              prevFilteredOrders.flatMap((order) =>
                (order.items || []).map((item) => item.productId?._id)
              )
            ).size;
            break;
          case "averageOrderValue":
            const prevOrderCount = prevFilteredOrders.length;
            const prevRevenue = prevFilteredOrders.reduce(
              (sum, order) => sum + (order.totalPrice || 0),
              0
            );
            prevValue = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;
            break;
          case "conversionRate":
            const prevCustomers = new Set(
              prevFilteredOrders.map((order) => order.userId?.email)
            ).size;
            prevValue =
              prevCustomers > 0
                ? (prevFilteredOrders.length / prevCustomers) * 100
                : 0;
            break;
          default:
            prevValue = 0;
        }

        if (prevValue === 0) return "N/A";
        const percentage = ((current - prevValue) / prevValue) * 100;
        return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}% from last month`;
      } catch (err) {
        console.error(`Error calculating ${type} percentage change:`, err);
        return "N/A";
      }
    },
    [isAdmin, isRegularUser, fetchAllOrders, fetchUserOrders, selectedMonth]
  );

  // Generate chart data based on chartFilter
  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const now = new Date();
    const data = [];

    if (chartFilter === "daily") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayOrders = orders.filter((order) =>
          order.createdAt?.startsWith(dateStr)
        );

        data.push({
          name: date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          }),
          revenue: dayOrders.reduce(
            (sum, order) => sum + (order.totalPrice || 0),
            0
          ),
          orders: dayOrders.length,
        });
      }
    } else if (chartFilter === "weekly") {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);

        const weekOrders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= weekStart && orderDate <= weekEnd;
        });

        data.push({
          name: `Week ${4 - i} (${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
          revenue: weekOrders.reduce(
            (sum, order) => sum + (order.totalPrice || 0),
            0
          ),
          orders: weekOrders.length,
        });
      }
    } else if (chartFilter === "monthly") {
      // Last 3 months
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);

        const monthOrders = orders.filter((order) =>
          order.createdAt?.startsWith(monthStr)
        );

        data.push({
          name: date.toLocaleDateString("en-US", { month: "long" }),
          revenue: monthOrders.reduce(
            (sum, order) => sum + (order.totalPrice || 0),
            0
          ),
          orders: monthOrders.length,
        });
      }
    }

    return data;
  }, [orders, chartFilter]);

  // Top products data
  const topProducts = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const productStats = {};

    orders.forEach((order) => {
      if (
        new Date(order.createdAt).toISOString().slice(0, 7) === selectedMonth
      ) {
        order.items?.forEach((item) => {
          const productId = item.productId?._id;
          const productName = item.productId?.name || "Unknown Product";

          if (!productStats[productId]) {
            productStats[productId] = {
              id: productId,
              name: productName,
              totalSold: 0,
              totalRevenue: 0,
              orderCount: 0,
            };
          }

          productStats[productId].totalSold += item.quantity || 0;
          productStats[productId].totalRevenue +=
            (item.quantity || 0) * (item.price || 0);
          productStats[productId].orderCount += 1;
        });
      }
    });

    return Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [orders, selectedMonth]);

  // Order status distribution for pie chart
  const orderStatusData = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const statusCount = {};
    orders.forEach((order) => {
      if (
        new Date(order.createdAt).toISOString().slice(0, 7) === selectedMonth
      ) {
        const status = order.status || "unknown";
        statusCount[status] = (statusCount[status] || 0) + 1;
      }
    });

    const colors = {
      delivered: "#10B981",
      shipped: "#3B82F6",
      processing: "#F59E0B",
      pending: "#EF4444",
      cancelled: "#6B7280",
    };

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colors[status] || "#6B7280",
    }));
  }, [orders, selectedMonth]);

  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      options.push({ value, label });
    }
    return options;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const recentOrders = useMemo(
    () =>
      orders
        .filter((order) => order && order.orderId && order.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((order) => ({
          id: order.orderId,
          customer: order.userId?.name || "Unknown",
          amount: order.totalPrice || 0,
          status: order.status || "unknown",
          date: new Date(order.createdAt).toLocaleDateString(),
        })),
    [orders]
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .chart-container {
            animation: fadeIn 0.5s ease-out;
          }
          .filter-button:hover {
            transform: scale(1.05);
            transition: transform 0.2s ease-in-out;
          }
          .tooltip {
            background: rgba(255, 255, 255, 0.95) !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            padding: 12px !important;
            border: none !important;
          }
          .tooltip-label {
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin-bottom: 4px !important;
          }
          .tooltip-item {
            color: #4b5563 !important;
            font-size: 14px !important;
          }
        `}
      </style>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <label
              htmlFor="month-select"
              className="text-sm font-medium text-gray-600"
            >
              Month:
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              {getMonthOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label
              htmlFor="chart-filter"
              className="text-sm font-medium text-gray-600"
            >
              View:
            </label>
            <select
              id="chart-filter"
              value={chartFilter}
              onChange={(e) => setChartFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg text-sm shadow-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm shadow-sm">
          Loading dashboard data...
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatPrice(stats.revenue)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.revenue ? "Calculating..." : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiDollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-800">{stats.orders}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.orders ? "Calculating..." : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiShoppingBag className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.customers.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.customers ? "Calculating..." : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiUsers className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products Sold</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.products}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.products ? "Calculating..." : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiPackage className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Avg Order Value
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {formatPrice(stats.averageOrderValue)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.averageOrderValue ? "Calculating..." : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiCreditCard className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Conversion Rate
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.conversionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-green-600 mt-1">
                {stats.conversionRate ? "Calculating..." : "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-full bg-white bg-opacity-50">
              <FiActivity className="h-6 w-6 text-pink-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 chart-container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Sales Overview
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Date Filter Buttons */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartFilter("daily")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    chartFilter === "daily"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setChartFilter("weekly")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    chartFilter === "weekly"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setChartFilter("monthly")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    chartFilter === "monthly"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Monthly
                </button>
              </div>

              {/* Chart Type Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setChartType("line")}
                  className={`p-2 rounded-lg transition-colors filter-button ${
                    chartType === "line"
                      ? "bg-blue-100 text-blue-600 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 bg-gray-50"
                  }`}
                  title="Line Chart"
                >
                  <FiTrendingUp className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`p-2 rounded-lg transition-colors filter-button ${
                    chartType === "bar"
                      ? "bg-blue-100 text-blue-600 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 bg-gray-50"
                  }`}
                  title="Bar Chart"
                >
                  <FiBarChart2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                    tickLine={false}
                    axisLine={{ stroke: "#d1d5db" }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                    tickLine={false}
                    axisLine={{ stroke: "#d1d5db" }}
                    tickFormatter={(value) =>
                      chartFilter === "orders" ? value : `Rs. ${value / 1000}k`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      padding: "12px",
                    }}
                    labelStyle={{ fontWeight: 600, color: "#1f2937" }}
                    itemStyle={{ color: "#4b5563", fontSize: "14px" }}
                    formatter={(value, name) => [
                      name === "revenue" ? formatPrice(value) : value,
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-gray-700 font-medium">
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 5 }}
                    activeDot={{
                      r: 8,
                      fill: "#1d4ed8",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                    activeDot={{
                      r: 6,
                      fill: "#059669",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    animationDuration={800}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                    tickLine={false}
                    axisLine={{ stroke: "#d1d5db" }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                    tickLine={false}
                    axisLine={{ stroke: "#d1d5db" }}
                    tickFormatter={(value) =>
                      chartFilter === "orders" ? value : `$${value / 1000}k`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      padding: "12px",
                    }}
                    labelStyle={{ fontWeight: 600, color: "#1f2937" }}
                    itemStyle={{ color: "#4b5563", fontSize: "14px" }}
                    formatter={(value, name) => [
                      name === "revenue" ? formatPrice(value) : value,
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-gray-700 font-medium">
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    background={{ fill: "#f3f4f6", radius: 4 }}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="orders"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    background={{ fill: "#f3f4f6", radius: 4 }}
                    animationDuration={800}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Order Status
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={800}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    padding: "12px",
                  }}
                  labelStyle={{ fontWeight: 600, color: "#1f2937" }}
                  itemStyle={{ color: "#4b5563", fontSize: "14px" }}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) => (
                    <span className="text-gray-700 font-medium">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {orderStatusData.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Top Products
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View All
            </button>
          </div>
          {loading && !topProducts.length ? (
            <div className="text-center text-gray-600 text-sm py-8">
              Loading products...
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No products data available
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg transition-all hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mr-4 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {product.totalSold} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      {formatPrice(product.totalRevenue)}
                    </p>
                    <p className="text-sm text-green-600">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Orders
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View All
            </button>
          </div>
          {loading && !orders.length ? (
            <div className="text-center text-gray-600 text-sm py-8">
              Loading orders...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center text-gray-600 text-sm py-8">
              No recent orders
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{order.id}</p>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                    <p className="text-xs text-gray-500">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">
                      {formatPrice(order.amount)}
                    </p>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                        order.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : order.status === "shipped"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "processing"
                              ? "bg-amber-100 text-amber-800"
                              : order.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

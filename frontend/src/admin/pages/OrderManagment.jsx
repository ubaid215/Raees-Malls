import React, { useState, useEffect, memo } from "react";
import { FiDownload, FiCheckCircle, FiTruck } from "react-icons/fi";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import Button from "../../components/core/Button";
import Invoice from "../../components/features/Invoice";

const OrderManagement = () => {
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const storedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        setOrders(storedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleMarkComplete = (orderId) => {
    // Update order to completed
    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status: "completed",
            completedAt: new Date().toLocaleDateString(),
          }
        : order
    );

    // Save to completedOrders
    const completedOrder = updatedOrders.find((order) => order.id === orderId);
    const savedCompletedOrders = JSON.parse(localStorage.getItem('completedOrders') || '[]');
    const updatedCompletedOrders = [
      ...savedCompletedOrders.filter((order) => order.id !== orderId), // Avoid duplicates
      completedOrder,
    ];
    localStorage.setItem('completedOrders', JSON.stringify(updatedCompletedOrders));

    // Remove completed order from orders
    const filteredOrders = updatedOrders.filter((order) => order.id !== orderId);
    setOrders(filteredOrders);
    localStorage.setItem('orders', JSON.stringify(filteredOrders));

    alert(`Order ${orderId} marked as completed and removed from active orders`);
  };

  const handleMarkShipped = (orderId) => {
    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status: "shipped",
            shippedAt: new Date().toLocaleDateString(),
          }
        : order
    );

    setOrders(updatedOrders);
    localStorage.setItem('orders', JSON.stringify(updatedOrders));

    alert(`Order ${orderId} marked as shipped`);
  };

  const handleDownloadInvoice = (order) => {
    try {
      const invoice = Invoice({ order });
      invoice.generatePDF();
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Failed to generate invoice. Please ensure all dependencies are installed and try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <LoadingSkeleton type="text" width="64" height="8" className="mb-2" />
          <LoadingSkeleton type="text" width="96" height="4" />
        </div>

        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="mb-6 bg-white rounded-lg shadow-sm border border-[#F5F5F5] p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <LoadingSkeleton
                type="text"
                width="20"
                height="4"
                count={3}
                containerClassName="space-y-2"
              />
            </div>

            {[...Array(2)].map((_, j) => (
              <div key={j} className="flex items-start mb-6 last:mb-0">
                <LoadingSkeleton type="image" width="80" className="mr-4" />
                <div className="flex-1">
                  <LoadingSkeleton
                    type="text"
                    width="48"
                    height="5"
                    className="mb-2"
                  />
                  <LoadingSkeleton
                    type="text"
                    width="64"
                    height="4"
                    className="mb-1"
                  />
                  <LoadingSkeleton type="text" width="32" height="4" />
                </div>
              </div>
            ))}

            <div className="flex justify-end space-x-3 mt-4">
              <LoadingSkeleton type="text" width="32" height="9" />
              <LoadingSkeleton type="text" width="32" height="9" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#212121]">All Orders</h1>
        <p className="text-[#424242]">Manage and track all customer orders</p>
      </div>

      <div className="space-y-6">
        {orders?.length === 0 ? (
          <p className="text-center text-gray-500">No orders found.</p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-sm border border-[#F5F5F5] p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-[#424242]">Order ID</p>
                  <p className="font-medium text-[#212121]">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Date</p>
                  <p className="font-medium text-[#212121]">{order.date}</p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Total Amount</p>
                  <p className="font-medium text-[#212121]">{order.total}</p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Customer Name</p>
                  <p className="font-medium text-[#212121]">{order.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Address</p>
                  <p className="font-medium text-[#212121]">
                    {`${order.customer.address}, ${order.customer.city}, ${order.customer.postalCode}, ${order.customer.country}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Payment Method</p>
                  <p className="font-medium text-[#212121]">
                    {order.customer.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md mr-4 border border-[#F5F5F5]"
                      onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-[#212121]">{item.name}</h3>
                      <p className="text-sm text-[#424242]">{item.access}</p>
                      <p className="text-sm font-medium text-[#212121] mt-1">
                        {item.quantity ? `${item.quantity} x ${item.price}` : item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <Button
                  variant={order.status === "shipped" || order.status === "completed" ? "secondary" : "primary"}
                  onClick={() => handleMarkShipped(order.id)}
                  icon={order.status === "shipped" ? FiTruck : null}
                  className={
                    order.status === "shipped" || order.status === "completed"
                      ? "!bg-[#F5F5F5] !text-[#424242]"
                      : ""
                  }
                  disabled={order.status === "shipped" || order.status === "completed"}
                >
                  {order.status === "shipped" ? "Shipped" : "Mark as Shipped"}
                </Button>
                <Button
                  variant={order.status === "completed" ? "secondary" : "primary"}
                  onClick={() => handleMarkComplete(order.id)}
                  icon={order.status === "completed" ? FiCheckCircle : null}
                  className={
                    order.status === "completed"
                      ? "!bg-[#F5F5F5] !text-[#424242]"
                      : ""
                  }
                  disabled={order.status === "completed"}
                >
                  {order.status === "completed" ? "Completed" : "Mark as Complete"}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDownloadInvoice(order)}
                  icon={FiDownload}
                >
                  Download Invoice
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default memo(OrderManagement);
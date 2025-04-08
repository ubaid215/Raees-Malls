import React, { useState, useEffect, memo } from "react";
import { FiDownload, FiCheckCircle, FiFileText } from "react-icons/fi";
import LoadingSkeleton from "../../components/shared/LoadingSkelaton";
import Button from "../../components/core/Button";

// Mock product images - replace with actual image URLs from your backend
const productImages = {
  "Clarity UI Landing Kit": "https://via.placeholder.com/80x80?text=Clarity+UI",
  "Shark - Admin Template UI Kit":
    "https://via.placeholder.com/80x80?text=Shark+UI",
  "Maximum - eCommerce UI Kit":
    "https://via.placeholder.com/80x80?text=Maximum+UI",
};

const OrdersPage = () => {
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Simulate API call - replace with actual fetch
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockOrders = [
          {
            id: "#46199271460087",
            date: "14 January, 2022",
            total: "$39",
            status: "pending", // 'pending' or 'completed'
            items: [
              {
                id: "prod-1",
                name: "Clarity UI Landing Kit",
                access: "Lifetime access",
                price: "$15",
              },
              {
                id: "prod-2",
                name: "Shark - Admin Template UI Kit",
                access: "1 Year Access | Expires 17/03/22",
                price: "$12",
              },
              {
                id: "prod-3",
                name: "Maximum - eCommerce UI Kit",
                access: "Lifetime access",
                price: "$12",
              },
            ],
          },
          // Add more orders
          {
            id: "#46199271460088",
            date: "15 January, 2022",
            total: "$24",
            status: "completed",
            items: [
              {
                id: "prod-4",
                name: "Shark - Admin Template UI Kit",
                access: "1 Year Access",
                price: "$12",
              },
              {
                id: "prod-5",
                name: "Maximum - eCommerce UI Kit",
                access: "Lifetime access",
                price: "$12",
              },
            ],
          },
        ];

        setOrders(mockOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleMarkComplete = (orderId) => {
    // Update the order status in state
    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status: "completed",
            completedAt: new Date().toLocaleDateString(),
          }
        : order
    );

    setOrders(updatedOrders);

    // Save to localStorage (replace with API call in real app)
    const completedOrders = updatedOrders.filter(
      (o) => o.status === "completed"
    );
    localStorage.setItem("completedOrders", JSON.stringify(completedOrders));

    // Optional: Show confirmation
    alert(`Order ${orderId} marked as completed`);
  };

  const handleDownloadInvoice = (orderId) => {
    // API call to download invoice
    console.log("Downloading invoice for:", orderId);
    // In a real app, this would trigger a file download
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
        {orders?.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow-sm border border-[#F5F5F5] p-6"
          >
            {/* Order Summary */}
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
            </div>

            {/* Ordered Items */}
            <div className="space-y-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start">
                  <img
                    src={productImages[item.name]}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-md mr-4 border border-[#F5F5F5]"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-[#212121]">{item.name}</h3>
                    <p className="text-sm text-[#424242]">{item.access}</p>
                    <p className="text-sm font-medium text-[#212121] mt-1">
                      {item.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
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
                {order.status === "completed"
                  ? "Completed"
                  : "Mark as Complete"}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDownloadInvoice(order.id)}
                icon={FiDownload}
              >
                Download Invoice
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(OrdersPage);

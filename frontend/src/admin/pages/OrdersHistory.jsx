import React, { useState, useEffect, memo } from 'react';
import { FiFileText, FiCheckCircle } from 'react-icons/fi';
import LoadingSkeleton from '../../components/shared/LoadingSkelaton';
import Button from '../../components/core/Button';

const OrdersHistory = () => {
  const [completedOrders, setCompletedOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedOrders = async () => {
      try {
        // Replace with actual API call to get completed orders
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // This would come from your backend in a real app
        const savedCompletedOrders = JSON.parse(localStorage.getItem('completedOrders') || '[]');
        setCompletedOrders(savedCompletedOrders);
      } catch (error) {
        console.error('Error fetching completed orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedOrders();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <LoadingSkeleton type="text" width="64" height="8" className="mb-2" />
          <LoadingSkeleton type="text" width="96" height="4" />
        </div>
        
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-6 bg-white rounded-lg shadow-sm border border-[#F5F5F5] p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <LoadingSkeleton type="text" width="20" height="4" count={3} containerClassName="space-y-2" />
            </div>
            
            {[...Array(2)].map((_, j) => (
              <div key={j} className="flex items-start mb-6 last:mb-0">
                <LoadingSkeleton type="image" width="80" className="mr-4" />
                <div className="flex-1">
                  <LoadingSkeleton type="text" width="48" height="5" className="mb-2" />
                  <LoadingSkeleton type="text" width="64" height="4" className="mb-1" />
                  <LoadingSkeleton type="text" width="32" height="4" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#212121]">Orders History</h1>
        <p className="text-[#424242]">
          View all completed orders and sales records
        </p>
      </div>

      {completedOrders?.length > 0 ? (
        <div className="space-y-6">
          {completedOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-[#F5F5F5] p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-[#424242]">Order ID</p>
                  <p className="font-medium text-[#212121]">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Date Completed</p>
                  <p className="font-medium text-[#212121]">{order.date}</p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Total Amount</p>
                  <p className="font-medium text-[#212121]">{order.total}</p>
                </div>
                <div>
                  <p className="text-sm text-[#424242]">Status</p>
                  <div className="flex items-center text-green-600">
                    <FiCheckCircle className="mr-1" />
                    <span>Completed</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md mr-4 border border-[#F5F5F5]"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-[#212121]">{item.name}</h3>
                      <p className="text-sm text-[#424242]">{item.access}</p>
                      <p className="text-sm font-medium text-[#212121] mt-1">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  variant="primary"
                  onClick={() => console.log('Download invoice for:', order.id)}
                  icon={FiFileText}
                >
                  Download Invoice
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-[#F5F5F5] p-8 text-center">
          <p className="text-[#424242]">No completed orders found</p>
        </div>
      )}
    </div>
  );
};

export default memo(OrdersHistory);
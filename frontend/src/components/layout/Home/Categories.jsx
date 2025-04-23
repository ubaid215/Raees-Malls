import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { 
  CiMobile2, 
  CiHeadphones,
  CiLaptop,
  CiCamera,
  CiSpeaker,
  CiClock2,
  CiBatteryFull,
  CiMicrochip
} from 'react-icons/ci';
import { BsSmartwatch, BsJoystick } from 'react-icons/bs';
import { FiWatch } from 'react-icons/fi';

function Categories() {

  const navigate = useNavigate();
  // Category data for both rows
  const row1Categories = [
    { icon: <CiMobile2 size={50} color='red'/>, name: 'Mobile Phones' },
    { icon: <CiHeadphones size={50} color='red'/>, name: 'Headphones' },
    { icon: <CiLaptop size={50} color='red'/>, name: 'Laptops' },
    { icon: <CiCamera size={50} color='red'/>, name: 'Cameras' },
    { icon: <CiSpeaker size={50} color='red'/>, name: 'Speakers' },
    { icon: <BsSmartwatch size={50} color='red'/>, name: 'Smart Watches' },
    { icon: <BsJoystick size={50} color='red'/>, name: 'Gaming' },
    { icon: <CiBatteryFull size={50} color='red'/>, name: 'Power Banks' },
    { icon: <CiMicrochip size={50} color='red'/>, name: 'Accessories' },
    { icon: <FiWatch size={50} color='red'/>, name: 'Wearables' }
  ];

  const handleClick = () => {
    navigate('/categories');
  };

  
  return (
    <div className='w-full px-4 py-8 md:px-6 lg:px-8 my-4'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-xl font-bold md:text-2xl lg:text-3xl'>Featured Categories</h1>
          <button className='flex items-center gap-2 border-b-2 hover:text-red-500 transition-colors' onClick={handleClick}>
            View All <ArrowRight size={18} />
          </button>
        </div>
        
        {/* Categories Grid */}
        <div className='space-y-6'>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
            {row1Categories.map((category, index) => (
              <div 
                key={`row1-${index}`}
                className='bg-white rounded-lg p-10 flex flex-col items-center justify-center gap-3 
                shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full'
              >
                <div className='text-gray-700 hover:text-red-500 transition-colors'>
                  {category.icon}
                </div>
                <h2 className='text-sm sm:text-base font-medium text-center'>{category.name}</h2>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default Categories;
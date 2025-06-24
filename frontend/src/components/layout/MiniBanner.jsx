// components/layout/MiniBanner.js
import { StarIcon } from 'lucide-react';
import React from 'react';

function MiniBanner() {
  return (
    <div className="bg-red-600 text-white text-center py-4 text-sm lg:text-xl font-medium blink-animation">
      <span className='flex items-center justify-center gap-2'>
     <StarIcon size={20} fill='white' />  Free delivery on orders above Rs. 2,500 PKR <StarIcon size={20} fill='white' />
      </span>
    </div>
  );
}

export default MiniBanner;

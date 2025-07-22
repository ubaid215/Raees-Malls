import { Star, ShieldCheck, Tag, Zap, SmilePlus } from 'lucide-react';
import React from 'react';

function MiniBanner() {
  const messages = [
    { icon: <Star size={18} fill="white" />, text: "Welcome to RaeesMalls - Your Premium Shopping Destination" },
    { icon: <SmilePlus size={18} fill="white" />, text: "Say Goodbye to Fake Products — Shop Original & Verified Picks" },
    { icon: <Tag size={18} fill="white" />, text: "Up to 50% OFF on Selected Items - Limited Time Only!" },
    { icon: <ShieldCheck size={18} fill="white" />, text: "100% Authentic Products with 7-Day Money Back Guarantee" },
    { icon: <Zap size={18} fill="white" />, text: "Flash Sale Every Friday - Get Ready for Amazing Deals!" },
    { icon: <Star size={18} fill="white" />, text: "New Arrivals Every Week - Stay Updated!" }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white py-3 lg:py-3">
      {/* Animated background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>

      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-50" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-60" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Marquee Container */}
      <div className="relative z-10 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee flex w-max">
          {/* Duplicate messages for smooth loop */}
          {[...messages, ...messages].map((message, index) => (
            <div key={index} className="flex items-center mx-8 lg:mx-12">
              <div className="flex items-center gap-2">
                {message.icon}
                <span className="text-sm lg:text-lg font-bold tracking-wide">
                  {message.text}
                </span>
                {message.icon}
              </div>
              <div className="mx-4 lg:mx-6 text-yellow-300">•</div>
            </div>
          ))}
        </div>
      </div>

      {/* Side glow effects */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-red-600 via-red-600/80 to-transparent z-20"></div>
      <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-red-600 via-red-600/80 to-transparent z-20"></div>

      {/* Bottom and top shine effects */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent"></div>

      {/* Custom marquee animation */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 40s linear infinite;
        }

        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

export default MiniBanner;

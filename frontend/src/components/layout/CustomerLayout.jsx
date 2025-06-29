import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../shared/Footer';
import Navbar from './Home/Navbar';

const CustomerLayout = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const baseVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const getPageVariants = (pathname) => {
    switch (pathname) {
      case '/login':
      case '/register':
        return {
          initial: { opacity: 0, y: 20 },
          in: { opacity: 1, y: 0 },
          out: { opacity: 0, y: -20 }
        };
      case '/cart':
      case '/checkout':
        return {
          initial: { opacity: 0, scale: 0.95 },
          in: { opacity: 1, scale: 1 },
          out: { opacity: 0, scale: 1.05 }
        };
      case '/products':
        return {
          initial: { opacity: 0, x: 30 },
          in: { opacity: 1, x: 0 },
          out: { opacity: 0, x: -30 }
        };
      default:
        return baseVariants;
    }
  };

  const pageTransition = {
    type: 'tween',
    ease: [0.42, 0, 0.58, 1],
    duration: 0.4
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          className="flex-grow"
          key={location.pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={getPageVariants(location.pathname)}
          transition={pageTransition}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
};

export default CustomerLayout;

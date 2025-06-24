import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Footer from '../shared/Footer';
import Navbar from './Home/Navbar';

const CustomerLayout = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'smooth' for smooth scrolling
    });
  }, [location.pathname]);

  return (
    <div>
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;
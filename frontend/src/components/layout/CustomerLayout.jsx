import { Outlet } from 'react-router-dom';
import Footer from '../shared/Footer';
import Navbar from './Home/Navbar';

const CustomerLayout = () => {
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
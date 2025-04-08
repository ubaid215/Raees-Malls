// src/App.jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRouter from './router/AppRouter';
import { SliderProvider } from './context/SliderContext';
import { CartProvider } from './context/CartContext'; // Import the CartProvider

function App() {
  return (
    <SliderProvider>
      <CartProvider>
        <Router>
          <AppRouter />
        </Router>
      </CartProvider>
    </SliderProvider>
  );
}

export default App;
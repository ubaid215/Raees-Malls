import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [navigate, setNavigate] = useState(null);

  // We'll provide a way to set navigate after the Router is available
  const setNavigateFunction = (navFunction) => {
    setNavigate(() => navFunction);
  };

  // Fetch user data on mount if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Check account status
        if (response.data.status !== 'active') {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          if (navigate) navigate('/account-inactive');
          return;
        }
        
        setUser(response.data);
      } catch (err) {
        if (err.response?.data?.code === 'ACCOUNT_INACTIVE') {
          if (navigate) navigate('/account-inactive');
        } else {
          console.error('Fetch user error:', err.response?.data || err.message);
        }
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, navigate]);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/auth/login', {
        email,
        password,
      });
      
      // Check account status before proceeding
      if (response.data.status !== 'active') {
        throw new Error('Your account is not active');
      }
      
      setToken(response.data.token);
      setUser(response.data);
      localStorage.setItem('token', response.data.token);
      if (navigate) navigate('/profile');
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to log in');
    }
  };

  // Signup function
  const signup = async (name, email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/auth/register', {
        name,
        email,
        password,
      });
      
      setToken(response.data.token);
      setUser(response.data);
      localStorage.setItem('token', response.data.token);
      if (navigate) navigate('/profile');
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to sign up');
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    if (navigate) navigate('/login');
  };

  const value = {
    user,
    token,
    login,
    signup,
    logout,
    loading,
    setNavigateFunction, // Expose the setNavigate function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
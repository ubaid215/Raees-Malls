import React, { createContext, useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { 
  login, 
  register, 
  logout, 
  refreshToken, 
  getMe, 
  updateUser, 
  googleLogin 
} from '../services/authServices';
import socketService from '../services/socketService';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    loading: true,
    error: null,
    needsFetch: false,
  });

  // Refs to track ongoing operations and prevent duplicates
  const isInitializing = useRef(false);
  const isRefreshing = useRef(false);
  const isFetching = useRef(false);
  const isUpdating = useRef(false);

  // Debounced functions that return Promises
  const debouncedFetchUser = useCallback(() => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isFetching.current) {
          resolve();
          return;
        }
        isFetching.current = true;
        
        try {
          const result = await fetchUserInternal();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          isFetching.current = false;
        }
      }, 300);
      
      debouncedFn();
    });
  }, []);

  const debouncedRefreshToken = useCallback(() => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isRefreshing.current) {
          resolve();
          return;
        }
        isRefreshing.current = true;
        
        try {
          const result = await refreshUserTokenInternal();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          isRefreshing.current = false;
        }
      }, 1000);
      
      debouncedFn();
    });
  }, []);

  useEffect(() => {
    if (isInitializing.current) return;
    
    // Check for the correct token key that matches authServices.js
    const storedToken = localStorage.getItem('userToken');
    const storedRefreshToken = localStorage.getItem('userRefreshToken');
    
    if (!storedToken && !storedRefreshToken) {
      setAuthState((prev) => ({ ...prev, loading: false }));
      return;
    }

    isInitializing.current = true;

    const initializeAuth = async () => {
      try {
        // First try to fetch user with existing token
        await debouncedFetchUser();
      } catch (error) {
        console.log('Initial fetch failed, attempting token refresh:', error.message);
        try {
          // If fetch fails, try to refresh token
          await debouncedRefreshToken();
        } catch (refreshError) {
          console.log('Token refresh failed, resetting auth state:', refreshError.message);
          // Only reset if refresh definitively fails (not network errors)
          if (refreshError.message.includes('Token refresh failed') || 
              refreshError.message.includes('No refresh token') ||
              refreshError.response?.status === 401 ||
              refreshError.response?.status === 403) {
            resetAuthState();
          } else {
            // For network errors or other issues, just stop loading but keep tokens
            setAuthState((prev) => ({ ...prev, loading: false }));
          }
        }
      } finally {
        isInitializing.current = false;
      }
    };

    initializeAuth();

    // Periodic token refresh (every 10 minutes) - debounced
    const refreshInterval = setInterval(() => {
      // Only refresh if we have a user and tokens
      const currentToken = localStorage.getItem('userToken');
      const currentRefreshToken = localStorage.getItem('userRefreshToken');
      
      if (currentToken && currentRefreshToken && !isRefreshing.current) {
        debouncedRefreshToken().catch(err => {
          console.error('Periodic token refresh failed:', err);
          // Don't auto-logout on periodic refresh failures
        });
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(refreshInterval);
      // Reset operation flags on cleanup
      isInitializing.current = false;
      isRefreshing.current = false;
      isFetching.current = false;
      isUpdating.current = false;
    };
  }, [debouncedFetchUser, debouncedRefreshToken]);

  const setupSocketConnection = (user) => {
    const userId = user._id || user.id;
    if (userId) socketService.connect(userId);
  };

  const handleAuthError = (error, shouldResetAuth = true) => {
    console.error('Auth error:', error);
    let errorMessage = error.message;

    if (error.message.includes(',')) {
      errorMessage = error.message.split(', ').map((msg) => ({ msg }));
    } else if (error.message === 'This email is already registered') {
      errorMessage = [{ msg: 'This email is already registered' }];
    } else if (error.message.includes('Too many')) {
      errorMessage = [{ msg: error.message }];
    } else if (error.message.includes('Google login')) {
      errorMessage = [{ msg: error.message }];
    } else {
      errorMessage = [{ msg: errorMessage }];
    }

    setAuthState((prev) => ({
      ...prev,
      error: errorMessage,
      loading: false,
      needsFetch: false,
    }));

    // Don't reset auth state for rate limiting or network errors
    if (error.message.includes('Too many requests') || 
        error.message.includes('Network error') ||
        error.message.includes('timeout')) {
      return;
    }

    // Only reset auth state if explicitly requested and it's a definitive auth failure
    if (shouldResetAuth && (
        error.message.includes('Token refresh failed') ||
        error.message.includes('No refresh token') ||
        error.response?.status === 401 ||
        error.response?.status === 403
    )) {
      resetAuthState();
    }
  };

  const resetAuthState = () => {
    setAuthState({
      user: null,
      loading: false,
      error: null,
      needsFetch: false,
    });
    
    // Clear all auth-related data using the correct keys
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRefreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    localStorage.removeItem('userDataTimestamp');
    localStorage.removeItem('tokenExpiry');
    // Also clear any legacy token keys
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    socketService.disconnect();
    
    // Reset operation flags
    isRefreshing.current = false;
    isFetching.current = false;
    isUpdating.current = false;
  };

  const fetchUserInternal = async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Check cached user data first
      const cachedUser = localStorage.getItem('userData');
      const cachedTimestamp = localStorage.getItem('userDataTimestamp');
      const now = Date.now();
      
      // Use cached data if it's less than 5 minutes old
      if (cachedUser && cachedTimestamp && now - parseInt(cachedTimestamp) < 300000) {
        const userData = JSON.parse(cachedUser);
        setAuthState({
          user: userData,
          loading: false,
          error: null,
          needsFetch: false,
        });
        setupSocketConnection(userData);
        return userData;
      }

      // Fetch fresh user data
      const userData = await getMe();
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('userDataTimestamp', Date.now().toString());
      setAuthState({
        user: userData,
        loading: false,
        error: null,
        needsFetch: false,
      });
      setupSocketConnection(userData);
      return userData;
    } catch (err) {
      // Don't automatically reset auth state on fetch errors
      handleAuthError(err, false);
      throw err;
    }
  };

  const fetchUser = useCallback(() => {
    return debouncedFetchUser();
  }, [debouncedFetchUser]);

  // Debounced user functions that return Promises
  const loginUser = useCallback((credentials) => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          const userData = await login(credentials.email, credentials.password);
          localStorage.setItem('userData', JSON.stringify(userData));
          localStorage.setItem('userDataTimestamp', Date.now().toString());
          setAuthState({
            user: userData,
            loading: false,
            error: null,
            needsFetch: false,
          });
          setupSocketConnection(userData);
          resolve(userData);
        } catch (err) {
          handleAuthError(err);
          reject(err);
        }
      }, 500);
      
      debouncedFn();
    });
  }, []);

  // Debounced Google login
  const googleLoginUser = useCallback(() => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          const result = await googleLogin(); // Redirects to Google OAuth
          resolve(result);
        } catch (err) {
          handleAuthError(err);
          reject(err);
        }
      }, 500);
      
      debouncedFn();
    });
  }, []);

  // Debounced register function
  const registerUser = useCallback((userData) => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          const newUser = await register(userData.name, userData.email, userData.password);
          localStorage.setItem('userData', JSON.stringify(newUser));
          localStorage.setItem('userDataTimestamp', Date.now().toString());
          setAuthState({
            user: newUser,
            loading: false,
            error: null,
            needsFetch: false,
          });
          setupSocketConnection(newUser);
          resolve(newUser);
        } catch (err) {
          handleAuthError(err);
          reject(err);
        }
      }, 500);
      
      debouncedFn();
    });
  }, []);

  // Debounced logout function
  const logoutUser = useCallback(() => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          await logout();
          resetAuthState();
          resolve();
        } catch (err) {
          // Even if logout fails, clear local state
          resetAuthState();
          setAuthState((prev) => ({ 
            ...prev, 
            error: [{ msg: 'Logout completed locally' }],
            loading: false 
          }));
          resolve(); // Still resolve since we cleared local state
        }
      }, 300);
      
      debouncedFn();
    });
  }, []);

  const refreshUserTokenInternal = async () => {
    try {
      const userData = await refreshToken();
      
      if (userData) {
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('userDataTimestamp', Date.now().toString());
        setAuthState((prev) => ({
          ...prev,
          user: userData,
          loading: false,
          error: null,
          needsFetch: false,
        }));
        setupSocketConnection(userData);
      } else {
        // Token refresh returned null but didn't throw error
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          needsFetch: false,
        }));
      }
      
      return userData;
    } catch (err) {
      // Don't automatically reset auth state on refresh errors
      handleAuthError(err, false);
      throw err;
    }
  };

  const refreshUserToken = useCallback(() => {
    return debouncedRefreshToken();
  }, [debouncedRefreshToken]);

  // Debounced update user profile
  const updateUserProfile = useCallback((userData) => {
    return new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isUpdating.current) {
          resolve();
          return;
        }
        isUpdating.current = true;
        
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          const updatedUser = await updateUser(userData);
          localStorage.setItem('userData', JSON.stringify(updatedUser));
          localStorage.setItem('userDataTimestamp', Date.now().toString());
          setAuthState({
            user: updatedUser,
            loading: false,
            error: null,
            needsFetch: false,
          });
          setupSocketConnection(updatedUser);
          resolve(updatedUser);
        } catch (err) {
          handleAuthError(err);
          reject(err);
        } finally {
          isUpdating.current = false;
        }
      }, 500);
      
      debouncedFn();
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...authState,
      isAuthenticated: !!authState.user,
      loginUser,
      googleLoginUser,
      registerUser,
      logoutUser,
      refreshUserToken,
      fetchUser,
      updateUser: updateUserProfile,
    }),
    [authState, loginUser, googleLoginUser, registerUser, logoutUser, refreshUserToken, fetchUser, updateUserProfile]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuth };
export default AuthContext;
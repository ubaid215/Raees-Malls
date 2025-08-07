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
  const isLoggingIn = useRef(false);
  const isRegistering = useRef(false);
  const isLoggingOut = useRef(false);
  const lastRefreshAttempt = useRef(0);

  // Promise cache to prevent duplicate requests
  const promiseCache = useRef({
    fetchUser: null,
    refreshToken: null,
    login: null,
    register: null,
    logout: null,
    updateUser: null
  });

  // Clear promise cache helper
  const clearPromiseCache = (key) => {
    if (promiseCache.current[key]) {
      promiseCache.current[key] = null;
    }
  };

  // Check if we have valid tokens
  const hasValidTokens = useCallback(() => {
    const storedToken = localStorage.getItem('userToken');
    const storedRefreshToken = localStorage.getItem('userRefreshToken');
    return !!(storedToken && storedRefreshToken);
  }, []);

  // Check if token might be expired (basic check)
  const isTokenLikelyExpired = useCallback(() => {
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!tokenExpiry) return false;
    
    // Consider token expired if it expires within next 5 minutes
    return Date.now() >= (parseInt(tokenExpiry) - 5 * 60 * 1000);
  }, []);

  // Debounced functions that return Promises with caching
  const debouncedFetchUser = useCallback(() => {
    // Return existing promise if already in progress
    if (promiseCache.current.fetchUser) {
      return promiseCache.current.fetchUser;
    }

    // Don't fetch if no valid tokens
    if (!hasValidTokens()) {
      return Promise.resolve(null);
    }

    const promise = new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isFetching.current) {
          resolve(null);
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
          clearPromiseCache('fetchUser');
        }
      }, 300);
      
      debouncedFn();
    });

    promiseCache.current.fetchUser = promise;
    return promise;
  }, [hasValidTokens]);

  const debouncedRefreshToken = useCallback(() => {
    // Return existing promise if already in progress
    if (promiseCache.current.refreshToken) {
      return promiseCache.current.refreshToken;
    }

    // Don't refresh if no refresh token or if we attempted recently
    const storedRefreshToken = localStorage.getItem('userRefreshToken');
    const now = Date.now();
    
    if (!storedRefreshToken || (now - lastRefreshAttempt.current) < 30000) { // 30 second cooldown
      return Promise.resolve(null);
    }

    const promise = new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isRefreshing.current) {
          resolve(null);
          return;
        }
        isRefreshing.current = true;
        lastRefreshAttempt.current = Date.now();
        
        try {
          const result = await refreshUserTokenInternal();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          isRefreshing.current = false;
          clearPromiseCache('refreshToken');
        }
      }, 1000);
      
      debouncedFn();
    });

    promiseCache.current.refreshToken = promise;
    return promise;
  }, []);

  useEffect(() => {
    if (isInitializing.current) return;
    
    // Quick check - if no tokens at all, don't even try to authenticate
    if (!hasValidTokens()) {
      console.log('No tokens found, skipping authentication');
      setAuthState((prev) => ({ ...prev, loading: false }));
      return;
    }

    isInitializing.current = true;

    const initializeAuth = async () => {
      try {
        // Check cached user data first
        const cachedUser = localStorage.getItem('userData');
        const cachedTimestamp = localStorage.getItem('userDataTimestamp');
        const now = Date.now();
        
        // Use cached data if it's less than 10 minutes old and we have valid tokens
        if (cachedUser && cachedTimestamp && (now - parseInt(cachedTimestamp)) < 600000) {
          console.log('Using cached user data for initialization');
          const userData = JSON.parse(cachedUser);
          setAuthState({
            user: userData,
            loading: false,
            error: null,
            needsFetch: false,
          });
          setupSocketConnection(userData);
          return;
        }

        // If token is likely expired, try refresh first
        if (isTokenLikelyExpired()) {
          console.log('Token likely expired, attempting refresh');
          try {
            await debouncedRefreshToken();
            await debouncedFetchUser();
          } catch (refreshError) {
            console.log('Token refresh failed during init, trying direct fetch:', refreshError.message);
            try {
              await debouncedFetchUser();
            } catch (fetchError) {
              console.log('Direct fetch also failed, resetting auth state');
              if (fetchError.response?.status === 401 || fetchError.response?.status === 403) {
                resetAuthState();
              } else {
                setAuthState((prev) => ({ ...prev, loading: false }));
              }
            }
          }
        } else {
          try {
            await debouncedFetchUser();
          } catch (error) {
            console.log('Initial fetch failed, attempting token refresh:', error.message);
            if (error.response?.status === 401 || error.response?.status === 403) {
              try {
                await debouncedRefreshToken();
              } catch (refreshError) {
                console.log('Token refresh failed, resetting auth state:', refreshError.message);
                resetAuthState();
              }
            } else {
              setAuthState((prev) => ({ ...prev, loading: false }));
            }
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setAuthState((prev) => ({ ...prev, loading: false }));
      } finally {
        isInitializing.current = false;
      }
    };

    initializeAuth();

    // Periodic token refresh
    const refreshInterval = setInterval(() => {
      if (hasValidTokens() && authState.user && !isRefreshing.current && !promiseCache.current.refreshToken) {
        if (isTokenLikelyExpired()) {
          console.log('Periodic token refresh triggered');
          debouncedRefreshToken().catch(err => {
            console.error('Periodic token refresh failed:', err);
            if (err.response?.status === 401 || err.response?.status === 403) {
              resetAuthState();
            }
          });
        }
      }
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
      isInitializing.current = false;
      isRefreshing.current = false;
      isFetching.current = false;
      isUpdating.current = false;
      isLoggingIn.current = false;
      isRegistering.current = false;
      isLoggingOut.current = false;
      lastRefreshAttempt.current = 0;
      Object.keys(promiseCache.current).forEach(key => {
        promiseCache.current[key] = null;
      });
    };
  }, []); // ← REMOVE ALL DEPENDENCIES - run only once on mount

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
        error.message.includes('timeout') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ERR_NETWORK') {
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
    isLoggingIn.current = false;
    isRegistering.current = false;
    isLoggingOut.current = false;
    lastRefreshAttempt.current = 0;

    // Clear promise cache
    Object.keys(promiseCache.current).forEach(key => {
      promiseCache.current[key] = null;
    });
  };

  const fetchUserInternal = async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Check cached user data first (shorter cache time during fetch)
      const cachedUser = localStorage.getItem('userData');
      const cachedTimestamp = localStorage.getItem('userDataTimestamp');
      const now = Date.now();
      
      // Use cached data if it's less than 3 minutes old during explicit fetch
      if (cachedUser && cachedTimestamp && now - parseInt(cachedTimestamp) < 180000) {
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

  // Debounced and cached login function
  const loginUser = useCallback((credentials) => {
    // Prevent multiple simultaneous login attempts
    if (isLoggingIn.current || promiseCache.current.login) {
      return promiseCache.current.login || Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isLoggingIn.current) {
          resolve();
          return;
        }
        isLoggingIn.current = true;
        
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
        } finally {
          isLoggingIn.current = false;
          clearPromiseCache('login');
        }
      }, 500);
      
      debouncedFn();
    });

    promiseCache.current.login = promise;
    return promise;
  }, []);

  // Debounced and cached Google login
  const googleLoginUser = useCallback(() => {
    // Prevent multiple simultaneous Google login attempts
    if (isLoggingIn.current || promiseCache.current.login) {
      return promiseCache.current.login || Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isLoggingIn.current) {
          resolve();
          return;
        }
        isLoggingIn.current = true;
        
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          const result = await googleLogin(); // Redirects to Google OAuth
          resolve(result);
        } catch (err) {
          handleAuthError(err);
          reject(err);
        } finally {
          isLoggingIn.current = false;
          clearPromiseCache('login');
        }
      }, 500);
      
      debouncedFn();
    });

    promiseCache.current.login = promise;
    return promise;
  }, []);

  // Debounced and cached register function
  const registerUser = useCallback((userData) => {
    // Prevent multiple simultaneous registration attempts
    if (isRegistering.current || promiseCache.current.register) {
      return promiseCache.current.register || Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isRegistering.current) {
          resolve();
          return;
        }
        isRegistering.current = true;
        
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
        } finally {
          isRegistering.current = false;
          clearPromiseCache('register');
        }
      }, 500);
      
      debouncedFn();
    });

    promiseCache.current.register = promise;
    return promise;
  }, []);

  // Debounced and cached logout function
  const logoutUser = useCallback(() => {
    // Prevent multiple simultaneous logout attempts
    if (isLoggingOut.current || promiseCache.current.logout) {
      return promiseCache.current.logout || Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
      const debouncedFn = debounce(async () => {
        if (isLoggingOut.current) {
          resolve();
          return;
        }
        isLoggingOut.current = true;
        
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
        } finally {
          isLoggingOut.current = false;
          clearPromiseCache('logout');
        }
      }, 300);
      
      debouncedFn();
    });

    promiseCache.current.logout = promise;
    return promise;
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
      // Don't automatically reset auth state on refresh errors unless it's definitive
      const shouldReset = err.response?.status === 401 || err.response?.status === 403 || 
                         err.message.includes('No refresh token') || 
                         err.message.includes('Token refresh failed');
      handleAuthError(err, shouldReset);
      throw err;
    }
  };

  const refreshUserToken = useCallback(() => {
    return debouncedRefreshToken();
  }, [debouncedRefreshToken]);

  // Debounced and cached update user profile
  const updateUserProfile = useCallback((userData) => {
    // Prevent multiple simultaneous update attempts
    if (isUpdating.current || promiseCache.current.updateUser) {
      return promiseCache.current.updateUser || Promise.resolve();
    }

    const promise = new Promise((resolve, reject) => {
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
          clearPromiseCache('updateUser');
        }
      }, 500);
      
      debouncedFn();
    });

    promiseCache.current.updateUser = promise;
    return promise;
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
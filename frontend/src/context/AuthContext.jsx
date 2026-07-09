import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { closeSessionAndRedirect } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        if (decoded.exp < now) {

          closeSessionAndRedirect();
          setToken(null);
          setUser(null);
        } else {

          setUser({
            // Backend stores the user id in the standard "sub" claim (as a string).
            user_id: decoded.sub != null && decoded.sub !== "guest" ? Number(decoded.sub) : null,
            username: decoded.username,
            role_id: decoded.role_id,
          });
        }

      } catch (e) {
        console.error('Token decode error:', e);
        closeSessionAndRedirect();
        setToken(null);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('token', token);
    } else {
      sessionStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        if (decoded.exp < now) {
          closeSessionAndRedirect();
          setToken(null);
          setUser(null);
        }
      } catch {
        closeSessionAndRedirect();
        setToken(null);
        setUser(null);
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    closeSessionAndRedirect();
    setToken(null);
  };

  const updateToken = (newToken) => {
    setToken(newToken);
  };

  const isGuest = !!token && user?.role_id === 0;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        updateToken,
        isAuthenticated: !!token && !!user,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

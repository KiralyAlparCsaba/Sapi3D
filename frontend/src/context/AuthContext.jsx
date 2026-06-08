import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { closeSessionAndRedirect } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [user, setUser] = useState(null);

  // Initialize user from token when component mounts or token changes
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        if (decoded.exp < now) {
          // Token expired — close session on backend then redirect to login
          closeSessionAndRedirect();
          setToken(null);
          setUser(null);
        } else {
          // Token valid
          setUser({
            user_id: decoded.user_id,
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

  // Save token to sessionStorage whenever it changes
  useEffect(() => {
    if (token) {
      sessionStorage.setItem('token', token);
    } else {
      sessionStorage.removeItem('token');
    }
  }, [token]);

  // Percenkénti token lejárat ellenőrzés — lefedi azt az esetet amikor
  // a user nyitva hagyja a tabot és a token csendben lejár (nincs API hívás)
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
    }, 60_000); // percenként ellenőriz

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

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        updateToken,
        isAuthenticated: !!token && !!user,
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

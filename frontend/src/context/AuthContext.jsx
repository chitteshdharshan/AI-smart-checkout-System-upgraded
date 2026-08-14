import React, { createContext, useState, useEffect } from "react";
import API from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (token) {
        try {
          const res = await API.get("/auth/profile");
          if (res.data.success) {
            setUser(res.data.user);
          }
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUserProfile();
  }, [token]);

  // Login handler (Step 2.16 & 2.17)
  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    if (res.data.success) {
      const jwtToken = res.data.token;
      localStorage.setItem("token", jwtToken);
      setToken(jwtToken);
      setUser(res.data.user);
      return res.data;
    }
  };

  // Register handler (Step 2.16 & 2.17)
  const register = async (name, email, password) => {
    const res = await API.post("/auth/register", { name, email, password });
    if (res.data.success) {
      const jwtToken = res.data.token;
      localStorage.setItem("token", jwtToken);
      setToken(jwtToken);
      setUser(res.data.user);
      return res.data;
    }
  };

  // Logout handler (Step 2.18)
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

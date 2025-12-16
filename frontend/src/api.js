import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const setToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
  }
};

const handleTokenFromStorage = () => {
  const stored = localStorage.getItem("token");
  if (stored) {
    axios.defaults.headers.common.Authorization = `Bearer ${stored}`;
  }
};

handleTokenFromStorage();

export const api = axios.create({
  baseURL: API_URL,
});

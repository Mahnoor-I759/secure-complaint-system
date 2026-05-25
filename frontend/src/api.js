import axios from 'axios';

const API = axios.create({
  baseURL: 'https://your-railway-url.up.railway.app',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
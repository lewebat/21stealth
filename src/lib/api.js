import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auto-unwrap .data
api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)

export default api

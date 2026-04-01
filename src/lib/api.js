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

// Attach app key to every request
api.interceptors.request.use((config) => {
  const key = import.meta.env.VITE_APP_KEY
  if (key) config.headers['X-App-Key'] = key
  return config
})

export default api

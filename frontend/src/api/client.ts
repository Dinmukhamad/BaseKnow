import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

// Access token stored in module-level memory only — never in localStorage or
// sessionStorage. This means XSS cannot read the token via document.* APIs.
// Trade-off: the token is lost on page reload and must be recovered via the
// HttpOnly refresh-token cookie (see the 401 interceptor below).
let _accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

function redirectToLogin() {
  _accessToken = null
  window.location.assign(`${window.location.origin}${window.location.pathname}#/login`)
}

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  // Required so the browser sends the refresh-token cookie on /auth/* calls.
  // The server's CORS config must reply with Access-Control-Allow-Credentials: true
  // and a specific (non-wildcard) Access-Control-Allow-Origin.
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      try {
        // No body — the refresh token is read from the HttpOnly cookie by the server.
        const { data } = await axios.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        )
        setAccessToken(data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        setAccessToken(null)
        redirectToLogin()
      }
    }
    return Promise.reject(error)
  },
)

export default api

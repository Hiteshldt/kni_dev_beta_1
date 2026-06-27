import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// ─── Where is the API? ───────────────────────────────────────────────────────
// On a physical phone, "localhost" means the phone, not your laptop. Expo's dev
// server already knows the laptop's LAN IP (it's how Expo Go reaches the bundle),
// so we reuse it and just swap the port to the API's 3333. The user can override
// this from the login screen (persisted), e.g. for a deployed API.
const API_PORT = 3333;

function guessBaseUrl(): string {
  // 1) A built app (APK / store) ships a fixed API URL via app config `extra.apiUrl`.
  const configured = (Constants.expoConfig as any)?.extra?.apiUrl;
  if (configured) return String(configured).replace(/\/$/, '');

  // 2) In Expo Go (dev), reuse the laptop's LAN IP that serves the bundle and
  //    swap the port to the API's. hostUri = "192.168.1.74:8081" → :3333/api
  const host =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.expoGoConfig?.debuggerHost ||
    '';
  const ip = String(host).split(':')[0];
  if (ip) return `http://${ip}:${API_PORT}/api`;
  return `http://localhost:${API_PORT}/api`;
}

const BASE_KEY = 'kanni_api_base';
const TOKEN_KEY = 'kanni_token';

let baseUrl = guessBaseUrl();
let token: string | null = null;

export const Api = {
  baseUrl: () => baseUrl,
  defaultBaseUrl: guessBaseUrl,

  async init() {
    const savedBase = await SecureStore.getItemAsync(BASE_KEY);
    if (savedBase) baseUrl = savedBase;
    token = await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async setBaseUrl(url: string) {
    baseUrl = url.replace(/\/$/, '');
    await SecureStore.setItemAsync(BASE_KEY, baseUrl);
  },

  getToken: () => token,
  async setToken(t: string | null) {
    token = t;
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async request<T = any>(
    method: string,
    path: string,
    body?: any,
  ): Promise<T> {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const m = data && (data.message || data.error);
      throw new ApiError(Array.isArray(m) ? m.join(', ') : m || res.statusText, res.status);
    }
    return data as T;
  },

  get: <T = any>(p: string) => Api.request<T>('GET', p),
  post: <T = any>(p: string, b?: any) => Api.request<T>('POST', p, b),

  // Server origin without the /api suffix — used to resolve uploaded image paths
  // (which are served at /uploads, outside the API prefix).
  origin: () => baseUrl.replace(/\/api\/?$/, ''),

  // Resolve a stored image path ("/uploads/x.jpg") to a full URL the phone can load.
  imageUrl: (path?: string) =>
    !path ? undefined : /^https?:\/\//.test(path) ? path : Api.origin() + path,

  // Multipart upload of a local file URI (from expo-image-picker). Returns { path }.
  async upload(fileUri: string): Promise<{ path: string }> {
    const filename = fileUri.split('/').pop() || 'photo.jpg';
    const type = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const form = new FormData();
    form.append('file', { uri: fileUri, name: filename, type } as any);
    const res = await fetch(baseUrl + '/uploads', {
      method: 'POST',
      headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: form as any,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const m = data && (data.message || data.error);
      throw new ApiError(Array.isArray(m) ? m.join(', ') : m || res.statusText, res.status);
    }
    return data;
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

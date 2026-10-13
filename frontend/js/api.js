/**
 * BoloYaar AI — API Client
 * Handles all HTTP requests to Django backend with JWT auth.
 */

const API = {
  // ---- Token Management ----
  getAccessToken() { return localStorage.getItem('by_access'); },
  getRefreshToken() { return localStorage.getItem('by_refresh'); },
  setTokens(access, refresh) {
    localStorage.setItem('by_access', access);
    if (refresh) localStorage.setItem('by_refresh', refresh);
  },
  clearTokens() {
    localStorage.removeItem('by_access');
    localStorage.removeItem('by_refresh');
    localStorage.removeItem('by_user');
  },
  isLoggedIn() { return !!this.getAccessToken(); },

  // ---- Base Request ----
  async request(path, options = {}) {
    const url = `${CONFIG.DJANGO_BASE_URL}${path}`;
    const headers = {
      ...(options.headers || {}),
    };

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res = await fetch(url, { ...options, headers });

    // Try token refresh on 401
    if (res.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
        res = await fetch(url, { ...options, headers });
      } else {
        this.clearTokens();
        window.showScreen('auth-screen');
        return;
      }
    }

    return res;
  },

  async refreshToken() {
    try {
      const res = await fetch(`${CONFIG.DJANGO_BASE_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.getRefreshToken() }),
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.access, data.refresh);
        return true;
      }
      return false;
    } catch { return false; }
  },

  // ---- Auth ----
  async login(email, password) {
    const res = await this.request('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      this.setTokens(data.access, data.refresh);
      localStorage.setItem('by_user', JSON.stringify(data.user));
    }
    return { ok: res.ok, data };
  },

  async register(payload) {
    const res = await this.request('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      this.setTokens(data.access, data.refresh);
      localStorage.setItem('by_user', JSON.stringify(data.user));
    }
    return { ok: res.ok, data };
  },

  async logout() {
    await this.request('/api/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh: this.getRefreshToken() }),
    }).catch(() => {});
    this.clearTokens();
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('by_user')); } catch { return null; }
  },

  // ---- Conversations ----
  async getConversations() {
    const res = await this.request('/api/conversations/');
    return res?.ok ? await res.json() : [];
  },

  async createConversation(title = 'New Conversation') {
    const res = await this.request('/api/conversations/', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return res?.ok ? await res.json() : null;
  },

  async getConversation(id) {
    const res = await this.request(`/api/conversations/${id}/`);
    return res?.ok ? await res.json() : null;
  },

  async sendTextMessage(content, conversationId = null) {
    const res = await this.request('/api/conversations/send-text/', {
      method: 'POST',
      body: JSON.stringify({ content, conversation_id: conversationId }),
    });
    return res ? { ok: res.ok, data: await res.json() } : { ok: false, data: { error: 'Network error' } };
  },

  // ---- Voice Pipeline ----
  async voicePipeline(audioBlob, conversationId = null) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    if (conversationId) formData.append('conversation_id', conversationId);

    const res = await this.request('/api/voice/process/', {
      method: 'POST',
      body: formData,
    });
    return res ? { ok: res.ok, data: await res.json() } : { ok: false, data: { error: 'Network error' } };
  },
};

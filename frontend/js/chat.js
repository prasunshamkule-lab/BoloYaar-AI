/**
 * BoloYaar AI — Chat Module
 * Manages conversation state, message rendering, and sending.
 */

const CHAT = {
  currentConversationId: null,

  clearMessages() {
    document.getElementById('messages-container').innerHTML = '';
    document.getElementById('welcome-state').style.display = '';
  },

  showWelcome() {
    document.getElementById('welcome-state').style.display = '';
    document.getElementById('messages-container').innerHTML = '';
  },

  hideWelcome() {
    document.getElementById('welcome-state').style.display = 'none';
  },

  addMessage(role, content, animate = true) {
    this.hideWelcome();
    const container = document.getElementById('messages-container');

    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    if (!animate) messageEl.style.animation = 'none';

    const initials = role === 'user'
      ? (API.getUser()?.display_name?.[0] || API.getUser()?.username?.[0] || 'U').toUpperCase()
      : 'AI';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageEl.innerHTML = `
      <div class="message-avatar">${initials}</div>
      <div>
        <div class="message-bubble">${escapeHtml(content)}</div>
        <div class="message-time">${time}</div>
      </div>
    `;

    container.appendChild(messageEl);
    this.scrollToBottom();
  },

  showTyping() {
    document.getElementById('typing-indicator').classList.remove('hidden');
    this.scrollToBottom();
  },

  hideTyping() {
    document.getElementById('typing-indicator').classList.add('hidden');
  },

  scrollToBottom() {
    const chat = document.getElementById('chat-container');
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  },

  // ---- Send audio via voice pipeline ----
  async sendAudioMessage(audioBlob) {
    try {
      this.showTyping();
      const { ok, data } = await API.voicePipeline(audioBlob, this.currentConversationId);
      this.hideTyping();

      if (!ok) {
        showToast(data?.error || 'Something went wrong. Please try again.', 'error');
        return;
      }

      // Update conversation ID if new conversation was created
      if (data.conversation_id) {
        this.currentConversationId = data.conversation_id;
        await SIDEBAR.loadConversations();
        SIDEBAR.setActiveConversation(data.conversation_id);
      }

      // Add messages to chat
      if (data.transcript) this.addMessage('user', data.transcript);
      if (data.response) this.addMessage('assistant', data.response);

      // Play TTS audio
      if (data.audio_url) {
        playAudio(data.audio_url);
      }

    } catch (err) {
      this.hideTyping();
      showToast('Network error. Please check your connection.', 'error');
    }
  },

  // ---- Load conversation from sidebar ----
  async loadConversation(id) {
    this.currentConversationId = id;
    this.clearMessages();
    this.hideWelcome();

    const conv = await API.getConversation(id);
    if (!conv) {
      showToast('Failed to load conversation.', 'error');
      return;
    }

    if (conv.messages.length === 0) {
      this.showWelcome();
    } else {
      conv.messages.forEach(msg => {
        this.addMessage(msg.role, msg.content, false);
      });
    }

    // Update header title
    document.querySelector('.app-title').textContent = conv.title.length > 20
      ? conv.title.substring(0, 20) + '…'
      : conv.title;
  },
};

// ---- Sidebar ----
const SIDEBAR = {
  async loadConversations() {
    const list = document.getElementById('conversations-list');
    const welcomeList = document.getElementById('welcome-recent-list');
    const conversations = await API.getConversations();

    if (!conversations || conversations.length === 0) {
      if (list) list.innerHTML = '<div class="conversations-empty">No past conversations yet.<br/>Speak or type to begin.</div>';
      if (welcomeList) welcomeList.innerHTML = '<div class="welcome-empty-hint">Your saved chats will appear here.</div>';
      return;
    }

    // Populate sidebar list
    if (list) {
      list.innerHTML = conversations.map(conv => `
        <div class="conv-item" id="conv-${conv.id}" onclick="SIDEBAR.selectConversation('${conv.id}')">
          <div class="conv-item-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="conv-item-content">
            <div class="conv-item-title">${escapeHtml(conv.title)}</div>
            <div class="conv-item-meta">${conv.message_count} messages · ${formatRelativeTime(conv.updated_at)}</div>
          </div>
        </div>
      `).join('');
    }

    // Populate welcome screen recent chats (top 3)
    if (welcomeList) {
      const top3 = conversations.slice(0, 3);
      welcomeList.innerHTML = top3.map(conv => `
        <button class="welcome-recent-card" onclick="SIDEBAR.selectConversation('${conv.id}')">
          <div class="recent-card-header">
            <span class="recent-card-title">${escapeHtml(conv.title)}</span>
            <span class="recent-card-time">${formatRelativeTime(conv.updated_at)}</span>
          </div>
          <div class="recent-card-preview">${escapeHtml(conv.last_message?.content || 'Voice message')}</div>
        </button>
      `).join('');
    }
  },

  async selectConversation(id) {
    this.setActiveConversation(id);
    await CHAT.loadConversation(id);
    if (window.innerWidth < 1024) toggleSidebar();
  },

  setActiveConversation(id) {
    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`conv-${id}`);
    if (el) el.classList.add('active');
  },
};

// ---- New Conversation ----
async function startNewConversation() {
  CHAT.currentConversationId = null;
  CHAT.showWelcome();
  document.querySelector('.app-title').textContent = 'BoloYaar AI';
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
  if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) toggleSidebar();
  }
}

// ---- Text input fallback ----
async function handleTextSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('text-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;

  // Show user message immediately
  CHAT.hideWelcome();
  CHAT.addMessage('user', text);
  CHAT.showTyping();

  try {
    const { ok, data } = await API.sendTextMessage(text, CHAT.currentConversationId);
    CHAT.hideTyping();

    if (!ok) {
      showToast(data?.error || 'Failed to get response. Please try again.', 'error');
      input.disabled = false;
      input.focus();
      return;
    }

    if (data.conversation_id) {
      CHAT.currentConversationId = data.conversation_id;
      await SIDEBAR.loadConversations();
      SIDEBAR.setActiveConversation(data.conversation_id);
    }

    if (data.response) {
      CHAT.addMessage('assistant', data.response);

      // Get TTS for the response (non-blocking)
      try {
        const ttsRes = await fetch(`${CONFIG.FLASK_AI_URL}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.response }),
        });
        if (ttsRes.ok) {
          const audioBlob = await ttsRes.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          playAudio(audioUrl);
        }
      } catch (ttsErr) {
        console.warn('TTS playback error:', ttsErr);
      }
    } else {
      showToast('AI did not respond. Please try again.', 'error');
    }
  } catch (err) {
    CHAT.hideTyping();
    showToast('Failed to connect to AI service. Please refresh and try again.', 'error');
  }

  input.disabled = false;
  input.focus();
}

// ---- Utilities ----
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

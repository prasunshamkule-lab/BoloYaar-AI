/**
 * BoloYaar AI — App Entry Point
 * Initializes the app, manages screen transitions, and sets up event listeners.
 */

// ---- Screen Management ----
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
    requestAnimationFrame(() => target.classList.add('active'));
  }
}

// ---- Sidebar ----
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = sidebar.classList.contains('open');
  sidebar.classList.toggle('open', !isOpen);
  overlay.classList.toggle('hidden', isOpen);
}

// ---- Toast Notification ----
let _toastTimer = null;
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.getElementById('toast');
  clearTimeout(_toastTimer);
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  _toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
}

// ---- Mic Button ----
function setupMicButton() {
  const micBtn = document.getElementById('mic-button');

  // Toggle on click (for mobile touch)
  micBtn.addEventListener('click', () => {
    if (VOICE.isProcessing) return;
    if (VOICE.isRecording) {
      VOICE.stopRecording();
    } else {
      VOICE.startRecording();
    }
  });

  // Press-and-hold support (desktop)
  micBtn.addEventListener('mousedown', (e) => {
    // Only use mousedown if not on a touch device
    if (e.pointerType === 'mouse') {
      VOICE.startRecording();
    }
  });
  micBtn.addEventListener('mouseup', (e) => {
    if (e.pointerType === 'mouse' && VOICE.isRecording) {
      VOICE.stopRecording();
    }
  });
  micBtn.addEventListener('mouseleave', (e) => {
    if (VOICE.isRecording) {
      VOICE.stopRecording();
    }
  });
}

// ---- App Initialization ----
async function initApp() {
  const user = API.getUser();
  if (!user) {
    showScreen('auth-screen');
    return;
  }

  showScreen('app-screen');

  // Populate user info in sidebar
  document.getElementById('sidebar-user-name').textContent = user.display_name || user.username;
  document.getElementById('sidebar-user-email').textContent = user.email;
  document.getElementById('sidebar-avatar').textContent =
    (user.display_name || user.username || 'U')[0].toUpperCase();

  // Load conversation history
  await SIDEBAR.loadConversations();

  // Setup mic button
  setupMicButton();

  // Check AI service health (non-blocking)
  checkAIHealth();
}

async function checkAIHealth() {
  try {
    const res = await fetch(`${CONFIG.DJANGO_BASE_URL}/api/voice/health/`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.flask_ai?.status !== 'ok') {
        showToast('AI service is starting up. Please wait a moment.', 'info', 5000);
      }
    }
  } catch {
    // Silently fail — health check is informational only
  }
}

// ---- Global keyboard shortcuts ----
document.addEventListener('keydown', (e) => {
  // Space bar = hold to record (when not typing in input)
  if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    if (!VOICE.isRecording && !VOICE.isProcessing) {
      VOICE.startRecording();
    }
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && VOICE.isRecording) {
    VOICE.stopRecording();
  }
});

// ---- Bootstrap ----
document.addEventListener('DOMContentLoaded', () => {
  if (API.isLoggedIn()) {
    initApp();
  } else {
    showScreen('auth-screen');
  }
});

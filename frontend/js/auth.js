/**
 * BoloYaar AI — Auth Module
 * Handles login, register, logout UI interactions.
 */

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'false');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  setButtonLoading(btn, true);
  errorEl.classList.add('hidden');

  const { ok, data } = await API.login(email, password);

  setButtonLoading(btn, false);
  if (ok) {
    showToast('Welcome back! 👋', 'success');
    initApp();
  } else {
    const msg = data?.detail || data?.non_field_errors?.[0] || 'Invalid email or password.';
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const btn = document.getElementById('register-btn');
  const errorEl = document.getElementById('register-error');

  const displayName = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const passwordConfirm = document.getElementById('reg-password-confirm').value;

  if (password !== passwordConfirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.remove('hidden');
    return;
  }

  setButtonLoading(btn, true);
  errorEl.classList.add('hidden');

  const { ok, data } = await API.register({
    display_name: displayName,
    username,
    email,
    password,
    password_confirm: passwordConfirm,
  });

  setButtonLoading(btn, false);
  if (ok) {
    showToast('Account created! Welcome to BoloYaar AI 🎉', 'success');
    initApp();
  } else {
    const firstError = Object.values(data)?.[0];
    const msg = Array.isArray(firstError) ? firstError[0] : (firstError || 'Registration failed.');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
}

async function handleLogout() {
  await API.logout();
  CHAT.currentConversationId = null;
  CHAT.clearMessages();
  showScreen('auth-screen');
  showToast('Logged out successfully.', 'info');
}

function setButtonLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  spinner.classList.toggle('hidden', !loading);
}

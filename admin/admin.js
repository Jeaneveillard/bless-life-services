/**
 * Admin UI for Bless Life Services content edits.
 *
 * API_BASE must be the real Cloudflare Worker URL after Jean deploys.
 * Leave empty until then — the UI will show a clear setup message.
 *
 * Local testing against wrangler:
 *   localStorage.setItem('API_BASE', 'http://127.0.0.1:8787');
 *   then reload this page (serve admin from http://localhost:5500 for CORS).
 */
var DEFAULT_API_BASE = 'https://bless-life-admin-api.jeaneveillard.workers.dev';
var API_BASE = DEFAULT_API_BASE;

function isUsableApiBase(url) {
  return typeof url === 'string'
    && /^https?:\/\//i.test(url)
    && url.indexOf('<') === -1
    && url.indexOf(' ') === -1;
}

if (typeof localStorage !== 'undefined' && localStorage.API_BASE) {
  var stored = String(localStorage.API_BASE).replace(/\/$/, '');
  if (isUsableApiBase(stored)) {
    API_BASE = stored;
  } else {
    // Drop stale placeholders like "...<account>.workers.dev"
    try { localStorage.removeItem('API_BASE'); } catch (e) { /* ignore */ }
  }
}

function apiConfigured() {
  return isUsableApiBase(API_BASE);
}

function apiNotReadyMessage() {
  return 'Admin API is not connected yet. Jean must deploy the Cloudflare Worker, then set the Worker URL in admin/admin.js (or localStorage.API_BASE).';
}

var SUCCESS_MSG = 'Saved. The live site updates in about 1–2 minutes.';
var loginView = document.getElementById('login-view');
var resetView = document.getElementById('reset-view');
var formView = document.getElementById('form-view');
var statusEl = document.getElementById('status');
var loginForm = document.getElementById('login-form');
var resetForm = document.getElementById('reset-form');
var contentForm = document.getElementById('content-form');
var logoutBtn = document.getElementById('logout-btn');
var showResetBtn = document.getElementById('show-reset-btn');
var cancelResetBtn = document.getElementById('cancel-reset-btn');
var changePasswordBtn = document.getElementById('change-password-btn');

function setStatus(message, kind) {
  if (!message) {
    statusEl.hidden = true;
    statusEl.textContent = '';
    statusEl.className = 'status';
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = 'status status--' + (kind || 'info');
}

function authHeaders() {
  var token = sessionStorage.adminToken;
  var headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }
  return headers;
}

function plainError(err, fallback) {
  if (err && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return fallback || 'Something went wrong. Try again.';
}

async function parseJsonResponse(res) {
  var data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  return data;
}

function getField(path) {
  return contentForm.querySelector('[data-path="' + path + '"]');
}

function setFieldValue(path, value) {
  var el = getField(path);
  if (!el) return;
  el.value = value == null ? '' : String(value);
}

function fieldValue(path) {
  var el = getField(path);
  return el ? String(el.value || '').trim() : '';
}

function updateImageLabel(index, path) {
  var label = contentForm.querySelector('[data-image-label="' + index + '"]');
  if (!label) return;
  label.textContent = path ? path : 'No image set';
}

function populateForm(data) {
  setFieldValue('notary.price', data.notary.price);
  setFieldValue('notary.stripe', data.notary.stripe);
  setFieldValue('notary.paypal', data.notary.paypal);

  setFieldValue('cpr.price', data.cpr.price);
  setFieldValue('cpr.stripe', data.cpr.stripe);
  setFieldValue('cpr.paypal', data.cpr.paypal);

  setFieldValue('officiant.deposit', data.officiant.deposit);
  setFieldValue('officiant.stripe', data.officiant.stripe);
  setFieldValue('officiant.paypal', data.officiant.paypal);

  setFieldValue('decoration.deposit', data.decoration.deposit);
  setFieldValue('decoration.stripe', data.decoration.stripe);
  setFieldValue('decoration.paypal', data.decoration.paypal);

  setFieldValue('candleLeadTime', data.candleLeadTime);

  for (var i = 0; i < 3; i++) {
    var c = data.candles[i] || {};
    setFieldValue('candles.' + i + '.name', c.name);
    setFieldValue('candles.' + i + '.description', c.description);
    setFieldValue('candles.' + i + '.price', c.price);
    setFieldValue('candles.' + i + '.size', c.size);
    setFieldValue('candles.' + i + '.image', c.image);
    setFieldValue('candles.' + i + '.stripe', c.stripe);
    setFieldValue('candles.' + i + '.paypal', c.paypal);
    updateImageLabel(i, c.image || '');
  }

  setFieldValue('misc.notaryExpiration', data.misc.notaryExpiration);
  setFieldValue('misc.hours', data.misc.hours);
  setFieldValue('misc.youtube', data.misc.youtube);
}

/** Build payload matching content/site.json exactly. */
function buildPayload() {
  return {
    notary: {
      price: fieldValue('notary.price'),
      stripe: fieldValue('notary.stripe'),
      paypal: fieldValue('notary.paypal'),
    },
    cpr: {
      price: fieldValue('cpr.price'),
      stripe: fieldValue('cpr.stripe'),
      paypal: fieldValue('cpr.paypal'),
    },
    officiant: {
      deposit: fieldValue('officiant.deposit'),
      stripe: fieldValue('officiant.stripe'),
      paypal: fieldValue('officiant.paypal'),
    },
    decoration: {
      deposit: fieldValue('decoration.deposit'),
      stripe: fieldValue('decoration.stripe'),
      paypal: fieldValue('decoration.paypal'),
    },
    candleLeadTime: fieldValue('candleLeadTime'),
    candles: [0, 1, 2].map(function (i) {
      return {
        name: fieldValue('candles.' + i + '.name'),
        description: fieldValue('candles.' + i + '.description'),
        price: fieldValue('candles.' + i + '.price'),
        size: fieldValue('candles.' + i + '.size'),
        image: fieldValue('candles.' + i + '.image'),
        stripe: fieldValue('candles.' + i + '.stripe'),
        paypal: fieldValue('candles.' + i + '.paypal'),
      };
    }),
    misc: {
      notaryExpiration: fieldValue('misc.notaryExpiration'),
      hours: fieldValue('misc.hours'),
      youtube: fieldValue('misc.youtube'),
    },
  };
}

async function loadSiteContent() {
  var res = await fetch('../content/site.json', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Could not load current content. Check that content/site.json is available.');
  }
  return res.json();
}

function applyAdminBranding() {
  var role = sessionStorage.adminRole || '';
  var titleEl = document.getElementById('admin-title');
  var docTitle = document.getElementById('admin-doc-title') || document.querySelector('title');
  var heading = role === 'dev' ? 'Content DEV Admin' : 'Content Admin';
  var pageTitle = role === 'dev'
    ? 'DEV Admin — Bless Life Services'
    : 'Admin — Bless Life Services';
  if (titleEl) titleEl.textContent = heading;
  if (docTitle) docTitle.textContent = pageTitle;
}

function showFormView() {
  loginView.hidden = true;
  resetView.hidden = true;
  formView.hidden = false;
  applyAdminBranding();
}

function showLoginView() {
  formView.hidden = true;
  resetView.hidden = true;
  loginView.hidden = false;
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminRole');
  sessionStorage.removeItem('adminUsername');
  var titleEl = document.getElementById('admin-title');
  var docTitle = document.getElementById('admin-doc-title') || document.querySelector('title');
  if (titleEl) titleEl.textContent = 'Content Admin';
  if (docTitle) docTitle.textContent = 'Admin — Bless Life Services';
}

function showResetView() {
  formView.hidden = true;
  loginView.hidden = true;
  resetView.hidden = false;
  setStatus('', null);
}

function extensionForType(type, fileName) {
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  if (type === 'image/jpeg') {
    var lower = (fileName || '').toLowerCase();
    if (lower.endsWith('.jpeg')) return '.jpeg';
    return '.jpg';
  }
  return '';
}

function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      var result = String(reader.result || '');
      var comma = result.indexOf(',');
      if (comma === -1) {
        reject(new Error('Could not read image file.'));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.onerror = function () {
      reject(new Error('Could not read image file.'));
    };
    reader.readAsDataURL(file);
  });
}

async function uploadCandleImage(index, file) {
  if (!sessionStorage.adminToken) {
    throw new Error('Please sign in again.');
  }
  var allowed = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1 };
  if (!allowed[file.type]) {
    throw new Error('Use a JPEG, PNG, or WebP image.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Image must be 2 MB or smaller.');
  }

  // Always force candle-N basename; never send the browser's original file name.
  var slot = index + 1;
  if (slot < 1 || slot > 3) {
    throw new Error('Candle photo slot must be 1, 2, or 3.');
  }
  var ext = extensionForType(file.type, file.name);
  if (!ext || !/^\.(jpg|jpeg|png|webp)$/.test(ext)) {
    throw new Error('Use a JPEG, PNG, or WebP image.');
  }
  var name = 'candle-' + slot + ext;
  var contentBase64 = await fileToBase64(file);

  var res = await fetch(API_BASE + '/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: name,
      contentType: file.type,
      contentBase64: contentBase64,
    }),
  });
  var data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error((data && data.error) || 'Upload failed. Check your connection and try again.');
  }
  if (!data || !data.path) {
    throw new Error('Upload succeeded but no path was returned.');
  }
  setFieldValue('candles.' + index + '.image', data.path);
  updateImageLabel(index, data.path);
  return data.path;
}

loginForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  setStatus('', null);
  if (!apiConfigured()) {
    setStatus(apiNotReadyMessage(), 'error');
    return;
  }
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  var submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    var res = await fetch(API_BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });
    var data = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error(
        (data && data.error)
          || (res.status === 401 ? 'Wrong username or password.' : 'Could not sign in. Check your connection.')
      );
    }
    if (!data || !data.token) {
      throw new Error('Login response was incomplete.');
    }
    sessionStorage.adminToken = data.token;
    sessionStorage.adminRole = data.role || '';
    sessionStorage.adminUsername = data.username || '';
    document.getElementById('password').value = '';
    var site = await loadSiteContent();
    populateForm(site);
    showFormView();
    var who = data.username || data.role || '';
    setStatus('Signed in' + (who ? ' as ' + who : '') + '.', 'ok');
  } catch (err) {
    setStatus(plainError(err, 'Could not sign in. Check your connection.'), 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

contentForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  setStatus('', null);
  if (!sessionStorage.adminToken) {
    showLoginView();
    setStatus('Please sign in again.', 'error');
    return;
  }

  var saveBtn = contentForm.querySelector('button[type="submit"]');
  saveBtn.disabled = true;

  if (!apiConfigured()) {
    saveBtn.disabled = false;
    setStatus(apiNotReadyMessage(), 'error');
    return;
  }

  try {
    var payload = buildPayload();
    var res = await fetch(API_BASE + '/api/save', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    var data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        showLoginView();
        throw new Error('Session expired. Please sign in again.');
      }
      throw new Error(
        (data && data.error)
          || (res.status === 400
            ? 'Some fields look invalid. Check payment and YouTube links use https://.'
            : 'Save failed. Check your connection and try again.')
      );
    }
    setStatus(SUCCESS_MSG, 'ok');
  } catch (err) {
    setStatus(plainError(err, 'Save failed. Check your connection and try again.'), 'error');
  } finally {
    saveBtn.disabled = false;
  }
});

contentForm.addEventListener('change', async function (event) {
  var input = event.target;
  if (!input || !input.matches('[data-candle-upload]')) return;

  var index = Number(input.getAttribute('data-candle-upload'));
  var file = input.files && input.files[0];
  if (!file) return;

  setStatus('Uploading photo for candle ' + (index + 1) + '…', 'info');
  try {
    var path = await uploadCandleImage(index, file);
    setStatus('Photo uploaded: ' + path + '. Remember to Save when you finish editing.', 'ok');
  } catch (err) {
    setStatus(plainError(err, 'Upload failed.'), 'error');
  } finally {
    input.value = '';
  }
});

logoutBtn.addEventListener('click', function () {
  showLoginView();
  setStatus('Signed out.', 'info');
});

showResetBtn.addEventListener('click', function () {
  showResetView();
});

cancelResetBtn.addEventListener('click', function () {
  showLoginView();
});

document.addEventListener('click', function (event) {
  var btn = event.target.closest('[data-toggle-password]');
  if (!btn) return;
  var id = btn.getAttribute('data-toggle-password');
  var input = document.getElementById(id);
  if (!input) return;
  var showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
  var label = showing ? 'Show password' : 'Hide password';
  if (id === 'reset-recovery') {
    label = showing ? 'Show recovery key' : 'Hide recovery key';
  }
  btn.setAttribute('aria-label', label);
});

resetForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  setStatus('', null);
  if (!apiConfigured()) {
    setStatus(apiNotReadyMessage(), 'error');
    return;
  }
  var newPw = document.getElementById('reset-new').value;
  var confirmPw = document.getElementById('reset-confirm').value;
  if (newPw !== confirmPw) {
    setStatus('New password and confirmation do not match.', 'error');
    return;
  }
  var submitBtn = resetForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    var res = await fetch(API_BASE + '/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('reset-username').value,
        email: document.getElementById('reset-email').value,
        recoveryPassword: document.getElementById('reset-recovery').value,
        newPassword: newPw,
      }),
    });
    var data = await parseJsonResponse(res);
    if (!res.ok) {
      throw new Error((data && data.error) || 'Could not reset password.');
    }
    resetForm.reset();
    showLoginView();
    setStatus('Password updated. Sign in with your new password.', 'ok');
  } catch (err) {
    setStatus(plainError(err, 'Could not reset password.'), 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

changePasswordBtn.addEventListener('click', async function () {
  setStatus('', null);
  if (!apiConfigured()) {
    setStatus(apiNotReadyMessage(), 'error');
    return;
  }
  var oldPw = document.getElementById('change-old').value;
  var newPw = document.getElementById('change-new').value;
  var confirmPw = document.getElementById('change-confirm').value;
  if (!oldPw || !newPw) {
    setStatus('Enter your current password and a new password.', 'error');
    return;
  }
  if (newPw !== confirmPw) {
    setStatus('New password and confirmation do not match.', 'error');
    return;
  }
  if (!sessionStorage.adminToken) {
    showLoginView();
    setStatus('Please sign in again.', 'error');
    return;
  }
  changePasswordBtn.disabled = true;
  try {
    var res = await fetch(API_BASE + '/api/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    });
    var data = await parseJsonResponse(res);
    if (!res.ok) {
      if (res.status === 401) {
        showLoginView();
        throw new Error('Session expired. Please sign in again.');
      }
      throw new Error((data && data.error) || 'Could not update password.');
    }
    document.getElementById('change-old').value = '';
    document.getElementById('change-new').value = '';
    document.getElementById('change-confirm').value = '';
    setStatus('Password updated.', 'ok');
  } catch (err) {
    setStatus(plainError(err, 'Could not update password.'), 'error');
  } finally {
    changePasswordBtn.disabled = false;
  }
});

(function init() {
  if (!apiConfigured()) {
    setStatus(apiNotReadyMessage(), 'info');
  }
  if (sessionStorage.adminToken) {
    loadSiteContent()
      .then(function (site) {
        populateForm(site);
        showFormView();
      })
      .catch(function () {
        showLoginView();
      });
  }
})();

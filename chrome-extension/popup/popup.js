// AI Job Copilot — Popup Script

const SUPPORTED_DOMAINS = [
  { domain: 'linkedin.com', label: 'LinkedIn Easy Apply' },
  { domain: 'greenhouse.io', label: 'Greenhouse' },
  { domain: 'lever.co', label: 'Lever' },
];

function showState(id) {
  document.getElementById('state-loading').classList.add('hidden');
  document.getElementById('state-signed-out').classList.add('hidden');
  document.getElementById('state-signed-in').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
}

async function getActiveTabUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url || '';
  } catch {
    return '';
  }
}

function detectSupportedSite(url) {
  for (const { domain, label } of SUPPORTED_DOMAINS) {
    if (url.includes(domain)) return label;
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Check stored session
  const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });

  if (!response.success || !response.session) {
    showState('state-signed-out');

    document.getElementById('btn-connect').addEventListener('click', async () => {
      document.getElementById('btn-connect').textContent = 'Connecting...';
      document.getElementById('btn-connect').disabled = true;

      const result = await chrome.runtime.sendMessage({ type: 'AUTH_START' });

      if (result.success) {
        // Re-render as signed in
        document.getElementById('user-email').textContent = result.user_email || 'Connected';
        const url = await getActiveTabUrl();
        updateTabStatus(url);
        showState('state-signed-in');
        bindSignedInHandlers();
      } else {
        document.getElementById('btn-connect').textContent = 'Connect Account';
        document.getElementById('btn-connect').disabled = false;
      }
    });
  } else {
    document.getElementById('user-email').textContent = response.session.user_email || 'Connected';
    const url = await getActiveTabUrl();
    updateTabStatus(url);
    showState('state-signed-in');
    bindSignedInHandlers();
  }
});

function updateTabStatus(url) {
  const statusEl = document.getElementById('tab-status');
  const match = detectSupportedSite(url);
  if (match) {
    statusEl.textContent = `✓ Autofill active — ${match} detected`;
    statusEl.classList.add('active');
  } else {
    statusEl.textContent = 'Navigate to LinkedIn, Greenhouse, or Lever to autofill';
    statusEl.classList.remove('active');
  }
}

function bindSignedInHandlers() {
  document.getElementById('btn-disconnect').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'AUTH_SIGNOUT' });
    showState('state-signed-out');
  });
}

// AI Job Copilot — Background Service Worker
// Handles auth, session storage, token refresh, and Supabase data fetching.
// Content scripts message this worker — they never touch chrome.storage.local directly.

const SUPABASE_URL = 'https://depsktlgcrlggegnyvnc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_P6KzMwI04nKTA5ENg8uPIg_F-CeC3Hg';
const REDIRECT_PATH = 'oauth';

// ── Helpers ────────────────────────────────────────────────────────────────

function getRedirectURL() {
  return chrome.identity.getRedirectURL(REDIRECT_PATH);
}

async function getStoredSession() {
  const result = await chrome.storage.local.get('aijc_session');
  return result.aijc_session || null;
}

async function storeSession(session) {
  await chrome.storage.local.set({ aijc_session: session });
}

async function clearSession() {
  await chrome.storage.local.remove('aijc_session');
}

async function fetchUserEmail(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email || null;
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

async function getValidAccessToken() {
  const session = await getStoredSession();
  if (!session) return null;

  // Refresh if expiring within 5 minutes
  if (session.expires_at - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(session.refresh_token);
    if (!refreshed) {
      await clearSession();
      return null;
    }
    const updated = { ...session, ...refreshed };
    await storeSession(updated);
    return updated.access_token;
  }

  return session.access_token;
}

// ── Supabase queries ───────────────────────────────────────────────────────

async function fetchResumeData(accessToken) {
  const url = `${SUPABASE_URL}/rest/v1/resumes?select=parsed_data&is_primary=eq.true&parsing_status=eq.completed&limit=1`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.parsed_data || null;
}

// ── Auth flow ──────────────────────────────────────────────────────────────

async function startAuth() {
  const redirectURL = getRedirectURL();

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?` + new URLSearchParams({
    provider: 'google',
    redirect_to: redirectURL,
    scopes: 'email profile',
    flow_type: 'implicit',
  }).toString();

  return new Promise((resolve) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          console.error('[AIJC] Auth failed:', chrome.runtime.lastError?.message);
          resolve({ success: false, error: 'Auth cancelled or failed' });
          return;
        }

        try {
          // Tokens come back in the URL hash fragment
          const hash = new URL(responseUrl).hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

          if (!accessToken) {
            resolve({ success: false, error: 'No access token in response' });
            return;
          }

          const userEmail = await fetchUserEmail(accessToken);

          const session = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Date.now() + expiresIn * 1000,
            user_email: userEmail,
          };

          await storeSession(session);
          resolve({ success: true, user_email: userEmail });
        } catch (err) {
          console.error('[AIJC] Error parsing auth response:', err);
          resolve({ success: false, error: err.message });
        }
      }
    );
  });
}

// ── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case 'AUTH_START': {
        const result = await startAuth();
        return result;
      }

      case 'AUTH_SIGNOUT': {
        await clearSession();
        return { success: true };
      }

      case 'GET_SESSION': {
        const session = await getStoredSession();
        if (!session) return { success: false, session: null };
        return { success: true, session: { user_email: session.user_email } };
      }

      case 'GET_RESUME_DATA': {
        const accessToken = await getValidAccessToken();
        if (!accessToken) return { success: false, error: 'Not authenticated' };
        const data = await fetchResumeData(accessToken);
        if (!data) return { success: false, error: 'No resume found' };
        return { success: true, data };
      }

      default:
        return { success: false, error: `Unknown message type: ${message.type}` };
    }
  };

  handle().then(sendResponse);
  return true; // Keep message channel open for async response
});

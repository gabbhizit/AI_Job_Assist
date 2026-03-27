// AI Job Copilot — Greenhouse Content Script
// boards.greenhouse.io application forms are server-rendered — no SPA observer needed.

(async function () {
  // ── Detect application form ──────────────────────────────────────────────

  const form =
    document.querySelector('form#application-form') ||
    document.querySelector('form[action*="applications"]') ||
    document.querySelector('form[action*="submit"]') ||
    document.querySelector('main form');

  if (!form) return; // Not an application page

  // ── Fetch resume data ────────────────────────────────────────────────────

  let resumeData = null;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RESUME_DATA' });
    if (response.success && response.data) {
      resumeData = response.data;
    }
  } catch (err) {
    console.warn('[AIJC] Greenhouse: failed to fetch resume data', err);
    return;
  }

  if (!resumeData) return;

  // ── Inject autofill button ───────────────────────────────────────────────

  window.AutofillCore.injectAutofillButton(() => {
    const count = window.AutofillCore.fillForm(form, resumeData);
    window.AutofillCore.showToast(
      count > 0 ? `Filled ${count} field${count !== 1 ? 's' : ''} ✓` : 'No matching fields found',
      count > 0 ? 'success' : 'info'
    );
  });
})();

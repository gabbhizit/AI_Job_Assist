// AI Job Copilot — Lever Content Script
// jobs.lever.co application forms — mostly server-rendered with some React.

(async function () {
  // ── Detect application form ──────────────────────────────────────────────

  const form =
    document.querySelector('.application-form') ||
    document.querySelector('form.posting-application') ||
    document.querySelector('[data-qa="application-form"]') ||
    document.querySelector('form[action*="apply"]') ||
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
    console.warn('[AIJC] Lever: failed to fetch resume data', err);
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

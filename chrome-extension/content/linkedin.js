// AI Job Copilot — LinkedIn Content Script
// Watches for the Easy Apply modal and injects the autofill button.
// Uses MutationObserver because the modal is injected dynamically by React.

(function () {
  let currentModal = null;
  let resumeData = null;
  let fetchingData = false;

  // ── Modal detection ──────────────────────────────────────────────────────

  function findEasyApplyModal() {
    // Primary: ARIA-based selector (stable across LinkedIn redesigns)
    return (
      document.querySelector('[role="dialog"][aria-label*="Easy Apply"]') ||
      document.querySelector('[role="dialog"][aria-labelledby*="easy-apply"]') ||
      // Fallback: class-based (may change, but included for coverage)
      document.querySelector('.jobs-easy-apply-modal') ||
      document.querySelector('[data-test-modal-id="easy-apply-modal"]')
    );
  }

  // ── Resume data ──────────────────────────────────────────────────────────

  async function ensureResumeData() {
    if (resumeData) return resumeData;
    if (fetchingData) return null;
    fetchingData = true;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_RESUME_DATA' });
      if (response.success && response.data) {
        resumeData = response.data;
        return resumeData;
      } else {
        console.warn('[AIJC] Could not load resume:', response.error);
        return null;
      }
    } finally {
      fetchingData = false;
    }
  }

  // ── Autofill handler ─────────────────────────────────────────────────────

  async function handleAutofillClick() {
    const modal = findEasyApplyModal();
    if (!modal) {
      window.AutofillCore.showToast('Easy Apply modal not found', 'error');
      return;
    }

    const data = await ensureResumeData();
    if (!data) {
      window.AutofillCore.showToast('Connect to AI Job Copilot first', 'error');
      return;
    }

    const count = window.AutofillCore.fillForm(modal, data);
    window.AutofillCore.showToast(
      count > 0 ? `Filled ${count} field${count !== 1 ? 's' : ''} ✓` : 'No matching fields on this step',
      count > 0 ? 'success' : 'info'
    );
  }

  // ── Setup on modal appearance ────────────────────────────────────────────

  function setupModal(modal) {
    currentModal = modal;

    // Pre-fetch resume data in the background so autofill is instant
    ensureResumeData();

    window.AutofillCore.injectAutofillButton(handleAutofillClick);
  }

  function teardownModal() {
    currentModal = null;
    window.AutofillCore.removeAutofillButton();
  }

  // ── MutationObserver ─────────────────────────────────────────────────────
  // LinkedIn is a React SPA — the Easy Apply modal is dynamically added to the DOM.
  // We watch document.body for subtree changes to detect modal open/close.

  const observer = new MutationObserver(() => {
    const modal = findEasyApplyModal();

    if (modal && modal !== currentModal) {
      setupModal(modal);
    } else if (!modal && currentModal) {
      teardownModal();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also check immediately in case the modal is already open on page load
  const existingModal = findEasyApplyModal();
  if (existingModal) setupModal(existingModal);
})();

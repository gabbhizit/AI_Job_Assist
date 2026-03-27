// AI Job Copilot — Autofill Core
// Shared field mapping engine, fill logic, floating button, and toast.
// Exposed via window.AutofillCore for platform-specific scripts to consume.

(function () {
  // ── Field Registry ───────────────────────────────────────────────────────
  // Maps ParsedResume paths → keyword patterns for label matching.
  // Patterns are matched case-insensitively against aria-label, label text,
  // placeholder, or name attribute of each input.

  const FIELD_REGISTRY = [
    {
      key: 'full_name',
      getValue: (r) => r.name || '',
      patterns: ['full name', 'your name', 'applicant name'],
    },
    {
      key: 'first_name',
      getValue: (r) => (r.name || '').split(' ')[0] || '',
      patterns: ['first name', 'given name', 'fname', 'first'],
    },
    {
      key: 'last_name',
      getValue: (r) => (r.name || '').split(' ').slice(1).join(' ') || '',
      patterns: ['last name', 'surname', 'family name', 'lname', 'last'],
    },
    {
      key: 'email',
      getValue: (r) => r.email || '',
      patterns: ['email', 'e-mail', 'email address'],
    },
    {
      key: 'phone',
      getValue: (r) => r.phone || '',
      patterns: ['phone', 'mobile', 'cell', 'telephone', 'contact number', 'phone number'],
    },
    {
      key: 'linkedin',
      getValue: (r) => r.linkedin || '',
      patterns: ['linkedin', 'linkedin url', 'linkedin profile'],
    },
    {
      key: 'website',
      getValue: (r) => r.projects?.[0]?.url || r.linkedin || '',
      patterns: ['website', 'portfolio', 'personal site', 'personal website', 'github'],
    },
    {
      key: 'summary',
      getValue: (r) => r.summary || '',
      patterns: [
        'cover letter', 'summary', 'about you', 'about yourself',
        'introduction', 'tell us about yourself', 'why are you interested',
        'additional information', 'message to hiring',
      ],
    },
    {
      key: 'current_company',
      getValue: (r) => r.experience?.[0]?.company || '',
      patterns: ['current company', 'current employer', 'employer', 'company name'],
    },
    {
      key: 'current_title',
      getValue: (r) => r.experience?.[0]?.title || '',
      patterns: ['current title', 'current role', 'job title', 'your title', 'position'],
    },
    {
      key: 'years_experience',
      getValue: (r) => String(r.total_years_experience ?? ''),
      patterns: ['years of experience', 'years experience', 'total experience', 'how many years'],
    },
    {
      key: 'school',
      getValue: (r) => r.education?.[0]?.institution || '',
      patterns: ['school', 'university', 'college', 'institution', 'alma mater'],
    },
    {
      key: 'degree',
      getValue: (r) => r.education?.[0]?.degree || '',
      patterns: ['degree', 'degree type', 'highest degree', 'level of education'],
    },
    {
      key: 'field_of_study',
      getValue: (r) => r.education?.[0]?.field || '',
      patterns: ['field of study', 'major', 'concentration', 'discipline', 'area of study'],
    },
    {
      key: 'gpa',
      getValue: (r) => r.education?.[0]?.gpa || '',
      patterns: ['gpa', 'grade point', 'cgpa'],
    },
    {
      key: 'skills',
      getValue: (r) => (r.skills_flat || []).join(', '),
      patterns: ['skills', 'technical skills', 'technologies', 'tech stack', 'tools'],
    },
    // Visa / work authorization — hardcoded "Yes" for F1/OPT users
    {
      key: 'visa_sponsorship',
      getValue: () => 'Yes',
      patterns: [
        'visa sponsorship', 'sponsorship required', 'require sponsorship',
        'need sponsorship', 'work authorization', 'authorized to work',
        'eligible to work', 'legally authorized',
      ],
    },
    {
      key: 'visa_type',
      getValue: () => 'F1/OPT',
      patterns: ['visa type', 'visa status', 'work visa', 'immigration status'],
    },
  ];

  // ── Label extraction ─────────────────────────────────────────────────────

  function getFieldLabel(element) {
    // 1. aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.toLowerCase().trim();

    // 2. aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent.toLowerCase().trim();
    }

    // 3. Associated <label> via for/id
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) return label.textContent.toLowerCase().trim();
    }

    // 4. Wrapping <label>
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent.toLowerCase().trim();

    // 5. placeholder
    if (element.placeholder) return element.placeholder.toLowerCase().trim();

    // 6. name attribute (underscores/dashes → spaces)
    if (element.name) return element.name.toLowerCase().replace(/[_\-\[\]]/g, ' ').trim();

    return '';
  }

  function matchesAnyPattern(fieldText, patterns) {
    return patterns.some((p) => fieldText.includes(p));
  }

  // ── React-compatible fill ────────────────────────────────────────────────

  function fillInput(element, value) {
    if (!value && value !== 0) return false;
    const tag = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();

    // Skip non-fillable inputs
    if (['checkbox', 'radio', 'file', 'submit', 'button', 'hidden', 'image', 'reset'].includes(type)) {
      return false;
    }

    if (tag === 'select') {
      for (const option of element.options) {
        if (option.text.toLowerCase().includes(String(value).toLowerCase())) {
          element.value = option.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }

    if (tag === 'textarea' || tag === 'input') {
      // React intercepts the prototype setter — use it to trigger React's synthetic events
      const proto = tag === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(element, String(value));
      } else {
        element.value = String(value);
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    }

    // contenteditable divs (used by some LinkedIn fields)
    if (element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox') {
      element.textContent = String(value);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: String(value) }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  // ── Main fill engine ─────────────────────────────────────────────────────

  function fillForm(container, resumeData) {
    // Collect all potentially fillable elements
    const elements = container.querySelectorAll(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    );

    let filledCount = 0;

    for (const el of elements) {
      const label = getFieldLabel(el);
      if (!label) continue;

      for (const field of FIELD_REGISTRY) {
        if (matchesAnyPattern(label, field.patterns)) {
          const value = field.getValue(resumeData);
          if (fillInput(el, value)) {
            filledCount++;
            break; // Stop checking other registry entries for this element
          }
        }
      }
    }

    return filledCount;
  }

  // ── Floating button ──────────────────────────────────────────────────────

  function injectAutofillButton(onClickCallback) {
    // Remove any existing button
    document.getElementById('aijc-autofill-btn')?.remove();

    const btn = document.createElement('button');
    btn.id = 'aijc-autofill-btn';
    btn.textContent = 'Autofill ✦';
    btn.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'right: 24px',
      'z-index: 2147483647',
      'background: #2563eb',
      'color: white',
      'border: none',
      'border-radius: 8px',
      'padding: 10px 18px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'font-size: 14px',
      'font-weight: 600',
      'cursor: pointer',
      'box-shadow: 0 4px 16px rgba(37,99,235,0.45)',
      'transition: transform 0.1s ease, box-shadow 0.1s ease',
      'letter-spacing: 0.01em',
    ].join(';');

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-1px)';
      btn.style.boxShadow = '0 6px 20px rgba(37,99,235,0.55)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.boxShadow = '0 4px 16px rgba(37,99,235,0.45)';
    });
    btn.addEventListener('click', onClickCallback);

    document.body.appendChild(btn);
    return btn;
  }

  function removeAutofillButton() {
    document.getElementById('aijc-autofill-btn')?.remove();
  }

  // ── Toast notification ───────────────────────────────────────────────────

  function showToast(message, type = 'success') {
    document.getElementById('aijc-toast')?.remove();

    const toast = document.createElement('div');
    toast.id = 'aijc-toast';
    const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#6b7280';
    toast.style.cssText = [
      'position: fixed',
      'bottom: 72px',
      'right: 24px',
      'z-index: 2147483647',
      `background: ${bg}`,
      'color: white',
      'border-radius: 6px',
      'padding: 8px 14px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'font-size: 13px',
      'font-weight: 500',
      'box-shadow: 0 2px 10px rgba(0,0,0,0.2)',
      'opacity: 1',
      'transition: opacity 0.35s ease',
      'pointer-events: none',
    ].join(';');
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    setTimeout(() => toast.remove(), 3000);
  }

  // ── Export ───────────────────────────────────────────────────────────────

  window.AutofillCore = {
    fillForm,
    injectAutofillButton,
    removeAutofillButton,
    showToast,
  };
})();

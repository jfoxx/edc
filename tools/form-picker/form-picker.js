/* eslint-disable import/no-unresolved */

import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// ============================================
// CONFIGURATION - Update these values as needed
// ============================================
const CONFIG = {
  // Full URL to the external forms query index
  formsIndexUrl: 'https://main--edc-ue--jfoxx.aem.live/query-index-forms.json',

  // Filter to identify form pages in the index (set to null to show all)
  pathFilter: null,

  // Field mappings from your index structure
  fields: {
    title: 'title',
    path: 'path',
    description: 'description',
  },
};
// ============================================

// Spectrum Workflow Icons (inline SVG)
const ICONS = {
  search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M17.675 16.325l-4.1-4.1A7.018 7.018 0 0014.5 7.5a7 7 0 10-7 7 7.018 7.018 0 004.725-.925l4.1 4.1a1 1 0 001.35-1.35zM2.5 7.5a5 5 0 115 5 5.006 5.006 0 01-5-5z"/>
  </svg>`,
  form: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M16 2H2a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1V3a1 1 0 00-1-1zm-1 12H3V4h12z"/>
    <rect x="4.5" y="5.5" width="5" height="1.5" rx=".5"/>
    <rect x="4.5" y="8.25" width="9" height="1.5" rx=".5"/>
    <rect x="4.5" y="11" width="9" height="1.5" rx=".5"/>
  </svg>`,
  openIn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M16.5 1h-6a.5.5 0 000 1h4.793L8.146 9.146a.5.5 0 00.708.708L16 2.707V7.5a.5.5 0 001 0v-6a.5.5 0 00-.5-.5z"/>
    <path d="M14 10.5v4a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 14.5v-9A1.5 1.5 0 013.5 4h4a.5.5 0 000-1h-4A2.5 2.5 0 001 5.5v9A2.5 2.5 0 003.5 17h9a2.5 2.5 0 002.5-2.5v-4a.5.5 0 00-1 0z"/>
  </svg>`,
  refresh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M16.5 9A7.5 7.5 0 119 1.5V.25a.25.25 0 01.403-.197l2.5 2a.25.25 0 010 .394l-2.5 2A.25.25 0 019 4.25V3a6 6 0 106 6 .75.75 0 011.5 0z"/>
  </svg>`,
  alertCircle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M9 1a8 8 0 108 8 8 8 0 00-8-8zm0 14.5a6.5 6.5 0 116.5-6.5A6.508 6.508 0 019 15.5z"/>
    <path d="M9 4.5a.75.75 0 00-.75.75v4a.75.75 0 001.5 0v-4A.75.75 0 009 4.5zM9 11.25a1 1 0 101 1 1 1 0 00-1-1z"/>
  </svg>`,
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M16 5h-6.5l-2-2H2a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V6a1 1 0 00-1-1zm-1 9H3V6h12z"/>
  </svg>`,
};

/**
 * Shows a message in the feedback container
 * @param {string} text - Message text to display
 * @param {boolean} [isError=false] - Whether to style as error message
 */
function showMessage(text, isError = false) {
  const message = document.querySelector('.feedback-message');
  const msgContainer = document.querySelector('.message-wrapper');

  message.textContent = text;
  message.classList.toggle('error', isError);
  msgContainer.classList.remove('hidden');

  if (!isError) {
    setTimeout(() => {
      msgContainer.classList.add('hidden');
    }, 3000);
  }
}

/**
 * Gets the base URL for form links from the index URL
 * @returns {string} Base URL
 */
function getBaseUrl() {
  return new URL(CONFIG.formsIndexUrl).origin;
}

/**
 * Constructs the full form URL
 * @param {string} formPath - Path to the form
 * @returns {string} Full URL
 */
function getFormUrl(formPath) {
  return `${getBaseUrl()}${formPath}`;
}

/**
 * Fetches forms from the external query index
 * @returns {Promise<Array>} Array of form objects
 */
async function fetchForms() {
  const response = await fetch(CONFIG.formsIndexUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch forms index: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  let { data } = json;

  // Apply path filter if configured
  if (CONFIG.pathFilter) {
    data = data.filter((item) => item[CONFIG.fields.path]?.startsWith(CONFIG.pathFilter));
  }

  // Normalize data structure
  return data.map((form) => ({
    title: form[CONFIG.fields.title] || form[CONFIG.fields.path] || 'Untitled Form',
    path: form[CONFIG.fields.path],
    description: form[CONFIG.fields.description] || '',
  }));
}

/**
 * Creates a form list item element
 * @param {Object} form - Form data object
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement} List item element
 */
function createFormItem(form, onClick) {
  const item = document.createElement('li');
  item.className = 'form-item';

  const button = document.createElement('button');
  button.className = 'form-btn-item';
  button.type = 'button';
  button.setAttribute('aria-label', `Insert form "${form.title}"`);
  button.title = `Click to insert "${form.title}"`;

  // Form icon (Spectrum)
  const icon = document.createElement('span');
  icon.className = 'form-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICONS.form;

  // Form info container
  const info = document.createElement('div');
  info.className = 'form-info';

  // Form title
  const title = document.createElement('span');
  title.className = 'form-title';
  title.textContent = form.title;

  // Form path (subtitle)
  const path = document.createElement('span');
  path.className = 'form-path';
  path.textContent = form.path;

  info.appendChild(title);
  info.appendChild(path);

  button.appendChild(icon);
  button.appendChild(info);

  // Preview button (Spectrum)
  const previewBtn = document.createElement('button');
  previewBtn.className = 'form-preview-btn';
  previewBtn.type = 'button';
  previewBtn.setAttribute('aria-label', `Preview form "${form.title}"`);
  previewBtn.title = 'Open in new tab';
  previewBtn.innerHTML = ICONS.openIn;
  previewBtn.style.display = 'none';

  previewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(getFormUrl(form.path), '_blank');
  });

  // Show/hide preview on hover
  item.addEventListener('mouseenter', () => {
    previewBtn.style.display = '';
  });
  item.addEventListener('mouseleave', () => {
    previewBtn.style.display = 'none';
  });

  button.addEventListener('click', () => onClick(form));

  item.appendChild(button);
  item.appendChild(previewBtn);

  return item;
}

/**
 * Renders the forms list
 * @param {Array} forms - Array of form objects
 * @param {HTMLElement} container - List container element
 * @param {Function} onSelect - Selection handler
 */
function renderFormsList(forms, container, onSelect) {
  container.innerHTML = '';

  if (forms.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `${ICONS.folder}<span>No forms found</span>`;
    container.appendChild(empty);
    return;
  }

  forms.forEach((form) => {
    const item = createFormItem(form, onSelect);
    container.appendChild(item);
  });
}

/**
 * Filters forms based on search text
 * @param {string} searchText - Text to search for
 * @param {HTMLElement} formsList - List container element
 */
function filterForms(searchText, formsList) {
  const items = formsList.querySelectorAll('.form-item');
  const searchLower = searchText.toLowerCase();

  let visibleCount = 0;
  items.forEach((item) => {
    const title = item.querySelector('.form-title')?.textContent?.toLowerCase() || '';
    const path = item.querySelector('.form-path')?.textContent?.toLowerCase() || '';
    const matches = title.includes(searchLower) || path.includes(searchLower);
    item.style.display = matches ? '' : 'none';
    if (matches) visibleCount += 1;
  });

  // Show empty state if no matches
  let emptyState = formsList.querySelector('.empty-state');

  if (visibleCount === 0 && searchText && items.length > 0) {
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      formsList.appendChild(emptyState);
    }
    emptyState.innerHTML = `${ICONS.folder}<span>No forms matching "${searchText}"</span>`;
    emptyState.style.display = '';
  } else if (emptyState && items.length > 0) {
    emptyState.style.display = 'none';
  }
}

/**
 * Handles form selection - inserts the form URL into the document
 * @param {Object} actions - DA SDK actions object
 * @param {Object} form - Selected form object
 */
function handleFormSelect(actions, form) {
  if (!actions?.sendHTML) {
    showMessage('Cannot insert form: Editor not available', true);
    return;
  }

  const formUrl = getFormUrl(form.path);

  // Insert as a link that the form block will consume
  actions.sendHTML(`<p><a href="${formUrl}">${formUrl}</a></p>`);
  actions.closeLibrary();
}

/**
 * Detects if running in standalone mode (not in DA iframe)
 * @returns {boolean} True if standalone
 */
function isStandalone() {
  return window.self === window.top;
}

/**
 * Mock actions for standalone testing
 */
const mockActions = {
  sendHTML: (html) => {
    // eslint-disable-next-line no-console
    console.log('sendHTML called with:', html);
    // eslint-disable-next-line no-alert
    alert(`Form URL inserted:\n\n${html.replace(/<[^>]*>/g, '')}`);
  },
  closeLibrary: () => {
    // eslint-disable-next-line no-console
    console.log('closeLibrary called');
  },
};

/**
 * Initializes the search input with icon
 */
function initSearchInput() {
  const container = document.querySelector('.search-container');
  const searchIcon = document.createElement('span');
  searchIcon.className = 'search-icon';
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.innerHTML = ICONS.search;
  container.insertBefore(searchIcon, container.firstChild);
}

/**
 * Initializes the refresh button with icon
 */
function initRefreshButton() {
  const refreshBtn = document.querySelector('.form-btn[type="button"]');
  const iconSpan = document.createElement('span');
  iconSpan.innerHTML = ICONS.refresh;
  refreshBtn.insertBefore(iconSpan, refreshBtn.firstChild);
}

/**
 * Main initialization function
 */
(async function init() {
  let actions;

  if (isStandalone()) {
    // Standalone testing mode - use mock actions
    // eslint-disable-next-line no-console
    console.log('Form Picker running in standalone mode (testing)');
    actions = mockActions;
  } else {
    // Running inside DA - use real SDK
    const sdk = await DA_SDK;
    actions = sdk.actions;
  }

  const form = document.querySelector('.form-picker-form');
  const formsList = document.querySelector('.forms-list');
  const searchInput = document.querySelector('.form-search');
  const refreshBtn = document.querySelector('.form-btn[type="button"]');

  // Initialize icons
  initSearchInput();
  initRefreshButton();

  // Prevent default form submission
  form.addEventListener('submit', (e) => e.preventDefault());

  // Search handler
  searchInput.addEventListener('input', (e) => {
    filterForms(e.target.value, formsList);
  });

  // Load forms function
  async function loadForms() {
    formsList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <span>Loading forms...</span>
      </div>
    `;

    try {
      const forms = await fetchForms();
      renderFormsList(forms, formsList, (selectedForm) => {
        handleFormSelect(actions, selectedForm);
      });

      if (forms.length === 0) {
        showMessage('No forms found in the index', false);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
      formsList.innerHTML = '';

      const errorEl = document.createElement('div');
      errorEl.className = 'error-state';
      errorEl.innerHTML = `
        ${ICONS.alertCircle}
        <p>Failed to load forms</p>
        <p class="error-detail">${error.message}</p>
      `;
      formsList.appendChild(errorEl);

      showMessage('Failed to load forms. Check console for details.', true);
    }
  }

  // Initial load
  await loadForms();

  // Refresh handler
  refreshBtn.addEventListener('click', loadForms);
}());

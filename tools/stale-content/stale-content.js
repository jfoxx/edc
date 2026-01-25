/* eslint-disable import/no-unresolved */

import DA_SDK from 'https://da.live/nx/utils/sdk.js';
// eslint-disable-next-line import/no-unresolved
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

// Icons
const ICONS = {
  document: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M15.5 4.5v11a1 1 0 01-1 1h-11a1 1 0 01-1-1v-13a1 1 0 011-1h9l3 3z"/>
    <path fill="#fff" d="M12.5 1.5v3h3"/>
  </svg>`,
  openIn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M16.5 1h-6a.5.5 0 000 1h4.793L8.146 9.146a.5.5 0 00.708.708L16 2.707V7.5a.5.5 0 001 0v-6a.5.5 0 00-.5-.5z"/>
    <path d="M14 10.5v4a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 14.5v-9A1.5 1.5 0 013.5 4h4a.5.5 0 000-1h-4A2.5 2.5 0 001 5.5v9A2.5 2.5 0 003.5 17h9a2.5 2.5 0 002.5-2.5v-4a.5.5 0 00-1 0z"/>
  </svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="currentColor">
    <path d="M16.707 3.707l-2.414-2.414a1 1 0 00-1.414 0L2.586 11.586a.997.997 0 00-.263.464l-1 4a1 1 0 001.213 1.213l4-1a.997.997 0 00.464-.263l10.293-10.293a1 1 0 000-1.414l-2.586-2.586zm-13.7 9.7l7.7-7.7 1.293 1.293-7.7 7.7-1.646.353.353-1.646z"/>
  </svg>`,
};

/**
 * Application state
 */
const state = {
  token: null,
  org: null,
  site: null,
  scanning: false,
  cancelled: false,
  results: [],
  totalScanned: 0,
};

/**
 * DOM element references
 */
let elements = {};

/**
 * Shows a feedback message
 * @param {string} text - Message text
 * @param {string} type - Message type ('error', 'success', or empty)
 */
function showMessage(text, type = '') {
  const { messageWrapper, feedback } = elements;
  feedback.textContent = text;
  feedback.className = `feedback-message ${type}`;
  messageWrapper.classList.remove('hidden');

  if (type !== 'error') {
    setTimeout(() => {
      messageWrapper.classList.add('hidden');
    }, 4000);
  }
}

/**
 * Updates the progress display
 * @param {string} text - Progress text
 * @param {number} percent - Progress percentage (0-100)
 */
function updateProgress(text, percent = null) {
  const { progressText, progressFill } = elements;
  progressText.textContent = text;
  if (percent !== null) {
    progressFill.style.width = `${Math.min(100, percent)}%`;
  }
}

/**
 * Updates the statistics display
 */
function updateStats() {
  const { totalScanned, staleCount } = elements;
  totalScanned.textContent = state.totalScanned.toLocaleString();
  staleCount.textContent = state.results.length.toLocaleString();
}

/**
 * Formats a timestamp to a human-readable date
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculates how many months ago a date was
 * @param {number|Date} dateInput - Unix timestamp in milliseconds or Date object
 * @returns {number} Number of months ago
 */
function monthsAgo(dateInput) {
  const now = new Date();
  const then = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const months = (now.getFullYear() - then.getFullYear()) * 12
    + (now.getMonth() - then.getMonth());
  return months;
}

/**
 * Parses a date string in various formats
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:MM)
  let date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) return date;

  // Try common formats like "January 15, 2024" or "15 Jan 2024"
  date = new Date(Date.parse(dateStr));
  if (!Number.isNaN(date.getTime())) return date;

  return null;
}

/**
 * Fetches the metadata for a page from DA
 * @param {string} path - The path to the page (without .html)
 * @returns {Promise<Object|null>} Metadata object or null
 */
async function fetchPageMetadata(path) {
  const { org, site, token } = state;
  // Remove the org/site prefix if present
  const cleanPath = path.replace(`/${org}/${site}`, '');
  const url = `https://admin.da.live/source/${org}/${site}${cleanPath}.html`;

  try {
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      console.warn(`[Stale Content] Failed to fetch ${url}: ${resp.status}`);
      return null;
    }

    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const metadata = {};

    // In DA, metadata is stored as divs with class "metadata", not tables
    // Structure: div.metadata > div (row) > div (key) + div (value)
    const metadataBlocks = doc.querySelectorAll('.metadata');
    
    console.log(`[Stale Content] ${cleanPath}: Found ${metadataBlocks.length} metadata blocks`);

    metadataBlocks.forEach((block) => {
      // Each direct child div is a row
      const rows = block.querySelectorAll(':scope > div');
      rows.forEach((row) => {
        const cells = row.querySelectorAll(':scope > div');
        if (cells.length >= 2) {
          const rawKey = cells[0].textContent.trim();
          const key = rawKey.toLowerCase().replace(/\s+/g, '-');
          const value = cells[1].textContent.trim();
          if (key && value) {
            metadata[key] = value;
            // Log if we find anything related to "modified" or "date"
            if (key.includes('modif') || key.includes('date')) {
              console.log(`[Stale Content] ${cleanPath}: Found "${rawKey}" = "${value}"`);
            }
          }
        }
      });
    });

    // Log all metadata keys found
    const keys = Object.keys(metadata);
    if (keys.length > 0) {
      console.log(`[Stale Content] ${cleanPath}: Metadata keys: ${keys.join(', ')}`);
    } else {
      console.log(`[Stale Content] ${cleanPath}: No metadata found`);
    }

    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for ${path}:`, error);
    return null;
  }
}

/**
 * Collects pages during crawl
 * @param {Object} item - The item from the crawl
 * @param {Array} pages - Array to collect pages into
 */
function collectPage(item, pages) {
  // Only collect .html files (pages)
  if (item.path.endsWith('.html')) {
    pages.push(item);
  }
}

/**
 * Processes a single page to check if it's stale based on metadata
 * @param {Object} item - The page item
 * @param {number} thresholdMonths - Number of months to consider stale
 */
async function processPage(item, thresholdMonths) {
  if (state.cancelled) return;

  state.totalScanned += 1;
  updateProgress(`Checking metadata: ${item.path}`, null);
  updateStats();

  // Fetch the page metadata
  const metadata = await fetchPageMetadata(item.path.replace('.html', ''));

  if (!metadata) return;

  // Look for last-modified metadata field (try various common names)
  const lastModifiedValue = metadata['last-modified']
    || metadata.lastmodified
    || metadata['last-modified-date']
    || metadata['lastmodifieddate']
    || metadata['date-modified']
    || metadata.modified;

  if (!lastModifiedValue) {
    console.log(`[Stale Content] ${item.path}: No last-modified field found`);
    return;
  }

  console.log(`[Stale Content] ${item.path}: last-modified = "${lastModifiedValue}"`);
  

  const lastModifiedDate = parseDate(lastModifiedValue);
  if (!lastModifiedDate) {
    console.warn(`[Stale Content] ${item.path}: Could not parse date "${lastModifiedValue}"`);
    return;
  }

  console.log(`[Stale Content] ${item.path}: Parsed date = ${lastModifiedDate.toISOString()}, ${monthsAgo(lastModifiedDate)} months ago`);

  const months = monthsAgo(lastModifiedDate);
  if (months >= thresholdMonths) {
    // Extract name from path
    const pathParts = item.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const name = fileName.replace('.html', '');

    state.results.push({
      path: item.path.replace('.html', ''),
      name,
      ext: 'html',
      lastModified: lastModifiedDate.getTime(),
      lastModifiedStr: lastModifiedValue,
      monthsAgo: months,
    });

    renderResults();
  }
}

/**
 * Scans content using the DA crawl utility
 * @param {string} startPath - The starting path to scan
 * @param {number} thresholdMonths - Number of months to consider stale
 */
async function scanContent(startPath, thresholdMonths) {
  const { org, site } = state;
  const path = `/${org}/${site}${startPath === '/' ? '' : startPath}`;

  updateProgress(`Discovering pages at ${startPath}...`, 0);

  const pages = [];

  try {
    // First, crawl to discover all pages
    const { results } = crawl({
      path,
      callback: (item) => collectPage(item, pages),
      concurrent: 20,
    });

    await results;

    updateProgress(`Found ${pages.length} pages. Checking metadata...`, 0);

    // Now process each page to check its metadata
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < pages.length; i += batchSize) {
      if (state.cancelled) break;

      const batch = pages.slice(i, i + batchSize);
      await Promise.all(batch.map((page) => processPage(page, thresholdMonths)));

      const progress = Math.round(((i + batch.length) / pages.length) * 100);
      updateProgress(`Checking metadata: ${i + batch.length}/${pages.length}`, progress);
    }

    // Final update
    updateStats();
    renderResults();
  } catch (error) {
    console.error('Scan error:', error);
    throw error;
  }
}

/**
 * Updates the selected count display
 */
function updateSelectedCount() {
  const { selectedCount, exportSelectedBtn } = elements;
  const checkboxes = document.querySelectorAll('.result-checkbox:checked');
  const count = checkboxes.length;

  if (count > 0) {
    selectedCount.textContent = `(${count} selected)`;
    exportSelectedBtn.classList.remove('hidden');
  } else {
    selectedCount.textContent = '';
    exportSelectedBtn.classList.add('hidden');
  }
}

/**
 * Creates a result item element
 * @param {Object} item - The stale content item
 * @returns {HTMLElement} The list item element
 */
function createResultItem(item) {
  const li = document.createElement('li');
  li.className = 'result-item';
  li.dataset.path = item.path;

  const { org, site } = state;
  const daEditUrl = `https://da.live/edit#/${org}/${site}${item.path}`;
  const previewUrl = `https://main--${site}--${org}.aem.page${item.path}`;

  const displayDate = item.lastModifiedStr || formatDate(item.lastModified);

  li.innerHTML = `
    <input type="checkbox" class="result-checkbox" value="${item.path}" />
    <div class="result-icon">${ICONS.document}</div>
    <div class="result-info">
      <div class="result-path">${item.path}</div>
      <div class="result-meta">
        Metadata last-modified: <span class="result-date">${displayDate}</span>
        (${item.monthsAgo} months ago)
      </div>
    </div>
    <div class="result-actions">
      <button class="result-action-btn" title="Edit in DA" data-action="edit" data-url="${daEditUrl}">
        ${ICONS.edit}
      </button>
      <button class="result-action-btn" title="Preview" data-action="preview" data-url="${previewUrl}">
        ${ICONS.openIn}
      </button>
    </div>
  `;

  // Add checkbox change handler
  const checkbox = li.querySelector('.result-checkbox');
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      li.classList.add('selected');
    } else {
      li.classList.remove('selected');
    }
    updateSelectedCount();
  });

  // Add click handlers for action buttons
  li.querySelectorAll('.result-action-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      window.open(url, '_blank');
    });
  });

  return li;
}

/**
 * Selects all result items
 */
function selectAll() {
  const checkboxes = document.querySelectorAll('.result-checkbox');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * Deselects all result items
 */
function deselectAll() {
  const checkboxes = document.querySelectorAll('.result-checkbox');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * Renders the results list
 */
function renderResults() {
  const { resultsList, resultsSection, emptyState } = elements;

  if (state.results.length === 0) {
    resultsSection.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  // Clear and rebuild list
  resultsList.innerHTML = '';

  // Sort by oldest first
  const sorted = [...state.results].sort((a, b) => a.lastModified - b.lastModified);

  sorted.forEach((item) => {
    resultsList.appendChild(createResultItem(item));
  });
}

/**
 * Exports results to CSV
 * @param {boolean} selectedOnly - If true, only exports selected items
 */
function exportCSV(selectedOnly = false) {
  let itemsToExport = state.results;

  if (selectedOnly) {
    const selectedPaths = new Set(
      Array.from(document.querySelectorAll('.result-checkbox:checked'))
        .map((cb) => cb.value),
    );
    itemsToExport = state.results.filter((item) => selectedPaths.has(item.path));
  }

  if (itemsToExport.length === 0) {
    showMessage('No items to export', 'error');
    return;
  }

  const headers = ['Path', 'Name', 'Extension', 'Last Modified', 'Months Ago'];
  const rows = itemsToExport.map((item) => [
    item.path,
    item.name,
    item.ext,
    formatDate(item.lastModified),
    item.monthsAgo,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const suffix = selectedOnly ? '-selected' : '';
  a.download = `stale-content-${state.org}-${state.site}${suffix}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showMessage(`Exported ${itemsToExport.length} items to CSV`, 'success');
}

/**
 * Starts the scan process
 */
async function startScan() {
  const { startPath, monthsThreshold, scanBtn, cancelBtn, progressSection, stats, emptyState } = elements;

  const path = startPath.value.trim() || '/';
  const threshold = parseInt(monthsThreshold.value, 10) || 6;

  // Reset state
  state.scanning = true;
  state.cancelled = false;
  state.results = [];
  state.totalScanned = 0;

  // Update UI
  scanBtn.disabled = true;
  cancelBtn.classList.remove('hidden');
  progressSection.classList.remove('hidden');
  stats.classList.remove('hidden');
  emptyState.classList.add('hidden');
  elements.resultsSection.classList.add('hidden');

  updateProgress('Starting scan...', 0);
  updateStats();

  try {
    await scanContent(path, threshold);

    if (state.cancelled) {
      showMessage('Scan cancelled');
    } else {
      const message = state.results.length > 0
        ? `Found ${state.results.length} stale items`
        : 'No stale content found!';
      showMessage(message, state.results.length > 0 ? '' : 'success');

      if (state.results.length === 0) {
        emptyState.classList.remove('hidden');
        emptyState.querySelector('p').textContent = 'Great news! No stale content found.';
      }
    }
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    state.scanning = false;
    scanBtn.disabled = false;
    cancelBtn.classList.add('hidden');
    progressSection.classList.add('hidden');
    updateProgress('Scan complete', 100);
  }
}

/**
 * Cancels the current scan
 */
function cancelScan() {
  state.cancelled = true;
  updateProgress('Cancelling...', null);
}

/**
 * Detects if running in standalone mode (not in DA iframe)
 * @returns {boolean} True if standalone
 */
function isStandalone() {
  return window.self === window.top;
}

/**
 * Mock context for standalone testing
 */
const mockContext = {
  org: 'test-org',
  site: 'test-site',
};

/**
 * Mock token for standalone testing
 */
const mockToken = 'mock-token';

/**
 * Initialize DOM element references
 */
function initElements() {
  elements = {
    startPath: document.getElementById('start-path'),
    monthsThreshold: document.getElementById('months-threshold'),
    scanBtn: document.getElementById('scan-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    exportBtn: document.getElementById('export-btn'),
    exportSelectedBtn: document.getElementById('export-selected-btn'),
    selectAllBtn: document.getElementById('select-all-btn'),
    deselectAllBtn: document.getElementById('deselect-all-btn'),
    selectedCount: document.getElementById('selected-count'),
    progressSection: document.getElementById('progress-section'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    stats: document.getElementById('stats'),
    totalScanned: document.getElementById('total-scanned'),
    staleCount: document.getElementById('stale-count'),
    resultsSection: document.getElementById('results-section'),
    resultsList: document.getElementById('results-list'),
    emptyState: document.getElementById('empty-state'),
    messageWrapper: document.getElementById('message-wrapper'),
    feedback: document.getElementById('feedback'),
  };
}

/**
 * Main initialization function
 */
(async function init() {
  initElements();

  let context;
  let token;

  if (isStandalone()) {
    // eslint-disable-next-line no-console
    console.log('Stale Content Finder running in standalone mode (testing)');
    context = mockContext;
    token = mockToken;

    // Show a notice in standalone mode
    showMessage('Running in test mode - connect to DA for real data');
  } else {
    const sdk = await DA_SDK;
    context = sdk.context;
    token = sdk.token;
  }

  // Store context in state
  state.org = context.org;
  state.site = context.repo || context.site;
  state.token = token;

  // Set up event listeners
  elements.scanBtn.addEventListener('click', startScan);
  elements.cancelBtn.addEventListener('click', cancelScan);
  elements.exportBtn.addEventListener('click', () => exportCSV(false));
  elements.exportSelectedBtn.addEventListener('click', () => exportCSV(true));
  elements.selectAllBtn.addEventListener('click', selectAll);
  elements.deselectAllBtn.addEventListener('click', deselectAll);

  // Allow pressing Enter in inputs to start scan
  elements.startPath.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !state.scanning) startScan();
  });
  elements.monthsThreshold.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !state.scanning) startScan();
  });
}());

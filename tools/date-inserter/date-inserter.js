/* eslint-disable import/no-unresolved */

import DA_SDK from 'https://da.live/nx/utils/sdk.js';

/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 * @returns {string} Today's date in ISO format
 */
function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  sendText: (text) => {
    // eslint-disable-next-line no-console
    console.log('sendText called with:', text);
    // eslint-disable-next-line no-alert
    alert(`Date inserted: ${text}`);
  },
  closeLibrary: () => {
    // eslint-disable-next-line no-console
    console.log('closeLibrary called');
  },
};

/**
 * Inserts a date and closes the library
 * @param {Object} actions - DA SDK actions
 * @param {string} date - Date string to insert
 * @param {HTMLElement} feedback - Feedback element
 */
function insertDate(actions, date, feedback) {
  if (!actions?.sendText) {
    feedback.textContent = 'Cannot insert date: Editor not available';
    feedback.classList.add('error');
    feedback.classList.remove('success');
    return;
  }

  actions.sendText(date);
  feedback.textContent = 'Date inserted!';
  feedback.classList.add('success');
  feedback.classList.remove('error');

  // Close library after short delay
  setTimeout(() => {
    actions.closeLibrary();
  }, 500);
}

/**
 * Main initialization function
 */
(async function init() {
  let actions;

  if (isStandalone()) {
    // eslint-disable-next-line no-console
    console.log('Date Inserter running in standalone mode (testing)');
    actions = mockActions;
  } else {
    const sdk = await DA_SDK;
    actions = sdk.actions;
  }

  const todayDisplay = document.getElementById('today-date');
  const insertTodayBtn = document.getElementById('insert-today-btn');
  const datePicker = document.getElementById('date-picker');
  const insertCustomBtn = document.getElementById('insert-custom-btn');
  const feedback = document.getElementById('feedback');

  // Display today's date
  const todayDate = getTodayISO();
  todayDisplay.textContent = todayDate;

  // Insert today's date on button click
  insertTodayBtn.addEventListener('click', () => {
    insertDate(actions, todayDate, feedback);
  });

  // Enable/disable custom insert button based on date picker value
  datePicker.addEventListener('input', () => {
    insertCustomBtn.disabled = !datePicker.value;
  });

  // Insert custom date on button click
  insertCustomBtn.addEventListener('click', () => {
    if (datePicker.value) {
      insertDate(actions, datePicker.value, feedback);
    }
  });

  // Allow pressing Enter in date picker to insert
  datePicker.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && datePicker.value) {
      e.preventDefault();
      insertDate(actions, datePicker.value, feedback);
    }
  });
}());

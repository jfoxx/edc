/**
 * Countdown Timer Block
 * Creates a flip card style countdown timer from an authored target date
 */

/**
 * Parse a date string in various formats
 * @param {string} dateStr - Date string (YYYY-MM-DD, YYYY-MM-DD HH:MM, etc.)
 * @returns {Date} Parsed date object
 */
function parseTargetDate(dateStr) {
  const trimmed = dateStr.trim();

  // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:MM)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    // If no time specified, default to end of day
    if (trimmed.length === 10) {
      return new Date(`${trimmed}T23:59:59`);
    }
    return new Date(trimmed.replace(' ', 'T'));
  }

  // Fallback to native Date parsing
  return new Date(trimmed);
}

/**
 * Calculate time remaining until target date
 * @param {Date} targetDate - The target date
 * @returns {Object} Object with days, hours, minutes, seconds remaining
 */
function getTimeRemaining(targetDate) {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    return {
      days: 0, hours: 0, minutes: 0, seconds: 0, expired: true,
    };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);

  return {
    days, hours, minutes, seconds, expired: false,
  };
}

/**
 * Create a flip card element for a time unit
 * @param {string} label - Label for the unit (Days, Hours, etc.)
 * @param {string} id - Unique identifier for updates
 * @returns {HTMLElement} The flip card element
 */
function createFlipCard(label, id) {
  const card = document.createElement('div');
  card.className = 'countdown-timer-card';
  card.dataset.unit = id;

  card.innerHTML = `
    <div class="countdown-timer-flip">
      <div class="countdown-timer-flip-inner">
        <div class="countdown-timer-flip-front">
          <span class="countdown-timer-value">00</span>
        </div>
        <div class="countdown-timer-flip-back">
          <span class="countdown-timer-value">00</span>
        </div>
      </div>
    </div>
    <div class="countdown-timer-label">${label}</div>
  `;

  return card;
}

/**
 * Update a flip card with a new value and trigger animation
 * @param {HTMLElement} card - The flip card element
 * @param {number} value - The new value to display
 */
function updateFlipCard(card, value) {
  const displayValue = String(value).padStart(2, '0');
  const flipInner = card.querySelector('.countdown-timer-flip-inner');
  const frontValue = card.querySelector('.countdown-timer-flip-front .countdown-timer-value');
  const backValue = card.querySelector('.countdown-timer-flip-back .countdown-timer-value');

  // Only animate if value changed
  if (frontValue.textContent === displayValue) return;

  // Set the new value on the back
  backValue.textContent = displayValue;

  // Trigger flip animation
  flipInner.classList.add('flipping');

  // After animation, update front and reset
  setTimeout(() => {
    frontValue.textContent = displayValue;
    flipInner.classList.remove('flipping');
  }, 300);
}

/**
 * Decorate the countdown timer block
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  // Extract the target date from the block content
  const dateText = block.textContent.trim();
  const targetDate = parseTargetDate(dateText);

  // Validate the date
  if (Number.isNaN(targetDate.getTime())) {
    block.innerHTML = '<p class="countdown-timer-error">Invalid date format</p>';
    return;
  }

  // Clear the block and build the countdown structure
  block.textContent = '';

  // Create container for flip cards
  const container = document.createElement('div');
  container.className = 'countdown-timer-cards';

  // Create flip cards for each time unit
  const units = [
    { label: 'Days', id: 'days' },
    { label: 'Hours', id: 'hours' },
    { label: 'Minutes', id: 'minutes' },
    { label: 'Seconds', id: 'seconds' },
  ];

  const cards = {};
  units.forEach(({ label, id }) => {
    const card = createFlipCard(label, id);
    cards[id] = card;
    container.appendChild(card);
  });

  block.appendChild(container);

  // Update function
  function updateCountdown() {
    const time = getTimeRemaining(targetDate);

    updateFlipCard(cards.days, time.days);
    updateFlipCard(cards.hours, time.hours);
    updateFlipCard(cards.minutes, time.minutes);
    updateFlipCard(cards.seconds, time.seconds);

    if (time.expired) {
      block.classList.add('expired');
    }
  }

  // Initial update
  updateCountdown();

  // Update every second
  const interval = setInterval(() => {
    updateCountdown();
    const time = getTimeRemaining(targetDate);
    if (time.expired) {
      clearInterval(interval);
    }
  }, 1000);
}

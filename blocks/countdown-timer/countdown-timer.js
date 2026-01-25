/**
 * Create a flip tile element for a single digit
 * @param {string} digit - The digit to display
 * @returns {Element} The flip tile element
 */
function createFlipTile(digit) {
  const tile = document.createElement('div');
  tile.className = 'flip-tile';
  tile.dataset.value = digit;

  const top = document.createElement('div');
  top.className = 'flip-tile-top';
  top.textContent = digit;

  const bottom = document.createElement('div');
  bottom.className = 'flip-tile-bottom';
  bottom.textContent = digit;

  const flipTop = document.createElement('div');
  flipTop.className = 'flip-tile-flip-top';
  flipTop.textContent = digit;

  const flipBottom = document.createElement('div');
  flipBottom.className = 'flip-tile-flip-bottom';
  flipBottom.textContent = digit;

  tile.append(top, bottom, flipTop, flipBottom);
  return tile;
}

/**
 * Create a countdown unit (e.g., days, hours) with two digit tiles
 * @param {string} value - Two-digit value
 * @param {string} label - Label for the unit
 * @returns {Element} The countdown unit element
 */
function createCountdownUnit(value, label) {
  const unit = document.createElement('div');
  unit.className = 'countdown-unit';

  const digits = document.createElement('div');
  digits.className = 'countdown-digits';

  const digit1 = createFlipTile(value[0]);
  const digit2 = createFlipTile(value[1]);
  digits.append(digit1, digit2);

  const labelEl = document.createElement('div');
  labelEl.className = 'countdown-label';
  labelEl.textContent = label;

  unit.append(digits, labelEl);
  return unit;
}

/**
 * Update a flip tile with animation
 * @param {Element} tile - The tile element to update
 * @param {string} newValue - The new digit value
 */
function updateFlipTile(tile, newValue) {
  const currentValue = tile.dataset.value;
  if (currentValue === newValue) return;

  const flipTop = tile.querySelector('.flip-tile-flip-top');
  const flipBottom = tile.querySelector('.flip-tile-flip-bottom');
  const top = tile.querySelector('.flip-tile-top');
  const bottom = tile.querySelector('.flip-tile-bottom');

  // Set the flip elements to show old value, then animate to new value
  flipTop.textContent = currentValue;
  flipBottom.textContent = newValue;

  // Trigger the flip animation
  tile.classList.add('flipping');

  // After animation, update the static tiles and remove animation class
  setTimeout(() => {
    top.textContent = newValue;
    bottom.textContent = newValue;
    flipTop.textContent = newValue;
    tile.dataset.value = newValue;
    tile.classList.remove('flipping');
  }, 600);
}

/**
 * Calculate time remaining until target date
 * @param {Date} targetDate - The target date
 * @returns {Object} Object with days, hours, minutes, seconds
 */
function getTimeRemaining(targetDate) {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    return {
      days: '00', hours: '00', minutes: '00', seconds: '00', expired: true,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    expired: false,
  };
}

/**
 * Update all countdown units
 * @param {Element} block - The block element
 * @param {Date} targetDate - The target date
 */
function updateCountdown(block, targetDate) {
  const time = getTimeRemaining(targetDate);

  const units = block.querySelectorAll('.countdown-unit');
  const values = [time.days, time.hours, time.minutes, time.seconds];

  units.forEach((unit, index) => {
    const tiles = unit.querySelectorAll('.flip-tile');
    const value = values[index];
    updateFlipTile(tiles[0], value[0]);
    updateFlipTile(tiles[1], value[1]);
  });

  if (time.expired) {
    block.classList.add('expired');
  }
}

/**
 * Decorate the countdown-timer block
 * @param {Element} block - The block element
 */
export default function decorate(block) {
  // Get the target date from the block content
  const dateCell = block.querySelector('div > div');
  const dateString = dateCell?.textContent?.trim();

  if (!dateString) {
    block.textContent = 'No target date specified';
    return;
  }

  const targetDate = new Date(dateString);
  if (Number.isNaN(targetDate.getTime())) {
    block.textContent = 'Invalid date format';
    return;
  }

  // Clear the block and build the countdown UI
  block.textContent = '';

  const countdown = document.createElement('div');
  countdown.className = 'countdown';

  const time = getTimeRemaining(targetDate);

  // Create units for days, hours, minutes, seconds
  const daysUnit = createCountdownUnit(time.days, 'Days');
  const hoursUnit = createCountdownUnit(time.hours, 'Hours');
  const minutesUnit = createCountdownUnit(time.minutes, 'Minutes');
  const secondsUnit = createCountdownUnit(time.seconds, 'Seconds');

  // Add separators between units
  const separator1 = document.createElement('div');
  separator1.className = 'countdown-separator';
  separator1.textContent = ':';

  const separator2 = document.createElement('div');
  separator2.className = 'countdown-separator';
  separator2.textContent = ':';

  const separator3 = document.createElement('div');
  separator3.className = 'countdown-separator';
  separator3.textContent = ':';

  const units = [daysUnit, separator1, hoursUnit, separator2, minutesUnit, separator3, secondsUnit];
  countdown.append(...units);
  block.append(countdown);

  // Start the countdown timer
  const intervalId = setInterval(() => {
    updateCountdown(block, targetDate);
    if (block.classList.contains('expired')) {
      clearInterval(intervalId);
    }
  }, 1000);
}

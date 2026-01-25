import { getMetadata, decorateIcons } from '../../scripts/aem.js';

/**
 * Parses a date string in either ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM) or DD/MM/YYYY format.
 * @param {string} dateStr - The date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:MM)
  if (dateStr.includes('-') && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const date = new Date(dateStr);
    if (!Number.isNaN(date.getTime())) return date;
  }

  // Fallback to DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function addWebinarStatus(block) {
  if (!document.body.classList.contains('webinar')) return;

  const rawDate = getMetadata('date');
  if (!rawDate) return;

  const eventDate = parseDate(rawDate);
  if (!eventDate) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isUpcoming = eventDate >= today;
  const isFrench = window.location.pathname.includes('/fr/');

  // Create status badge
  const badge = document.createElement('div');
  badge.className = `hero-webinar-status ${isUpcoming ? 'upcoming' : 'on-demand'}`;

  const icon = document.createElement('span');
  icon.className = isUpcoming ? 'icon icon-clock-regular-full' : 'icon icon-chevron-down-solid-full';

  const text = document.createElement('span');
  text.className = 'hero-webinar-status-text';

  let statusText;
  if (isUpcoming) {
    statusText = isFrench ? 'PROCHAIN WEBINAIRE' : 'UPCOMING WEBINAR';
  } else {
    statusText = isFrench ? 'DISPONIBLE SUR DEMANDE' : 'AVAILABLE ON DEMAND';
  }
  text.textContent = statusText;

  badge.appendChild(icon);
  badge.appendChild(text);

  // Insert before h1
  const h1 = block.querySelector('h1');
  if (h1) {
    h1.parentNode.insertBefore(badge, h1);
    decorateIcons(badge);
  }
}

export default function decorate(block) {
  // Add webinar status badge if applicable
  addWebinarStatus(block);

  // Force high-resolution image on all screen sizes
  const picture = block.querySelector('picture');
  if (picture) {
    const sources = picture.querySelectorAll('source');
    sources.forEach((source) => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        // Replace width parameter with higher resolution (2000px)
        const highResSrcset = srcset.replace(/width=\d+/, 'width=2000');
        source.setAttribute('srcset', highResSrcset);
      }
      // Remove media query to apply high-res to all breakpoints
      source.removeAttribute('media');
    });

    // Also update the img src fallback
    const img = picture.querySelector('img');
    if (img) {
      const src = img.getAttribute('src');
      if (src) {
        img.setAttribute('src', src.replace(/width=\d+/, 'width=2000'));
      }
    }
  }
}

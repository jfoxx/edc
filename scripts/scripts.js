import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateBlock,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  waitForFirstImage,
  loadBlock,
  loadSection,
  loadSections,
  loadCSS,
  sampleRUM,
  readBlockConfig,
  toClassName,
  toCamelCase,
} from './aem.js';

/**
 * Authentication Utilities
 */

/**
 * Handles user logout
 * @param {boolean} redirect - Whether to redirect after logout (default: true)
 */
export function handleLogout(redirect = true) {
  // Clear all user-related data from localStorage
  const userFields = [
    'username',
    'firstName',
    'lastName',
    'email',
    'company',
    'phone',
    'role',
    'authToken',
    'loginTime',
  ];

  userFields.forEach((field) => {
    localStorage.removeItem(field);
  });

  if (redirect) {
    window.location.href = '/';
  }
}

/**
 * Checks if a user is currently logged in
 * @returns {boolean} True if user is logged in
 */
export function checkLoginStatus() {
  const token = localStorage.getItem('authToken');
  const firstName = localStorage.getItem('firstName');

  if (!token || !firstName) {
    return false;
  }

  // Check if token is expired (optional - for fake token validation)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() > payload.exp) {
      // Token expired, clear storage
      handleLogout(false);
      return false;
    }
  } catch (e) {
    // Invalid token format, still consider logged in if firstName exists
    return !!firstName;
  }

  return true;
}

/**
 * Gets the current user data from localStorage
 * @returns {Object|null} User object or null if not logged in
 */
export function getCurrentUser() {
  if (!checkLoginStatus()) {
    return null;
  }

  return {
    username: localStorage.getItem('username'),
    firstName: localStorage.getItem('firstName'),
    lastName: localStorage.getItem('lastName'),
    email: localStorage.getItem('email'),
    company: localStorage.getItem('company'),
    phone: localStorage.getItem('phone'),
    role: localStorage.getItem('role'),
  };
}

/**
 * Experimentation plugin
 */

const experimentationConfig = {
  prodHost: 'www.my-site.com',
  audiences: {
    mobile: () => window.innerWidth < 600,
    desktop: () => window.innerWidth >= 600,
    // define your custom audiences here as needed
  },
};

let runExperimentation;
let showExperimentationOverlay;
const isExperimentationEnabled = document.head.querySelector('[name^="experiment"],[name^="campaign-"],[name^="audience-"],[property^="campaign:"],[property^="audience:"]')
    || [...document.querySelectorAll('.section-metadata div')].some((d) => d.textContent.match(/Experiment|Campaign|Audience/i));
if (isExperimentationEnabled) {
  ({
    loadEager: runExperimentation,
    loadLazy: showExperimentationOverlay,
    // eslint-disable-next-line import/no-relative-packages
  } = await import('../plugins/experimentation/src/index.js'));
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const h2 = main.querySelector('h2');
  const img = document.createElement('div');
  img.className = 'hero-image';
  // eslint-disable-next-line no-bitwise
  if (h1 && h2 && (h1.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING)) {
    const section = document.createElement('div');
    const hero = buildBlock('hero', { elems: [img, h1, h2] });
    section.classList.add('simple-hero');
    section.append(hero);
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds webinar 3-column layout for first section after hero.
 * @param {Element} main The container element
 */
function buildWebinarLayout(main) {
  if (!document.body.classList.contains('webinar')) return;

  // Find the first section after the hero
  const sections = [...main.querySelectorAll(':scope > .section')];
  const targetSection = sections.find((section) => !section.querySelector('.hero'));

  if (!targetSection) return;

  // Find the section-divider block
  const divider = targetSection.querySelector('.section-divider-wrapper');
  if (!divider) return;

  // Create 3-column layout wrapper
  const wrapper = document.createElement('div');
  wrapper.classList.add('webinar-layout-wrapper');

  // Column 1: Auto-generated event details (20%)
  const col1 = document.createElement('div');
  col1.classList.add('webinar-col-left');

  // Build event details from metadata
  const rawDate = getMetadata('date');
  const eventTime = getMetadata('time');
  const isFrench = window.location.pathname.includes('/fr/');
  const defaultLocation = isFrench ? 'En ligne' : 'Online';
  const eventLocation = getMetadata('location') || defaultLocation;

  // Parse date - supports ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM) and DD/MM/YYYY format
  let eventDate = '';
  if (rawDate) {
    let dateObj = null;

    // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:MM from date-inserter plugin)
    if (rawDate.includes('-') && rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
      dateObj = new Date(rawDate);
      if (Number.isNaN(dateObj.getTime())) dateObj = null;
    }

    // Fallback to DD/MM/YYYY format
    if (!dateObj) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        if (Number.isNaN(dateObj.getTime())) dateObj = null;
      }
    }

    if (dateObj) {
      if (isFrench) {
        const daysFr = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
        const monthsFr = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
          'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const dayName = daysFr[dateObj.getDay()];
        const monthName = monthsFr[dateObj.getMonth()];
        const day = dateObj.getDate();
        const year = dateObj.getFullYear();
        eventDate = `${dayName}, ${day} ${monthName}, ${year}`;
      } else {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const dayName = days[dateObj.getDay()];
        const monthName = months[dateObj.getMonth()];
        const day = dateObj.getDate();
        const year = dateObj.getFullYear();
        eventDate = `${dayName}, ${monthName} ${day}, ${year}`;
      }
    } else {
      eventDate = rawDate;
    }
  }

  // Labels based on language
  const labelDateTime = isFrench ? 'Date et heure' : 'Date and time';
  const labelLocation = isFrench ? 'Emplacement' : 'Location';

  let eventDetailsHTML = '<div class="webinar-event-details">';

  if (eventDate || eventTime) {
    eventDetailsHTML += '<div class="webinar-event-datetime">';
    eventDetailsHTML += `<p class="webinar-event-label">${labelDateTime}</p>`;
    if (eventDate) {
      eventDetailsHTML += `<p class="webinar-event-date">${eventDate}</p>`;
    }
    if (eventTime) {
      eventDetailsHTML += `<p class="webinar-event-time">${eventTime}</p>`;
    }
    eventDetailsHTML += '</div>';
  }

  eventDetailsHTML += '<div class="webinar-event-location">';
  eventDetailsHTML += `<p class="webinar-event-label">${labelLocation}</p>`;
  eventDetailsHTML += `<p class="webinar-event-place">${eventLocation}</p>`;
  eventDetailsHTML += '</div>';

  eventDetailsHTML += '</div>';
  col1.innerHTML = eventDetailsHTML;

  // Column 2: Content before divider (60%)
  const col2 = document.createElement('div');
  col2.classList.add('webinar-col-main');

  // Column 3: Content after divider (20%)
  const col3 = document.createElement('div');
  col3.classList.add('webinar-col-right');

  // Collect children and split by divider
  let currentCol = col2;
  const children = [...targetSection.children];
  children.forEach((child) => {
    if (child === divider) {
      currentCol = col3;
      return;
    }
    if (child.classList.contains('section-metadata-wrapper')) return;
    currentCol.appendChild(child);
  });

  // Remove the divider
  divider.remove();

  // Build the layout
  wrapper.appendChild(col1);
  wrapper.appendChild(col2);
  wrapper.appendChild(col3);
  targetSection.insertBefore(wrapper, targetSection.firstChild);

  // Add class to section for styling
  targetSection.classList.add('webinar-layout');
}

/**
 * Builds two column grid.
 * @param {Element} main The container element
 */
function buildLayoutContainer(main) {
  main.querySelectorAll(':scope > .section[data-layout]').forEach((section) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('layout-wrapper');
    const leftDiv = document.createElement('div');
    leftDiv.classList.add('left-column');
    const rightDiv = document.createElement('div');
    rightDiv.classList.add('right-column');
    let current = leftDiv;
    [...section.children].forEach((child) => {
      if (child.classList.contains('column-separator-wrapper')) {
        current = rightDiv;
        child.remove();
        return;
      }
      current.append(child);
    });
    wrapper.append(leftDiv, rightDiv);
    section.append(wrapper);
  });
}

async function loadTypekit(doc, id) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://use.typekit.net/${id}.css`;
  const head = doc.querySelector('head');
  head.append(link);
}

function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import(`${window.hlx.codeBasePath}/blocks/modal/modal.js`);
      openModal(origin.href);
    }
  });
}

/**
 * Builds breadcrumb block for news pages.
 * @param {Element} main The container element
 */
function buildBreadcrumbBlock(main) {
  // Create breadcrumb section
  const breadcrumbSection = document.createElement('div');
  const breadcrumb = buildBlock('breadcrumb', { elems: [] });
  breadcrumbSection.appendChild(breadcrumb);
  main.prepend(breadcrumbSection);
}

/**
 * Builds news article layout with dateline and release date.
 * Splits content so H1 + dateline are in hero section, article content in body section.
 * @param {Element} main The container element
 */
function buildNewsLayout(main) {
  if (!document.body.classList.contains('news')) return;

  // Add breadcrumb for news pages
  buildBreadcrumbBlock(main);

  // Get the first section (after breadcrumb)
  const sections = main.querySelectorAll(':scope > div');
  const firstSection = sections.length > 1 ? sections[1] : sections[0];
  if (!firstSection) return;

  // Get metadata
  const dateline = getMetadata('dateline');
  const releaseDate = getMetadata('release-date');

  // Find the H1
  const h1 = firstSection.querySelector('h1');
  if (!h1) return;

  // Create news header with dateline and date
  const newsHeader = document.createElement('div');
  newsHeader.classList.add('news-header');

  if (releaseDate && dateline) {
    newsHeader.innerHTML = `<p class="news-dateline">${releaseDate} ${dateline}</p>`;
  } else if (releaseDate) {
    newsHeader.innerHTML = `<p class="news-dateline">${releaseDate}</p>`;
  } else if (dateline) {
    newsHeader.innerHTML = `<p class="news-dateline">${dateline}</p>`;
  }

  // Get all content after H1 (this will become the article body section)
  const contentWrapper = firstSection.querySelector('.default-content-wrapper');
  if (!contentWrapper) return;

  // Collect all elements after H1 for the body section
  const bodyElements = [];
  let foundH1 = false;
  let skipNewsHeader = false;

  [...contentWrapper.children].forEach((child) => {
    if (child === h1) {
      foundH1 = true;
      return;
    }
    if (foundH1) {
      // Skip the first paragraph if it matches dateline pattern (already in metadata)
      if (!skipNewsHeader && child.tagName === 'P') {
        const text = child.textContent.trim();
        // Check if this paragraph is just the dateline info we already have
        if (dateline && releaseDate && text.includes(dateline) && text.includes(releaseDate)) {
          skipNewsHeader = true;
          return;
        }
        if (text.match(/^[A-Z]+,?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i)) {
          skipNewsHeader = true;
          return;
        }
      }
      bodyElements.push(child);
    }
  });

  // Create new body section for article content
  if (bodyElements.length > 0) {
    const bodySection = document.createElement('div');
    bodySection.classList.add('section');
    bodySection.dataset.sectionStatus = 'initialized';

    const bodyWrapper = document.createElement('div');
    bodyWrapper.classList.add('default-content-wrapper');

    bodyElements.forEach((el) => bodyWrapper.appendChild(el));
    bodySection.appendChild(bodyWrapper);

    // Insert body section after the hero section
    firstSection.after(bodySection);
  }

  // Keep only H1 and news header in first section
  contentWrapper.innerHTML = '';
  contentWrapper.appendChild(h1);
  if (newsHeader.innerHTML) {
    contentWrapper.appendChild(newsHeader);
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // Skip hero block for news pages - they have their own layout
    if (!main.querySelector('.hero') && !document.body.classList.contains('news')) {
      buildHeroBlock(main);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Load Adobe Target.
 */
function initATJS(path, config) {
  window.targetGlobalSettings = config;
  return new Promise((resolve) => {
    import(path).then(resolve);
  });
}

function onDecoratedElement(fn) {
  // Apply propositions to all already decorated blocks/sections
  if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
    fn();
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.target.tagName === 'BODY'
      || m.target.dataset.sectionStatus === 'loaded'
      || m.target.dataset.blockStatus === 'loaded')) {
      fn();
    }
  });
  // Watch sections and blocks being decorated async
  observer.observe(document.querySelector('main'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-block-status', 'data-section-status'],
  });
  // Watch anything else added to the body
  observer.observe(document.querySelector('body'), { childList: true });
}

function toCssSelector(selector) {
  return selector.replace(/(\.\S+)?:eq\((\d+)\)/g, (_, clss, i) => `:nth-child(${Number(i) + 1}${clss ? ` of ${clss})` : ''}`);
}

async function getElementForOffer(offer) {
  const selector = offer.cssSelector || toCssSelector(offer.selector);
  return document.querySelector(selector);
}

async function getElementForMetric(metric) {
  const selector = toCssSelector(metric.selector);
  return document.querySelector(selector);
}

function autoDecorateFragment(el) {
  const a = document.createElement('a');
  const href = el.getAttribute('data-fragment');
  a.href = href;
  a.className = 'at-element-marker';
  const fragmentBlock = buildBlock('fragment', a);
  el.replaceWith(fragmentBlock);
  decorateBlock(fragmentBlock);
  return loadBlock(fragmentBlock);
}

function observeAndDecorateBlocks() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-fragment')) {
          autoDecorateFragment(node);
        }
      });
    });
  });

  observer.observe(document.querySelector('main'), {
    childList: true,
    subtree: true,
  });
}

async function getAndApplyOffers() {
  const response = await window.adobe.target.getOffers({ request: { execute: { pageLoad: {} } } });
  const { options = [], metrics = [] } = response.execute.pageLoad;
  onDecoratedElement(() => {
    window.adobe.target.applyOffers({ response });
    // keeping track of offers that were already applied
    // eslint-disable-next-line no-return-assign
    options.forEach((o) => o.content = o.content.filter((c) => !getElementForOffer(c)));
    // keeping track of metrics that were already applied
    metrics.map((m, i) => (getElementForMetric(m) ? i : -1))
      .filter((i) => i >= 0)
      .reverse()
      .map((i) => metrics.splice(i, 1));
  });
}

// eslint-disable-next-line no-unused-vars
let atjsPromise = Promise.resolve();
if (getMetadata('target')) {
  // eslint-disable-next-line no-unused-vars
  atjsPromise = initATJS('./at.js', {
    clientCode: 'foxx',
    serverDomain: 'foxx.tt.omtrdc.net',
    imsOrgId: '4009236F6182AB170A495EC3@AdobeOrg',
    bodyHidingEnabled: false,
    cookieDomain: window.location.hostname,
    pageLoadEnabled: false,
    secureOnly: true,
    viewsEnabled: false,
    withWebGLRenderer: false,
  });
  document.addEventListener('at-library-loaded', () => {
    observeAndDecorateBlocks();
    getAndApplyOffers();
  });
}

/**
 * Decorates all sections in a container element.
 * @param {Element} main The container element
 */
function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if (e.classList.contains('richtext')) {
        e.removeAttribute('class');
        if (!defaultContent) {
          const wrapper = document.createElement('div');
          wrapper.classList.add('default-content-wrapper');
          wrappers.push(wrapper);
          defaultContent = true;
        }
      } else if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = document.createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV';
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });

    // Add wrapped content back
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';

    // Process section metadata
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          const styles = meta.style
            .split(',')
            .filter((style) => style)
            .map((style) => toClassName(style.trim()));
          styles.forEach((style) => section.classList.add(style));
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });

      // Set section anchor/id for deep linking
      const anchor = meta.anchor || meta.id;
      if (anchor) {
        section.id = toClassName(anchor);
      }

      sectionMeta.parentNode.remove();
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  if (runExperimentation) {
    await runExperimentation(document, experimentationConfig);
  }
  doc.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  if (getMetadata('breadcrumbs').toLowerCase() === 'true') {
    doc.body.dataset.breadcrumbs = true;
  }
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    buildLayoutContainer(main);
    buildWebinarLayout(main);
    buildNewsLayout(main);
    doc.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }
  loadTypekit(doc, 'bdy4rib');
  sampleRUM.enhance();

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Parses a date string in various formats and returns a Date object.
 * Supports: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
 * @param {string} dateStr The date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // Try YYYY-MM-DD format
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Try MM/DD/YYYY or DD/MM/YYYY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    // Heuristic: if first > 12, assume DD/MM/YYYY
    // Otherwise assume MM/DD/YYYY (US format)
    if (Number(first) > 12) {
      // DD/MM/YYYY
      return new Date(Number(year), Number(second) - 1, Number(first));
    }
    // MM/DD/YYYY
    return new Date(Number(year), Number(first) - 1, Number(second));
  }

  return null;
}

/**
 * Formats a Date object as YYYY-MM-DD.
 * @param {Date} date The date to format
 * @returns {string} Formatted date string
 */
function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds last modified date to the bottom of main if metadata exists.
 * @param {Element} main The main element
 */
function addLastModifiedDate(main) {
  const lastModified = getMetadata('last-modified');
  if (!lastModified) return;

  const date = parseDate(lastModified);
  if (!date || Number.isNaN(date.getTime())) return;

  const isFrench = window.location.pathname.includes('/fr/');
  const label = isFrench ? 'Date de modification' : 'Date modified';
  const formattedDate = formatDateISO(date);
  const dateElement = document.createElement('div');
  dateElement.className = 'last-modified';
  dateElement.textContent = `${label}: ${formattedDate}`;
  main.append(dateElement);
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);

  // Add last modified date to bottom of main
  addLastModifiedDate(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  if (showExperimentationOverlay) {
    await showExperimentationOverlay(document, experimentationConfig);
  }
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadSidekick() {
  if (document.querySelector('aem-sidekick')) {
    import('./sidekick.js');
    return;
  }

  document.addEventListener('sidekick-ready', () => {
    import('./sidekick.js');
  });
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
  loadSidekick();
}

// UE Editor support before page load
if (window.location.hostname.includes('ue.da.live')) {
  // eslint-disable-next-line import/no-unresolved
  await import(`${window.hlx.codeBasePath}/ue/scripts/ue.js`).then(({ default: ue }) => ue());
}

loadPage();

const { searchParams, origin } = new URL(window.location.href);
const branch = searchParams.get('nx') || 'main';

export const NX_ORIGIN = branch === 'local' || origin.includes('localhost') ? 'http://localhost:6456/nx' : 'https://da.live/nx';

(async function loadDa() {
  /* eslint-disable import/no-unresolved */
  if (searchParams.get('dapreview')) {
    import('https://da.live/scripts/dapreview.js')
      .then(({ default: daPreview }) => daPreview(loadPage));
  }
  if (searchParams.get('daexperiment')) {
    import(`${NX_ORIGIN}/public/plugins/exp/exp.js`);
  }
}());

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
 * Experimentation plugin
 */

const experimentationConfig = {
  prodHost: 'www.my-site.com',
  audiences: {
    mobile: () => window.innerWidth < 600,
    desktop: () => window.innerWidth >= 600,
    // define your custom audiences here as needed
  }
};

let runExperimentation;
let showExperimentationOverlay;
const isExperimentationEnabled = document.head.querySelector('[name^="experiment"],[name^="campaign-"],[name^="audience-"],[property^="campaign:"],[property^="audience:"]')
    || [...document.querySelectorAll('.section-metadata div')].some((d) => d.textContent.match(/Experiment|Campaign|Audience/i));
if (isExperimentationEnabled) {
  ({
    loadEager: runExperimentation,
    loadLazy: showExperimentationOverlay,
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
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    if (!main.querySelector('.hero')) buildHeroBlock(main);
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
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);

  const main = doc.querySelector('main');
  await loadSections(main);

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


async function loadSidekick() {
  if (document.querySelector('aem-sidekick')) {
    import('./sidekick.js');
    return;
  }

  document.addEventListener('sidekick-ready', () => {
    import('./sidekick.js');
  });
}

(async function loadDa() {
  const { searchParams } = new URL(window.location.href);

  /* eslint-disable import/no-unresolved */
  if (searchParams.get('dapreview')) {
    import('https://da.live/scripts/dapreview.js')
      .then(({ default: daPreview }) => daPreview(loadPage));
  }
  if (searchParams.get('daexperiment')) {
    import('https://da.live/nx/public/plugins/exp/exp.js');
  }
}());

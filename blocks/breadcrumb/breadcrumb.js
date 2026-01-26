/**
 * Fetches the page title from a given URL
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} The page title or empty string
 */
async function getPageTitle(url) {
  try {
    const resp = await fetch(url);
    if (resp.ok) {
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const title = doc.querySelector('title');
      return title ? title.textContent.split('|')[0].trim() : '';
    }
  } catch (e) {
    // Silently fail for pages that can't be fetched
  }
  return '';
}

/**
 * Gets all parent paths except the current page
 * @param {string} pathname - The current page pathname
 * @returns {Promise<Array>} Array of path objects with path, name, and url
 */
async function getAllPathsExceptCurrent(pathname) {
  const result = [];
  // Remove first and last slash characters, split into parts
  const pathsList = pathname.replace(/^\/|\/$/g, '').split('/');

  // Process all paths except the last one (current page)
  for (let i = 0; i < pathsList.length - 1; i += 1) {
    const pathPart = pathsList[i];
    const prevPath = result[i - 1] ? result[i - 1].path : '';
    const path = `${prevPath}/${pathPart}`;
    const url = `${window.location.origin}${path}`;

    /* eslint-disable-next-line no-await-in-loop */
    const name = await getPageTitle(url);
    if (name) {
      result.push({ path, name, url });
    }
  }

  return result;
}

/**
 * Creates a breadcrumb link element
 * @param {Object} pathInfo - Object with name and url properties
 * @returns {HTMLElement} The anchor element
 */
function createLink(pathInfo) {
  const link = document.createElement('a');
  link.href = pathInfo.url;
  link.textContent = pathInfo.name;
  return link;
}

/**
 * Creates a separator element
 * @returns {HTMLElement} The separator span
 */
function createSeparator() {
  const separator = document.createElement('span');
  separator.className = 'breadcrumb-separator';
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '/';
  return separator;
}

/**
 * Decorates the breadcrumb block
 * @param {HTMLElement} block - The block element
 */
export default async function decorate(block) {
  // Create nav element for accessibility
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  // Create ordered list for breadcrumb items
  const ol = document.createElement('ol');
  ol.className = 'breadcrumb-list';

  // Clear block content
  block.textContent = '';

  // Add Home link
  const homeLi = document.createElement('li');
  const homeLink = createLink({ name: 'Home', url: window.location.origin });
  homeLi.appendChild(homeLink);
  ol.appendChild(homeLi);

  // Fetch and add parent paths
  const paths = await getAllPathsExceptCurrent(window.location.pathname);
  paths.forEach((pathInfo) => {
    const li = document.createElement('li');
    li.appendChild(createSeparator());
    li.appendChild(createLink(pathInfo));
    ol.appendChild(li);
  });

  // Add current page (not linked)
  const currentLi = document.createElement('li');
  currentLi.appendChild(createSeparator());
  const currentSpan = document.createElement('span');
  currentSpan.setAttribute('aria-current', 'page');
  currentSpan.textContent = document.querySelector('title')?.textContent.split('|')[0].trim() || '';
  currentLi.appendChild(currentSpan);
  ol.appendChild(currentLi);

  nav.appendChild(ol);
  block.appendChild(nav);
}

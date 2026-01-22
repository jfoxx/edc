import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Creates the hamburger menu button for mobile navigation
 * @returns {Element} The hamburger button element
 */
function createHamburgerButton() {
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `
    <button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>
  `;
  return hamburger;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav/nav';
  const isSimpleNav = navPath.includes('simple');
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      const dropdownMenu = navSection.querySelector('ul');
      if (dropdownMenu) {
        navSection.classList.add('nav-drop');

        // Get the nav item title text
        const navTitle = navSection.querySelector(':scope > p')?.textContent?.trim() || '';

        // Check for description in the first item (look for em/italic text)
        const firstItem = dropdownMenu.querySelector(':scope > li:first-child');
        let description = '';
        const emElement = firstItem?.querySelector('em');
        if (emElement) {
          description = emElement.textContent.trim();
          // Remove the em element or the entire first li if it only contains the description
          if (firstItem.textContent.trim() === description) {
            firstItem.remove();
          } else {
            emElement.remove();
          }
        }

        // Create mega menu structure
        const megaMenuIntro = document.createElement('div');
        megaMenuIntro.className = 'mega-menu-intro';
        megaMenuIntro.innerHTML = `
          <h2>${navTitle}</h2>
          <p class="mega-menu-description">${description || ''}</p>
        `;

        // Wrap existing menu items in a container
        const megaMenuItems = document.createElement('div');
        megaMenuItems.className = 'mega-menu-items';
        while (dropdownMenu.firstChild) {
          megaMenuItems.appendChild(dropdownMenu.firstChild);
        }

        // Add the new structure to the dropdown
        dropdownMenu.appendChild(megaMenuIntro);
        dropdownMenu.appendChild(megaMenuItems);
      }

      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // Create utility row wrapper (brand + tools)
  const navTools = nav.querySelector('.nav-tools');

  // Handle utility nav links
  if (navTools) {
    // First, convert strong-wrapped links to CTA buttons and remove strong tag
    navTools.querySelectorAll('strong > a').forEach((link) => {
      const strong = link.parentElement;
      const parent = strong.parentElement;
      link.classList.add('nav-cta');
      parent.classList.add('nav-cta-container');
      // Replace strong with just the link
      strong.replaceWith(link);
    });

    // Remove default .button class from all links in nav-tools (they get auto-decorated)
    navTools.querySelectorAll('a.button').forEach((link) => {
      link.classList.remove('button');
      const parent = link.closest('.button-container');
      if (parent) {
        parent.classList.remove('button-container');
      }
    });
  }

  const utilityRow = document.createElement('div');
  utilityRow.className = 'nav-utility-row';

  // Move brand and tools into utility row
  if (navBrand) {
    utilityRow.appendChild(navBrand);
  }

  // Add hamburger menu for mobile
  const hamburger = createHamburgerButton();
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));

  if (navTools) {
    utilityRow.appendChild(navTools);
  }

  utilityRow.appendChild(hamburger);

  // Build nav structure: utility row on top, sections below
  const navContent = document.createElement('div');
  navContent.className = 'nav-content';
  navContent.appendChild(utilityRow);
  if (navSections) {
    navContent.appendChild(navSections);
  }

  // Clear and rebuild nav
  nav.innerHTML = '';
  nav.appendChild(navContent);

  const navWrapper = document.createElement('div');
  navWrapper.className = isSimpleNav ? 'nav-wrapper simple' : 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}

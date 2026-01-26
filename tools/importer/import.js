/*
 * EDC Import Script
 * Custom import transformations for edc.ca pages
 *
 * Usage: This file is used with the AEM Importer tool to transform
 * EDC website pages into Word documents compatible with Edge Delivery Services.
 *
 * Run: aem import --url https://www.edc.ca/en/get-export-ready.html
 */

/* global WebImporter */

/**
 * Remove unwanted elements from the DOM
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function cleanup(document, main) {
  // Remove header, footer, and navigation elements
  WebImporter.DOMUtils.remove(main, [
    'header',
    'footer',
    'nav',
    '.header',
    '.footer',
    '.navigation',
    '#skip-to-main-content',
    '.skip-navigation',
    // Remove cookie banners and overlays
    '.cookie-banner',
    '.cookie-consent',
    '.overlay',
    '.modal',
    // Remove social sharing widgets
    '.social-share',
    '.share-buttons',
    // Remove ads and promotional popups
    '.ad-banner',
    '.promo-popup',
    // Remove reCAPTCHA
    '.grecaptcha-badge',
    'iframe[src*="recaptcha"]',
    // Remove OneTrust cookie consent
    '#onetrust-consent-sdk',
    '.onetrust-consent-sdk',
    // Remove forms
    'form',
    // Remove hidden elements
    '.hide',
    '.c-processing-screen',
    // Remove date modified text (captured in metadata)
    '[class*="date-modified"]',
    '.page-date',
    // Remove "Was this page helpful" feedback widget
    '[class*="page-helpful"]',
    'fieldset',
    // Remove any scripts or styles
    'script',
    'style',
    'noscript',
  ]);
}

/**
 * Create Hero content from the first H1 on the page
 * For simple heroes (no background image): just H1 + H2 (from description) + section break
 * For heroes with background image: create a Hero block
 *
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createHeroBlock(document, main) {
  // Find the first H1 anywhere in the document
  const h1 = document.querySelector('h1');
  if (!h1) return;

  // Get the parent container
  const parent = h1.parentElement;
  if (!parent) return;

  // Find sibling or child paragraph for description
  let description = parent.querySelector('p');
  if (!description) {
    // Check next sibling
    description = h1.nextElementSibling;
    if (description && description.tagName !== 'P') {
      description = null;
    }
  }

  // Find any background image in the parent or nearby
  const image = parent.querySelector('img, picture');
  const hasBackgroundImage = image
    || parent.style.backgroundImage
    || parent.closest('[style*="background"]');

  if (hasBackgroundImage && image) {
    // Hero WITH background image - create Hero block
    const cells = [['Hero']];
    const contentCell = document.createElement('div');

    contentCell.appendChild(image.cloneNode(true));
    contentCell.appendChild(h1.cloneNode(true));
    if (description) {
      contentCell.appendChild(description.cloneNode(true));
    }

    cells.push([contentCell]);
    const table = WebImporter.DOMUtils.createTable(cells, document);
    main.prepend(table);
  } else {
    // Simple hero (no background image) - just H1, H2, and section break for autoblock
    const heroSection = document.createElement('div');

    // Add H1
    heroSection.appendChild(h1.cloneNode(true));

    // Convert description to H2
    if (description) {
      const h2 = document.createElement('h2');
      h2.textContent = description.textContent;
      heroSection.appendChild(h2);
    }

    // Add section break
    const hr = document.createElement('hr');
    heroSection.appendChild(hr);

    main.prepend(heroSection);
  }

  // Remove original elements
  h1.remove();
  if (description) {
    description.remove();
  }
  if (image) {
    image.remove();
  }

  // Clean up empty parent containers
  let container = parent;
  while (container && container !== document.body && container.textContent.trim() === '') {
    const toRemove = container;
    container = container.parentElement;
    toRemove.remove();
  }
}

/**
 * Create Cards block from card-like structures
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createCardsBlock(document, main) {
  // Find card containers (groups of similar items with headings and descriptions)
  const cardContainers = main.querySelectorAll('[class*="card"], [class*="tile"], [class*="feature"]');

  cardContainers.forEach((container) => {
    const heading = container.querySelector('h2, h3, h4');
    const paragraph = container.querySelector('p');
    const image = container.querySelector('img, picture');
    const link = container.querySelector('a');

    // Only create card if there's meaningful content
    if (heading && paragraph) {
      const cells = [['Cards']];
      const cardContent = document.createElement('div');

      if (image) {
        const imgDiv = document.createElement('div');
        imgDiv.appendChild(image.cloneNode(true));
        cardContent.appendChild(imgDiv);
      }

      const textDiv = document.createElement('div');
      textDiv.appendChild(heading.cloneNode(true));
      textDiv.appendChild(paragraph.cloneNode(true));

      if (link && !heading.querySelector('a')) {
        textDiv.appendChild(link.cloneNode(true));
      }

      cardContent.appendChild(textDiv);
      cells.push([cardContent]);

      const table = WebImporter.DOMUtils.createTable(cells, document);
      container.replaceWith(table);
    }
  });
}

/**
 * Create Card-Tabs block from tab structures with cards
 * Card-Tabs structure:
 * - Single column row = tab name
 * - Two column row = card (image | content)
 * - Single column with em + link = footer link for tab
 *
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createCardTabsBlock(document, main) {
  // Find tab structures
  const tabLists = main.querySelectorAll('[role="tablist"], .tabs, [class*="tab-list"]');

  tabLists.forEach((tabList) => {
    const tabs = tabList.querySelectorAll('[role="tab"], .tab, button[class*="tab"]');
    const tabPanels = main.querySelectorAll('[role="tabpanel"], .tab-panel, [class*="tabpanel"]');

    if (tabs.length > 0 && tabPanels.length > 0) {
      const cells = [['Card-Tabs']];

      tabs.forEach((tab, index) => {
        const tabTitle = tab.textContent.trim();
        const panel = tabPanels[index];

        if (panel) {
          // Add tab name row (single column)
          const tabNameDiv = document.createElement('div');
          tabNameDiv.textContent = tabTitle;
          cells.push([tabNameDiv]);

          // Find the card container (first child div that contains multiple cards)
          const cardContainer = panel.querySelector(':scope > div, :scope > ul');
          if (!cardContainer) return;

          // Get direct children that look like cards (have both image and heading)
          const potentialCards = cardContainer.querySelectorAll(':scope > div, :scope > li, :scope > article');

          potentialCards.forEach((card) => {
            // A card must have an image and some text content
            const image = card.querySelector('img, picture');
            const heading = card.querySelector('h3, h4, h5, h6');
            const link = card.querySelector('a');

            // Skip if this doesn't look like a card (no image or no heading)
            if (!image && !heading) return;

            // Create image column
            const imageCol = document.createElement('div');
            if (image) {
              const imgClone = image.cloneNode(true);
              imageCol.appendChild(imgClone);
            }

            // Create content column with link
            const contentCol = document.createElement('div');
            if (heading || link) {
              const linkText = heading ? heading.textContent.trim() : (link ? link.textContent.trim() : '');
              const linkHref = link ? link.href : '';

              if (linkHref && linkText) {
                const a = document.createElement('a');
                a.href = linkHref;
                a.textContent = linkText;
                contentCol.appendChild(a);
              } else if (heading) {
                contentCol.appendChild(heading.cloneNode(true));
              }
            }

            // Only add if we have meaningful content
            if (imageCol.hasChildNodes() && contentCol.hasChildNodes()) {
              cells.push([imageCol, contentCol]);
            }
          });

          // Check for footer link in panel
          const footerLink = panel.querySelector('a.button, a[class*="footer"], a[class*="cta"]');
          if (footerLink) {
            const footerDiv = document.createElement('div');
            const em = document.createElement('em');
            const a = document.createElement('a');
            a.href = footerLink.href;
            a.textContent = footerLink.textContent;
            em.appendChild(a);
            footerDiv.appendChild(em);
            cells.push([footerDiv]);
          }
        }
      });

      const table = WebImporter.DOMUtils.createTable(cells, document);

      // Find the parent section containing tabs and replace
      const tabSection = tabList.closest('section, div[class*="section"]') || tabList.parentElement;
      if (tabSection) {
        tabSection.replaceWith(table);
      }
    }
  });
}

/**
 * Create Quote block from blockquote elements
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createQuoteBlock(document, main) {
  // Look for testimonial figures specifically
  const testimonials = main.querySelectorAll('figure.testimonial, figure:has(blockquote), [class*="testimonial"]:has(blockquote)');

  testimonials.forEach((quoteContainer) => {
    const blockquote = quoteContainer.querySelector('blockquote');
    if (!blockquote) return;

    // Get quote text (from p inside blockquote, but NOT from quote-icon area)
    const quoteTextEl = blockquote.querySelector('#quote p, div p, p');
    if (!quoteTextEl || !quoteTextEl.textContent.trim()) return;

    const cells = [['Quote']];

    // Row 1: Quote text
    const quoteDiv = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = quoteTextEl.textContent.trim();
    quoteDiv.appendChild(p);
    cells.push([quoteDiv]);

    // Row 2: Attribution (name + title in em)
    const authorEl = quoteContainer.querySelector('.author, [class*="author"]');
    const titleEl = quoteContainer.querySelector('.title, cite.title, [class*="title"]');

    if (authorEl || titleEl) {
      const attrDiv = document.createElement('div');
      if (authorEl) {
        const authorP = document.createElement('p');
        authorP.textContent = authorEl.textContent.trim();
        attrDiv.appendChild(authorP);
      }
      if (titleEl) {
        const em = document.createElement('em');
        em.textContent = titleEl.textContent.trim();
        attrDiv.appendChild(em);
      }
      cells.push([attrDiv]);
    }

    // Row 3: Image from .testimonial__image-wrapper (NOT the quote-icon)
    const imageWrapper = quoteContainer.querySelector('.testimonial__image-wrapper');
    if (imageWrapper) {
      const img = imageWrapper.querySelector('img');
      if (img) {
        const imgDiv = document.createElement('div');
        imgDiv.appendChild(img.cloneNode(true));
        cells.push([imgDiv]);
      }
    }

    const table = WebImporter.DOMUtils.createTable(cells, document);
    quoteContainer.replaceWith(table);
  });

  // Also handle generic blockquotes that aren't in testimonial figures
  const genericQuotes = main.querySelectorAll('blockquote:not(figure blockquote)');
  genericQuotes.forEach((blockquote) => {
    const quoteText = blockquote.querySelector('p') || blockquote;
    if (quoteText && quoteText.textContent.trim()) {
      const cells = [['Quote']];
      const quoteDiv = document.createElement('div');
      quoteDiv.innerHTML = quoteText.innerHTML || quoteText.textContent;
      cells.push([quoteDiv]);

      const table = WebImporter.DOMUtils.createTable(cells, document);
      blockquote.replaceWith(table);
    }
  });
}

/**
 * Create Accordion block from accordion structures
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createAccordionBlock(document, main) {
  const accordions = main.querySelectorAll('[class*="accordion"], details, .faq');

  const groupedAccordions = [];
  let currentGroup = [];

  accordions.forEach((accordion) => {
    const header = accordion.querySelector('summary, [class*="accordion-header"], [class*="accordion-title"], h3, h4');
    const content = accordion.querySelector('[class*="accordion-content"], [class*="accordion-body"], .content');

    if (header && content) {
      currentGroup.push({ header, content });
    }
  });

  if (currentGroup.length > 0) {
    groupedAccordions.push(currentGroup);
  }

  groupedAccordions.forEach((group) => {
    if (group.length > 0) {
      const cells = [['Accordion']];

      group.forEach(({ header, content }) => {
        const headerDiv = document.createElement('div');
        headerDiv.textContent = header.textContent.trim();

        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content.innerHTML;

        cells.push([headerDiv, contentDiv]);
      });

      const table = WebImporter.DOMUtils.createTable(cells, document);
      const firstAccordion = group[0].header.closest('[class*="accordion"], details');
      if (firstAccordion) {
        firstAccordion.parentElement.insertBefore(table, firstAccordion);

        // Remove all accordion items in this group
        group.forEach(({ header }) => {
          const item = header.closest('[class*="accordion"], details');
          if (item) item.remove();
        });
      }
    }
  });
}

/**
 * Create Columns block from multi-column layouts
 * Detects both:
 * 1. Container elements with column classes
 * 2. Consecutive sibling divs with similar structure (H3 + P pattern)
 *
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createColumnsBlock(document, main) {
  const processed = new Set();

  // PRIMARY: Detect AEM Grid Column classes like .aem-GridColumn--default--4
  // These indicate column layouts where the number represents columns out of 12
  // e.g., --default--4 = 4/12 = 1/3 width, so 3 of these = 3-column layout
  // NOTE: --default--12 means full width (12/12 = 100%), skip those
  const aemGridColumns = main.querySelectorAll('[class*="aem-GridColumn--default--"]');

  if (aemGridColumns.length > 0) {
    // Group consecutive siblings with similar grid column classes
    const columnGroups = [];
    let currentGroup = [];

    aemGridColumns.forEach((col) => {
      if (processed.has(col)) return;

      // Extract the column size from class (e.g., "4" from "aem-GridColumn--default--4")
      const classMatch = col.className.match(/aem-GridColumn--default--(\d+)/);
      if (!classMatch) return;

      const colSize = classMatch[1];

      // Skip full-width columns (12/12 = 100%)
      if (colSize === '12') return;

      // Check if this column is a sibling of the previous one in the group
      if (currentGroup.length === 0) {
        currentGroup.push({ element: col, size: colSize });
        processed.add(col);
      } else {
        const lastInGroup = currentGroup[currentGroup.length - 1].element;

        // Check if they share the same parent (are siblings)
        if (col.parentElement === lastInGroup.parentElement) {
          // Check if they have the same column size (similar layout)
          if (colSize === currentGroup[0].size) {
            currentGroup.push({ element: col, size: colSize });
            processed.add(col);
          } else {
            // Different size, start a new group
            if (currentGroup.length >= 2) {
              columnGroups.push([...currentGroup]);
            }
            currentGroup = [{ element: col, size: colSize }];
            processed.add(col);
          }
        } else {
          // Different parent, finalize current group and start new
          if (currentGroup.length >= 2) {
            columnGroups.push([...currentGroup]);
          }
          currentGroup = [{ element: col, size: colSize }];
          processed.add(col);
        }
      }
    });

    // Don't forget the last group
    if (currentGroup.length >= 2) {
      columnGroups.push([...currentGroup]);
    }

    // Convert each group to a Columns block
    columnGroups.forEach((group) => {
      // Only create columns for groups of 2-4 elements
      if (group.length >= 2 && group.length <= 4) {
        const cells = [['Columns']];
        const row = [];

        group.forEach((item) => {
          const colDiv = document.createElement('div');
          colDiv.innerHTML = item.element.innerHTML;
          row.push(colDiv);
        });

        cells.push(row);
        const table = WebImporter.DOMUtils.createTable(cells, document);

        // Insert before the first column element
        const firstElement = group[0].element;
        if (firstElement.parentElement) {
          firstElement.parentElement.insertBefore(table, firstElement);
          // Remove all the original column elements
          group.forEach((item) => item.element.remove());
        }
      }
    });
  }

  // SECONDARY: Find column layouts with explicit column classes (Bootstrap-style)
  const columnContainers = main.querySelectorAll('[class*="columns"], [class*="col-"], .row, [class*="grid"]');

  columnContainers.forEach((container) => {
    if (processed.has(container)) return;

    const columns = container.children;

    if (columns.length >= 2 && columns.length <= 4) {
      const hasContent = Array.from(columns).every(
        (col) => col.textContent.trim().length > 0 || col.querySelector('img'),
      );

      if (hasContent) {
        const cells = [['Columns']];
        const row = [];

        Array.from(columns).forEach((col) => {
          const colDiv = document.createElement('div');
          colDiv.innerHTML = col.innerHTML;
          row.push(colDiv);
          processed.add(col);
        });

        cells.push(row);
        const table = WebImporter.DOMUtils.createTable(cells, document);
        container.replaceWith(table);
        processed.add(container);
      }
    }
  });
}

/**
 * Create Embed block for iframes and embedded content
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createEmbedBlock(document, main) {
  const iframes = main.querySelectorAll('iframe:not([src*="recaptcha"])');

  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src') || iframe.getAttribute('data-src');
    if (src) {
      const cells = [['Embed']];
      const linkDiv = document.createElement('div');
      const link = document.createElement('a');
      link.href = src;
      link.textContent = src;
      linkDiv.appendChild(link);
      cells.push([linkDiv]);

      const table = WebImporter.DOMUtils.createTable(cells, document);
      iframe.replaceWith(table);
    }
  });
}

/**
 * Create CTA/Banner block for call-to-action sections
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createBannerBlock(document, main) {
  // Find CTA sections (sections with a heading, description, and prominent link/button)
  const sections = main.querySelectorAll('section, [class*="section"], [class*="cta"]');

  sections.forEach((section) => {
    const heading = section.querySelector('h2');
    const description = section.querySelector('p');
    const ctaLink = section.querySelector('a.button, a[class*="cta"], a[class*="btn"]');

    // Check if this looks like a CTA section
    if (heading && description && ctaLink) {
      const children = section.children;
      // Simple CTA sections typically have few direct children
      if (children.length <= 5) {
        const cells = [['Banner']];

        const content = document.createElement('div');
        content.appendChild(heading.cloneNode(true));
        content.appendChild(description.cloneNode(true));
        content.appendChild(ctaLink.cloneNode(true));

        cells.push([content]);
        const table = WebImporter.DOMUtils.createTable(cells, document);
        section.replaceWith(table);
      }
    }
  });
}

/**
 * Add Section Metadata blocks for styled sections
 * Detects sections with specific background classes and adds section-metadata
 *
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function addSectionMetadata(document, main) {
  const processed = new Set();

  // Find sections with light blue background (shaded)
  const shadedSections = main.querySelectorAll('.default-blue-background');

  shadedSections.forEach((section) => {
    if (processed.has(section)) return;
    processed.add(section);

    // Create section-metadata block
    const cells = [['Section Metadata']];
    cells.push(['Style', 'shaded']);

    const table = WebImporter.DOMUtils.createTable(cells, document);

    // Append section-metadata at the end of the section
    section.appendChild(table);

    // Add section break AFTER the section (after section-metadata)
    const hr = document.createElement('hr');
    if (section.nextElementSibling) {
      section.parentElement.insertBefore(hr, section.nextElementSibling);
    } else {
      section.parentElement.appendChild(hr);
    }
  });

  // Find export-trends sections (dark blue background with card-tabs)
  // Only process the outermost matching element, not nested ones
  const exportTrendsSections = main.querySelectorAll('.export-trends, .exporttrends');

  exportTrendsSections.forEach((section) => {
    if (processed.has(section)) return;

    // Check if this section is inside an already processed section
    // by checking if any ancestor has the same classes
    const hasProcessedAncestor = section.closest('.export-trends, .exporttrends') !== section
      && section.closest('.export-trends, .exporttrends');
    if (hasProcessedAncestor && processed.has(hasProcessedAncestor)) return;

    processed.add(section);

    // Also mark all nested matching elements as processed to prevent duplicates
    section.querySelectorAll('.export-trends, .exporttrends').forEach((nested) => {
      processed.add(nested);
    });

    const cells = [['Section Metadata']];
    cells.push(['Style', 'dark, blue']);

    const table = WebImporter.DOMUtils.createTable(cells, document);
    section.appendChild(table);

    // Add section break AFTER the section (after section-metadata)
    const hr = document.createElement('hr');
    if (section.nextElementSibling) {
      section.parentElement.insertBefore(hr, section.nextElementSibling);
    } else {
      section.parentElement.appendChild(hr);
    }
  });

  // Also check for other dark background styles
  const darkSections = main.querySelectorAll('.dark-background, [class*="dark-bg"]');

  darkSections.forEach((section) => {
    if (processed.has(section)) return;
    processed.add(section);

    const cells = [['Section Metadata']];
    cells.push(['Style', 'dark']);

    const table = WebImporter.DOMUtils.createTable(cells, document);
    section.appendChild(table);

    // Add section break AFTER the section (after section-metadata)
    const hr = document.createElement('hr');
    if (section.nextElementSibling) {
      section.parentElement.insertBefore(hr, section.nextElementSibling);
    } else {
      section.parentElement.appendChild(hr);
    }
  });
}

/**
 * Handle images - convert background images and fix paths
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function handleImages(document, main) {
  const BASE_URL = 'https://www.edc.ca';

  // Helper to convert relative paths to absolute
  const makeAbsolute = (src) => {
    if (!src) return src;
    // Already absolute
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    // Relative path - prefix with base URL
    if (src.startsWith('/')) {
      return `${BASE_URL}${src}`;
    }
    // Relative without leading slash
    return `${BASE_URL}/${src}`;
  };

  // Convert background images to img elements
  const elementsWithBg = main.querySelectorAll('[style*="background-image"]');
  elementsWithBg.forEach((el) => {
    WebImporter.DOMUtils.replaceBackgroundByImg(el, document);
  });

  // Fix lazy-loaded images
  const lazyImages = main.querySelectorAll('img[data-src], img[data-lazy-src]');
  lazyImages.forEach((img) => {
    const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
    if (src) {
      img.src = makeAbsolute(src);
    }
  });

  // Handle srcset - use highest resolution
  const srcsetImages = main.querySelectorAll('img[srcset]');
  srcsetImages.forEach((img) => {
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      // Parse srcset and get the largest image
      const sources = srcset.split(',').map((s) => s.trim());
      if (sources.length > 0) {
        const lastSource = sources[sources.length - 1];
        const srcMatch = lastSource.match(/^(\S+)/);
        if (srcMatch) {
          img.src = makeAbsolute(srcMatch[1]);
        }
      }
    }
  });

  // Convert ALL image src attributes to absolute paths
  const allImages = main.querySelectorAll('img');
  allImages.forEach((img) => {
    const src = img.getAttribute('src');
    if (src) {
      img.src = makeAbsolute(src);
    }
  });
}

/**
 * Create section breaks (---) for content separation
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 */
function createSectionBreaks(document, main) {
  // Add section breaks between major sections
  // Look for various section indicators used in AEM sites
  // NOTE: Background sections (.default-blue-background, .dark-background) are handled
  // in addSectionMetadata to ensure breaks come AFTER section-metadata blocks

  // 1. Standard section elements (but not background sections which are handled separately)
  const sections = main.querySelectorAll('section, [class*="section"]');
  sections.forEach((section, index) => {
    // Skip if this is a background section (handled by addSectionMetadata)
    if (section.classList.contains('default-blue-background')
        || section.classList.contains('dark-background')) {
      return;
    }
    if (index > 0) {
      const prev = section.previousElementSibling;
      if (prev && prev.tagName !== 'HR') {
        const hr = document.createElement('hr');
        section.parentElement.insertBefore(hr, section);
      }
    }
  });

  // 2. Look for elements with distinct background classes that indicate new sections
  // Add break BEFORE these sections (the break AFTER is handled in addSectionMetadata)
  const backgroundSections = main.querySelectorAll('.default-blue-background, .dark-background, .export-trends, .exporttrends');
  const processedForBreaks = new Set();

  backgroundSections.forEach((section) => {
    // Skip if already processed or nested inside a processed section
    if (processedForBreaks.has(section)) return;

    // Check for nested - only process outermost
    const ancestor = section.parentElement?.closest('.default-blue-background, .dark-background, .export-trends, .exporttrends');
    if (ancestor) return;

    processedForBreaks.add(section);

    // Add section break before if not already present
    const prev = section.previousElementSibling;
    if (prev && prev.tagName !== 'HR') {
      const hr = document.createElement('hr');
      section.parentElement.insertBefore(hr, section);
    }
  });
}

/**
 * Create metadata block from page metadata
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 * @returns {Object} metadata object for reporting
 */
function createMetadata(document, main) {
  const meta = {};

  // Title - prefer <title> tag, skip og:title
  const title = document.querySelector('title');
  if (title) {
    meta.Title = title.textContent.replace(/\s*\|.*$/, '').trim();
  }

  // Description - prefer meta description, skip og:description
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) {
    meta.Description = descMeta.content;
  }

  // OG Image - still useful for social sharing preview
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && ogImage.content) {
    const img = document.createElement('img');
    img.src = ogImage.content;
    meta.Image = img;
  }

  // Keywords/Tags - leave blank if null or 'null' string
  const keywords = document.querySelector('meta[name="keywords"]');
  if (keywords && keywords.content && keywords.content.toLowerCase() !== 'null') {
    meta.Tags = keywords.content;
  } else {
    meta.Tags = '';
  }

  // Author
  const author = document.querySelector('meta[name="author"]');
  if (author) {
    meta.Author = author.content;
  }

  // Publication date
  const pubDate = document.querySelector('meta[name="publication-date"], meta[property="article:published_time"]');
  if (pubDate) {
    meta['Publication Date'] = pubDate.content;
  }

  // Modified date - from page content
  const modifiedText = document.body.textContent.match(/Date modified:\s*(\d{4}-\d{2}-\d{2})/);
  if (modifiedText) {
    meta['Last Modified'] = modifiedText[1];
  }

  // Template detection based on URL patterns
  const url = document.location?.href || '';
  if (url.includes('/blog/') || url.includes('/article/')) {
    meta.Template = 'article';
  } else if (url.includes('/success-stories/')) {
    meta.Template = 'success-story';
  } else if (url.includes('/campaign/')) {
    meta.Template = 'campaign';
  }

  // Create and append metadata block
  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.appendChild(block);

  return meta;
}

/**
 * Clean up links - make them relative or fix broken references
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 * @param {string} originalUrl - The original page URL
 */
function cleanupLinks(document, main, originalUrl) {
  const links = main.querySelectorAll('a[href]');
  const baseUrl = new URL(originalUrl);

  links.forEach((link) => {
    try {
      const href = link.getAttribute('href');

      // Skip empty or anchor-only links
      if (!href || href.startsWith('#')) return;

      // Handle relative URLs
      if (href.startsWith('/')) {
        link.setAttribute('href', `${baseUrl.origin}${href}`);
      }

      // Convert internal EDC links to relative paths
      if (href.includes('edc.ca')) {
        const url = new URL(href, baseUrl);
        // Remove .html extension for cleaner URLs
        const cleanPath = url.pathname.replace(/\.html$/, '');
        link.setAttribute('href', cleanPath);
      }
    } catch (e) {
      // Keep original href if URL parsing fails
    }
  });
}

/**
 * Check if URL is a news page
 * @param {string} url - The page URL
 * @returns {boolean} true if news page
 */
function isNewsPage(url) {
  return url.includes('/news/');
}

/**
 * Transform news page - simplified single-column layout
 * Collects H1 and .article-body, rest is metadata
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 * @param {string} url - The page URL
 */
function transformNewsPage(document, main, url) {
  // Remove news-specific unwanted elements
  WebImporter.DOMUtils.remove(main, [
    '.recommended-articles-premium-wrapper',
  ]);

  // Create a new container for the simplified content
  const newsContent = document.createElement('div');

  // Get the H1 - search in main first, then fall back to full document
  const h1 = main.querySelector('h1') || document.querySelector('h1');
  if (h1) {
    newsContent.appendChild(h1.cloneNode(true));
  }

  // Get the article body - search in main first, then fall back to full document
  const articleBody = main.querySelector('.article-body') || document.querySelector('.article-body');
  if (articleBody) {
    // Clone the article body content
    const bodyClone = articleBody.cloneNode(true);
    // Append all children of article body
    while (bodyClone.firstChild) {
      newsContent.appendChild(bodyClone.firstChild);
    }
  }

  // Clear main and add the news content
  main.innerHTML = '';
  while (newsContent.firstChild) {
    main.appendChild(newsContent.firstChild);
  }

  // Create news-specific metadata
  createNewsMetadata(document, main);
}

/**
 * Create metadata block for news pages with template='news'
 * @param {Document} document - The document object
 * @param {Element} main - The main content element
 * @returns {Object} metadata object
 */
function createNewsMetadata(document, main) {
  const meta = {};

  // Title - prefer <title> tag
  const title = document.querySelector('title');
  if (title) {
    meta.Title = title.textContent.replace(/\s*\|.*$/, '').trim();
  }

  // Description
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) {
    meta.Description = descMeta.content;
  }

  // OG Image
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && ogImage.content) {
    const img = document.createElement('img');
    img.src = ogImage.content;
    meta.Image = img;
  }

  // Keywords/Tags - leave blank if null or 'null' string
  const keywords = document.querySelector('meta[name="keywords"]');
  if (keywords && keywords.content && keywords.content.toLowerCase() !== 'null') {
    meta.Tags = keywords.content;
  } else {
    meta.Tags = '';
  }

  // Author
  const author = document.querySelector('meta[name="author"]');
  if (author) {
    meta.Author = author.content;
  }

  // Dateline - location from which the article was published
  const dateline = document.querySelector('.headersection span.location');
  if (dateline && dateline.textContent.trim()) {
    meta.Dateline = dateline.textContent.trim();
  }

  // Release Date - from header section
  const releaseDate = document.querySelector('.headersection span.date');
  if (releaseDate && releaseDate.textContent.trim()) {
    meta['Release Date'] = releaseDate.textContent.trim();
  }

  // Publication date (fallback from meta tag)
  const pubDate = document.querySelector('meta[name="publication-date"], meta[property="article:published_time"]');
  if (pubDate) {
    meta['Publication Date'] = pubDate.content;
  }

  // Modified date - from page content
  const modifiedText = document.body.textContent.match(/Date modified:\s*(\d{4}-\d{2}-\d{2})/);
  if (modifiedText) {
    meta['Last Modified'] = modifiedText[1];
  }

  // Set template to news
  meta.Template = 'news';

  // Create and append metadata block
  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.appendChild(block);

  return meta;
}

/**
 * Sanitize document path for AEM
 * @param {string} url - The page URL
 * @returns {string} sanitized path
 */
function generateDocumentPath(url) {
  let path = new URL(url).pathname;

  // Remove .html extension
  path = path.replace(/\.html$/, '');

  // Remove trailing slash
  path = path.replace(/\/$/, '');

  // Sanitize the path
  return WebImporter.FileUtils.sanitizePath(path);
}

/**
 * Main transformation function
 * @param {Object} params - Import parameters
 * @returns {Array} Array of transformed documents
 */
export default {
  /**
   * Apply DOM transformations to convert the page to block structure
   */
  transformDOM: ({ document, url, html, params }) => {
    let main = document.querySelector('main');

    // If no main element, create one and populate with body content
    if (!main) {
      main = document.createElement('div');
      // Move all body children to our container, except header/footer
      const bodyChildren = [...document.body.children];
      bodyChildren.forEach((child) => {
        const tagName = child.tagName.toLowerCase();
        const role = child.getAttribute('role');
        // Skip header, footer, scripts, etc.
        if (tagName !== 'header'
          && tagName !== 'footer'
          && tagName !== 'script'
          && tagName !== 'style'
          && tagName !== 'noscript'
          && role !== 'contentinfo'
          && role !== 'navigation') {
          main.appendChild(child.cloneNode(true));
        }
      });
    } else if (main.children.length === 0) {
      // If main exists but is empty, gather content from siblings
      let sibling = main.nextElementSibling;
      while (sibling) {
        const next = sibling.nextElementSibling;
        const tagName = sibling.tagName.toLowerCase();
        const role = sibling.getAttribute('role');
        // Skip footer/contentinfo
        if (tagName !== 'footer' && role !== 'contentinfo') {
          main.appendChild(sibling);
        }
        sibling = next;
      }
    }

    // Clean up unwanted elements
    cleanup(document, main);

    // Remove "Date modified:" text element (already captured in metadata)
    const allElements = main.querySelectorAll('*');
    allElements.forEach((el) => {
      if (el.childNodes.length === 1
          && el.textContent.trim().startsWith('Date modified:')) {
        el.remove();
      }
    });

    // Handle images first
    handleImages(document, main);

    // Check if this is a news page - use simplified single-column transformation
    const originalUrl = params.originalURL || url;
    if (isNewsPage(originalUrl)) {
      // News pages: H1 + article-body only, no columns, template='news'
      transformNewsPage(document, main, originalUrl);
      cleanupLinks(document, main, originalUrl);
      return main;
    }

    // Standard page transformation below
    // Create blocks from content patterns
    createHeroBlock(document, main);
    createCardTabsBlock(document, main);
    createQuoteBlock(document, main);
    createAccordionBlock(document, main);
    createColumnsBlock(document, main);
    createEmbedBlock(document, main);
    createCardsBlock(document, main);
    createBannerBlock(document, main);

    // Add section metadata for styled sections
    addSectionMetadata(document, main);

    // Add section breaks
    createSectionBreaks(document, main);

    // Clean up links
    cleanupLinks(document, main, originalUrl);

    // Create metadata block (should be last)
    createMetadata(document, main);

    return main;
  },

  /**
   * Generate the document path for the imported content
   */
  generateDocumentPath: ({ document, url, html, params }) => {
    const originalUrl = params.originalURL || url;
    return generateDocumentPath(originalUrl);
  },
};

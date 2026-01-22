import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

export default function decorate(block) {
  // Build tablist
  const tablist = document.createElement('div');
  tablist.className = 'card-tabs-list';
  tablist.setAttribute('role', 'tablist');

  // Container for all tab panels
  const panelsContainer = document.createElement('div');
  panelsContainer.className = 'card-tabs-panels';

  let currentPanel = null;
  let currentCards = null;
  let isFirstTab = true;

  [...block.children].forEach((row) => {
    const columns = [...row.children];
    // Filter out empty columns (no text content and no meaningful elements)
    const nonEmptyColumns = columns.filter((col) => {
      const hasText = col.textContent.trim().length > 0;
      const hasImage = col.querySelector('picture, img');
      return hasText || hasImage;
    });

    if (nonEmptyColumns.length === 1) {
      // Single column = tab definition
      const tabContent = nonEmptyColumns[0];

      // Check for em + link pattern (footer link for previous tab)
      const em = tabContent.querySelector('em');
      const link = tabContent.querySelector('a');

      if (em && link) {
        // This is the footer link for the current tab panel
        if (currentPanel) {
          const footerLink = document.createElement('a');
          footerLink.className = 'card-tabs-footer-link';
          footerLink.href = link.href;
          footerLink.textContent = link.textContent;
          currentPanel.append(footerLink);
        }
      } else {
        // This is a new tab name
        // Finalize previous panel if exists
        if (currentPanel && currentCards) {
          currentPanel.prepend(currentCards);
          panelsContainer.append(currentPanel);
        }

        // Get tab name (text content without any nested elements that might be links)
        const tabName = tabContent.textContent.trim();
        const tabId = toClassName(tabName);

        // Create tab button
        const button = document.createElement('button');
        button.className = 'card-tabs-tab';
        button.id = `card-tabs-tab-${tabId}`;
        button.textContent = tabName;
        button.setAttribute('aria-controls', `card-tabs-panel-${tabId}`);
        button.setAttribute('aria-selected', isFirstTab);
        button.setAttribute('role', 'tab');
        button.setAttribute('type', 'button');

        // Use tabId in closure to avoid stale reference
        button.addEventListener('click', () => {
          // Deselect all tabs and hide all panels
          block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
            panel.setAttribute('aria-hidden', true);
          });
          tablist.querySelectorAll('button').forEach((btn) => {
            btn.setAttribute('aria-selected', false);
          });

          // Select this tab and show its panel
          const panelId = button.getAttribute('aria-controls');
          const targetPanel = block.querySelector(`#${panelId}`);
          if (targetPanel) {
            targetPanel.setAttribute('aria-hidden', false);
          }
          button.setAttribute('aria-selected', true);
        });

        tablist.append(button);

        // Create new panel
        currentPanel = document.createElement('div');
        currentPanel.className = 'card-tabs-panel';
        currentPanel.id = `card-tabs-panel-${tabId}`;
        currentPanel.setAttribute('aria-hidden', !isFirstTab);
        currentPanel.setAttribute('aria-labelledby', `card-tabs-tab-${tabId}`);
        currentPanel.setAttribute('role', 'tabpanel');

        // Create cards container for this panel
        currentCards = document.createElement('ul');
        currentCards.className = 'card-tabs-cards';

        isFirstTab = false;
      }
    } else if (nonEmptyColumns.length === 2 && currentCards) {
      // Two columns = card (image + content)
      const li = document.createElement('li');
      li.className = 'card-tabs-card';

      let cardBody = null;
      nonEmptyColumns.forEach((col) => {
        if (col.querySelector('picture')) {
          col.className = 'card-tabs-card-image';
        } else {
          col.className = 'card-tabs-card-body';
          cardBody = col;
        }
        li.append(col);
      });

      // Add arrow indicator inside the card body
      const arrow = document.createElement('span');
      arrow.className = 'card-tabs-card-arrow';
      arrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>';
      if (cardBody) {
        cardBody.append(arrow);
      } else {
        li.append(arrow);
      }

      // Make the whole card clickable if there's a link
      const link = li.querySelector('a');
      if (link) {
        li.style.cursor = 'pointer';
        li.addEventListener('click', (e) => {
          if (e.target.tagName !== 'A') {
            link.click();
          }
        });
      }

      currentCards.append(li);
    }
  });

  // Finalize last panel
  if (currentPanel && currentCards) {
    currentPanel.prepend(currentCards);
    panelsContainer.append(currentPanel);
  }

  // Optimize images
  panelsContainer.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]),
    );
  });

  // Clear and rebuild block
  block.textContent = '';
  block.append(tablist);
  block.append(panelsContainer);
}

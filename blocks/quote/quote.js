export default async function decorate(block) {
  const [quotation, attribution, photo] = [...block.children].map((c) => c.firstElementChild);
  const blockquote = document.createElement('blockquote');

  // determine language from path
  const isFrench = window.location.pathname.includes('/fr/');
  const quoteIconPath = isFrench ? '/icons/open-quote-fr.svg' : '/icons/open-quote-en.svg';

  // create text container (left side)
  const textContainer = document.createElement('div');
  textContainer.className = 'quote-text';

  // add decorative quote icon
  const quoteIcon = document.createElement('img');
  quoteIcon.src = quoteIconPath;
  quoteIcon.alt = '';
  quoteIcon.setAttribute('aria-hidden', 'true');
  quoteIcon.className = 'quote-icon';
  textContainer.append(quoteIcon);

  // decorate quotation
  quotation.className = 'quote-quotation';
  textContainer.append(quotation);

  // decorate attribution
  if (attribution) {
    attribution.className = 'quote-attribution';
    textContainer.append(attribution);
    const ems = attribution.querySelectorAll('em');
    ems.forEach((em) => {
      const cite = document.createElement('cite');
      cite.innerHTML = em.innerHTML;
      em.replaceWith(cite);
    });
  }

  blockquote.append(textContainer);

  // decorate photo (right side)
  if (photo) {
    photo.className = 'quote-photo';
    blockquote.append(photo);
  }

  block.innerHTML = '';
  block.append(blockquote);
}

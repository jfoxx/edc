export default function decorate(block) {
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

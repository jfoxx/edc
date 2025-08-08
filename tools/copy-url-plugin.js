window.hlx.initEditorPlugin({
  id: 'copy-published-url',
  label: 'Copy Published URL',
  icon: 'copy',
  async click({ content, config, document }) {
    const { pathname } = document.location;
    const { owner, repo, ref } = config;

    const publishedUrl = `https://${ref}--${repo}--${owner}.aem.page${pathname}`;

    try {
      await navigator.clipboard.writeText(publishedUrl);
      console.log(`Copied: ${publishedUrl}`);
      alert(`Copied to clipboard:\n${publishedUrl}`);
    } catch (e) {
      console.error('Copy failed:', e);
      alert('Failed to copy URL to clipboard.');
    }
  },
});

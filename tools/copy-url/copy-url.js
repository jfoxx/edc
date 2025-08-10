export default function init({ config, editor, content, display }) {
  display.button({
    id: 'copy-url',
    condition: () => true,
    text: 'Copy Published URL',
    icon: 'copy',
    async action() {
      const { pathname } = window.location;
      const { owner, repo, ref } = config;
      const pubUrl = `https://${ref}--${repo}--${owner}.aem.page${pathname}`;

      try {
        await navigator.clipboard.writeText(pubUrl);
        alert(`Copied to clipboard:\n${pubUrl}`);
      } catch (err) {
        console.error('Failed to copy URL', err);
        alert('Failed to copy URL');
      }
    },
  });
}

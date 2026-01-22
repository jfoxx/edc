export default function decorate(block) {
  // Simple banner - just ensure the content is properly structured
  const content = block.querySelector('div > div');
  if (content) {
    content.className = 'banner-content';
  }
}

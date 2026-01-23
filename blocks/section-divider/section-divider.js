// Section divider - marker block used to split content in layouts
// This block is typically removed after layout processing
export default function decorate(block) {
  block.textContent = '';
}

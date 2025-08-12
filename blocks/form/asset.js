export function openAsset(asset) {
    if (!asset) return;
    const link = document.createElement('a');
    link.href = asset;
    link.download = asset.filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


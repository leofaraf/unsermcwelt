// For a custom domain or a Release in another repository, paste its asset URL here.
const releaseAssetUrl = '';
const asset = 'minecraft-server-1.21.8-2026-11-06.zip';
const owner = location.hostname.endsWith('.github.io') ? location.hostname.slice(0,-10) : '';
const repository = location.pathname.split('/').filter(Boolean)[0] || `${owner}.github.io`;
export const serverDownloadUrl = releaseAssetUrl || (owner ? `https://github.com/${owner}/${repository}/releases/latest/download/${asset}` : '');

/**
 * Set the favicon of the page
 * @param {string} url - Base URL of the favicon (without theme parameter)
 * @returns {boolean} - Whether the favicon was set successfully
 */
export function setFavicon(url) {
  if (!url) return false;

  try {
    // Remove any existing favicon links
    document.querySelectorAll('link[rel="icon"]').forEach(link => link.remove());

    // Create light and dark mode favicons
    const lightFavicon = document.createElement('link');
    lightFavicon.rel = 'icon';
    lightFavicon.href = `${url}?theme=light`;
    lightFavicon.media = '(prefers-color-scheme: light)';
    document.head.appendChild(lightFavicon);

    const darkFavicon = document.createElement('link');
    darkFavicon.rel = 'icon';
    darkFavicon.href = `${url}?theme=dark`;
    darkFavicon.media = '(prefers-color-scheme: dark)';
    document.head.appendChild(darkFavicon);

    // Update apple-touch-icon links
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(link => {
      const size = link.sizes?.value;
      const theme = link.media?.includes('dark') ? 'dark' : 'light';
      link.href = `${url}${size ? `/${size}` : ''}?theme=${theme}`;
    });

    return true;
  } catch (error) {
    console.error('Error setting favicon:', error);
    return false;
  }
}

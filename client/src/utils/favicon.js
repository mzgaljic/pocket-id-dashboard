/**
 * Set the favicon of the page
 * @param {string} url - URL of the favicon
 * @returns {boolean} - Whether the favicon was set successfully
 */
export function setFavicon(url) {
  if (!url) return false;

  try {
    // Look for existing favicon
    let link = document.querySelector('link[rel="icon"]');

    // If no favicon exists, create one
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // Set the href attribute to update the favicon
    link.href = url;

    // Also update apple-touch-icon for iOS devices
    let appleLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = url;

    return true;
  } catch (error) {
    console.error('Error setting favicon:', error);
    return false;
  }
}

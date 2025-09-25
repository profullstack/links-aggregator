/**
 * Get the Tor onion URL if available
 * @returns {string|null} The onion URL or null if not available
 */
export function getOnionUrl() {
	if (typeof window !== 'undefined') {
		return window.PUBLIC_ONION_URL || null;
	}
	return null;
}

/**
 * Check if the app is running as a Tor hidden service
 * @returns {boolean} True if onion URL is available
 */
export function isTorEnabled() {
	if (typeof window !== 'undefined') {
		return Boolean(window.PUBLIC_ONION_URL);
	}
	return false;
}

/**
 * Get the display URL for sharing (onion URL if available, otherwise current URL)
 * @returns {string} The URL to display to users
 */
export function getShareableUrl() {
	if (typeof window !== 'undefined') {
		return window.PUBLIC_ONION_URL || window.location.origin;
	}
	return 'http://localhost:8080';
}
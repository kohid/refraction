// Escape HTML special chars to prevent XSS.
export const escapeHTML = ( str ) => {
	const specialChars = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		"'": '&#39;',
		'"': '&quot;',
	};

	return str.replace( /[&<>'"]/g, ( tag ) => specialChars[ tag ] || tag );
};

// Check if Scroll-Snap is active.
export const isScrollSnapActive = () => {
	const scrollSnapStatus = refractionFrontend.isEditMode() ? refraction.settings.page.model.attributes?.scroll_snap : refractionFrontend.config.settings.page?.scroll_snap;

	return 'yes' === scrollSnapStatus ? true : false;
};

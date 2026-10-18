import { isScrollSnapActive } from './utils';

module.exports = refractionModules.ViewModule.extend( {
	getDefaultSettings() {
		return {
			scrollDuration: 500,
			selectors: {
				links: 'a[href*="#"]',
				targets: '.refraction-element, .refraction-menu-anchor',
				scrollable: isScrollSnapActive() ? 'body' : 'html, body',
			},
		};
	},

	getDefaultElements() {
		var $ = jQuery,
			selectors = this.getSettings( 'selectors' );

		return {
			$scrollable: $( selectors.scrollable ),
		};
	},

	bindEvents() {
		refractionFrontend.elements.$document.on( 'click', this.getSettings( 'selectors.links' ), this.handleAnchorLinks );
	},

	handleAnchorLinks( event ) {
		var clickedLink = event.currentTarget,
			isSamePathname = ( location.pathname === clickedLink.pathname ),
			isSameHostname = ( location.hostname === clickedLink.hostname ),
			$anchor;

		if ( ! isSameHostname || ! isSamePathname || clickedLink.hash.length < 2 ) {
			return;
		}

		try {
			$anchor = jQuery( clickedLink.hash ).filter( this.getSettings( 'selectors.targets' ) );
		} catch ( e ) {
			return;
		}

		if ( ! $anchor.length ) {
			return;
		}

		var scrollTop = $anchor.offset().top,
			$wpAdminBar = refractionFrontend.elements.$wpAdminBar,
			$activeStickies = jQuery( '.refraction-section.refraction-sticky--active:visible' ),
			maxStickyHeight = 0;

		if ( $wpAdminBar.length > 0 ) {
			scrollTop -= $wpAdminBar.height();
		}

		// Offset height of tallest sticky
		if ( $activeStickies.length > 0 ) {
			maxStickyHeight = Math.max.apply( null, $activeStickies.map( function() {
				return jQuery( this ).outerHeight();
			} ).get() );

			scrollTop -= maxStickyHeight;
		}

		event.preventDefault();

		scrollTop = refractionFrontend.hooks.applyFilters( 'frontend/handlers/menu_anchor/scroll_top_distance', scrollTop );

		// On scroll animation start: remove scroll-snap.
		if ( isScrollSnapActive() ) {
			refractionFrontend.elements.$body.css( 'scroll-snap-type', 'none' );
		}

		this.elements.$scrollable.animate( {
			scrollTop,
		}, this.getSettings( 'scrollDuration' ), 'linear', () => {
			// On scroll animation complete: add scroll-snap back.
			if ( isScrollSnapActive() ) {
				refractionFrontend.elements.$body.css( 'scroll-snap-type', '' );
			}
		} );
	},

	onInit() {
		refractionModules.ViewModule.prototype.onInit.apply( this, arguments );
	},
} );

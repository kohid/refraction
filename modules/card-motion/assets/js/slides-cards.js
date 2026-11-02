/**
 * Slides widget, "Timed cards" layout: finds the parts of each .rf-tco[data-rf-tco] (markup from
 * Slides::render_cards(), config in data-rf-tco) and runs the shared engine (timed-cards.js) on them.
 */
import { timedCards } from './timed-cards';

( function() {
	function setup( root ) {
		if ( root.rfTco ) {
			root.rfTco.destroy();
			root.rfTco = null;
		}

		let cfg = {};

		try {
			cfg = JSON.parse( root.getAttribute( 'data-rf-tco' ) || '{}' );
		} catch ( e ) {}

		const texts = Array.from( root.querySelectorAll( '.rf-tco__text' ) );

		root.rfTco = timedCards( root, cfg, {
			slides: Array.from( root.querySelectorAll( '.rf-tco__slide' ) ),
			texts,
			cards: Array.from( root.querySelectorAll( '.rf-tco__card' ) ),
			sounds: texts.map( ( t ) => t.querySelector( '.refraction-slide__sound' ) ),
			timer: root.querySelector( '.rf-tco__timer i' ),
			line: root.querySelector( '.rf-tco__line i' ),
			count: root.querySelector( '.rf-tco__count' ),
			next: root.querySelector( '.rf-tco__next' ),
			prev: root.querySelector( '.rf-tco__prev' ),
		} );
	}

	function scan( scope ) {
		Array.prototype.forEach.call( ( scope || document ).querySelectorAll( '.rf-tco[data-rf-tco]' ), setup );
	}

	function hookIntoEditor( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks && fe.isEditMode && fe.isEditMode() ) {
			fe.hooks.addAction( 'frontend/element_ready/refraction-slides.default', ( $scope ) => $scope && $scope[ 0 ] && scan( $scope[ 0 ] ) );
			return;
		}

		if ( tries < 300 ) {
			window.setTimeout( () => hookIntoEditor( tries + 1 ), 100 );
		}
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => scan() );
	} else {
		scan();
	}

	hookIntoEditor( 0 );
}() );

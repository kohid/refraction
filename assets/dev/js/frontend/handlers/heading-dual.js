/**
 * Dual Heading: draws the mark behind the highlighted part (refraction-dual-draw-yes on the widget) once the heading
 * is well in view, by adding is-drawn to the part; the drawing itself is a CSS transition
 * (frontend/partials/_heading-dual.scss). Runs for every element through the global handler, on the page and in the
 * editor's preview, where a new render (a changed setting) draws it again. With refraction-dual-redraw-yes it is drawn
 * every time it comes into view: reset once it has left the screen completely, so it never undraws in sight.
 */
const observers = new WeakMap();

export default function headingDual( $scope ) {
	const element = $scope?.[ 0 ];

	if ( ! element ) {
		return;
	}

	observers.get( element )?.disconnect();
	observers.delete( element );

	const parts = element.querySelectorAll( ':scope .refraction-heading-dual' );

	if ( ! parts.length || ! element.classList.contains( 'refraction-dual-draw-yes' ) ) {
		parts.forEach( ( part ) => part.classList.add( 'is-drawn' ) );
		return;
	}

	if ( ! ( 'IntersectionObserver' in window ) ) {
		parts.forEach( ( part ) => part.classList.add( 'is-drawn' ) );
		return;
	}

	const repeat = element.classList.contains( 'refraction-dual-redraw-yes' );

	const observer = new IntersectionObserver( ( entries ) => {
		entries.forEach( ( entry ) => {
			if ( entry.isIntersecting && entry.intersectionRatio >= 0.6 ) {
				// Two frames, so the undrawn state is painted first and the transition runs.
				requestAnimationFrame( () => requestAnimationFrame( () => entry.target.classList.add( 'is-drawn' ) ) );

				if ( ! repeat ) {
					observer.unobserve( entry.target );
				}
			} else if ( repeat && ! entry.isIntersecting ) {
				entry.target.classList.remove( 'is-drawn' );
			}
		} );
	}, { threshold: [ 0, 0.6 ], rootMargin: '0px 0px -8% 0px' } );

	parts.forEach( ( part ) => {
		part.classList.remove( 'is-drawn' );
		observer.observe( part );
	} );

	observers.set( element, observer );
}

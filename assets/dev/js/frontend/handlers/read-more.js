/**
 * The Show more / Show less toggle under text cut to a number of lines (Text_Display_Trait). It opens and closes the
 * text (is-text-expanded on the widget) and hides itself while the text is short enough not to be cut (is-text-short).
 * Runs for every element through the global handler, on the page and in the editor's preview.
 */
const observers = new WeakMap();

export default function readMore( $scope ) {
	const element = $scope?.[ 0 ];

	if ( ! element ) {
		return;
	}

	if ( ! element.classList.contains( 'refraction-box-desc-clamp' ) ) {
		element.classList.remove( 'is-text-expanded', 'is-text-short' );
		return;
	}

	const button = element.querySelector( '.refraction-read-more' );
	const text = element.querySelector( '.refraction-box-description' );

	observers.get( element )?.disconnect();

	// Open or closed is kept on the widget element, which outlives a new render of its content (the editor renders a
	// widget again when it is selected or changed). On the page it starts closed.
	const open = '1' === element.dataset.rfTextOpen && !! button;

	element.classList.toggle( 'is-text-expanded', open );
	element.classList.remove( 'is-text-short' );

	if ( ! button || ! text ) {
		return;
	}

	button.setAttribute( 'aria-expanded', open ? 'true' : 'false' );

	if ( ! text.id ) {
		text.id = 'rf-text-' + ( element.dataset.id || Math.random().toString( 36 ).slice( 2 ) );
	}

	button.setAttribute( 'aria-controls', text.id );

	const measure = () => {
		if ( element.classList.contains( 'is-text-expanded' ) ) {
			return;
		}

		element.classList.toggle( 'is-text-short', text.scrollHeight <= text.clientHeight + 1 );
	};

	if ( ! button.dataset.rfReadMore ) {
		button.dataset.rfReadMore = '1';
		button.addEventListener( 'click', () => {
			const opening = ! element.classList.contains( 'is-text-expanded' );

			element.classList.toggle( 'is-text-expanded', opening );
			element.dataset.rfTextOpen = opening ? '1' : '';
			button.setAttribute( 'aria-expanded', opening ? 'true' : 'false' );

			if ( ! opening ) {
				measure();
			}
		} );
	}

	measure();

	if ( 'ResizeObserver' in window ) {
		const observer = new ResizeObserver( measure );

		observer.observe( text );
		observers.set( element, observer );
	}
}

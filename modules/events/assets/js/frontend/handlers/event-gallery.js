import Base from 'refraction-frontend/handlers/base';

/**
 * Event Gallery, "Main picture with thumbnails": a thumbnail shows its picture as the main one (which then opens that
 * picture in the lightbox). Arrow keys move between the thumbnails.
 */
export default class EventGallery extends Base {
	getDefaultSettings() {
		return { selectors: { showcase: '.rfe-showcase' } };
	}

	getDefaultElements() {
		return { $showcase: this.findElement( this.getSettings( 'selectors' ).showcase ) };
	}

	onInit( ...args ) {
		super.onInit( ...args );

		const box = this.elements.$showcase[ 0 ];

		if ( ! box || box.rfeReady ) {
			return;
		}

		box.rfeReady = true;
		const main = box.querySelector( '.rfe-showcase__main' );
		const img = main && main.querySelector( 'img' );
		const thumbs = Array.from( box.querySelectorAll( '.rfe-showcase__thumb' ) );

		const show = ( thumb ) => {
			if ( ! img ) {
				return;
			}

			img.src = thumb.dataset.src;

			if ( thumb.dataset.srcset ) {
				img.srcset = thumb.dataset.srcset;
			} else {
				img.removeAttribute( 'srcset' );
			}

			main.href = thumb.dataset.href;
			// The lightbox reads the picture from the link, not from the first picture's saved data.
			main.removeAttribute( 'data-e-action-hash' );
			thumbs.forEach( ( t ) => {
				t.classList.toggle( 'is-active', t === thumb );
				t.setAttribute( 'aria-pressed', t === thumb ? 'true' : 'false' );
			} );
		};

		thumbs.forEach( ( thumb, i ) => {
			thumb.addEventListener( 'click', () => show( thumb ) );
			thumb.addEventListener( 'keydown', ( e ) => {
				const step = { ArrowRight: 1, ArrowLeft: -1 }[ e.key ];

				if ( step ) {
					e.preventDefault();
					const next = thumbs[ ( i + step + thumbs.length ) % thumbs.length ];
					next.focus();
					show( next );
				}
			} );
		} );
	}
}

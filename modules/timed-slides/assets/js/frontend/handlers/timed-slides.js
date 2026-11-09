import Base from 'refraction-frontend/handlers/base';
import { timedCards } from 'refraction/modules/card-motion/assets/js/timed-cards';

/**
 * Timed Slides: runs the Timed cards engine on the widget's parts. Each slide's content is a container (marked
 * .rf-tco__text); only the current one shows. In the editor the slider follows the slide picked in the panel, does
 * not move by itself, and is rebuilt when slides come and go.
 */
export default class TimedSlides extends Base {
	getDefaultSettings() {
		return {
			selectors: {
				root: '.rf-tco',
				texts: '.rf-ts__content',
			},
		};
	}

	getDefaultElements() {
		const s = this.getSettings( 'selectors' );

		return {
			$root: this.findElement( s.root ),
			$texts: this.findElement( s.texts ),
		};
	}

	/**
	 * Direct parts of this widget only (never those of a slider nested inside a slide).
	 * @param {string} selector
	 */
	own( selector ) {
		const root = this.elements.$root[ 0 ];

		return root ? Array.from( root.querySelectorAll( selector ) ).filter( ( el ) => el.closest( '.rf-tco' ) === root ) : [];
	}

	contents() {
		const box = this.elements.$texts[ 0 ];

		return box ? Array.from( box.children ).filter( ( el ) => el.classList.contains( 'e-con' ) || el.classList.contains( 'rf-tco__text' ) ) : [];
	}

	build() {
		this.destroyEngine();

		const root = this.elements.$root[ 0 ];

		if ( ! root ) {
			return;
		}

		const settings = this.getElementSettings();
		const texts = this.contents();
		const slides = this.own( '.rf-tco__slide' );
		const sounds = slides.map( ( _, i ) => this.own( `.refraction-slide__sound[data-rf-sound="${ i }"]` )[ 0 ] || null );

		texts.forEach( ( el ) => el.classList.add( 'rf-tco__text' ) );

		this.engine = timedCards( root, {
			autoplay: 'yes' === settings.autoplay && ! this.isEdit,
			interval: Math.max( 1500, Number( settings.autoplay_speed ) || 5000 ),
			speed: Math.max( 300, Math.min( 3000, Number( settings.transition_speed ) || 900 ) ),
			effect: settings.transition || 'grow',
		}, {
			slides,
			texts,
			cards: this.own( '.rf-tco__card' ),
			sounds,
			timer: this.own( '.rf-tco__timer i' )[ 0 ],
			line: this.own( '.rf-tco__line i' )[ 0 ],
			count: this.own( '.rf-tco__count' )[ 0 ],
			next: this.own( '.rf-tco__next' )[ 0 ],
			prev: this.own( '.rf-tco__prev' )[ 0 ],
		} );

		if ( this.engine && this.isEdit ) {
			const picked = ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1;

			if ( picked > 0 ) {
				this.engine.go( picked, true );
			}
		}
	}

	destroyEngine() {
		if ( this.engine ) {
			this.engine.destroy();
			this.engine = null;
		}
	}

	onInit( ...args ) {
		super.onInit( ...args );
		this.build();

		// The editor adds, removes and moves slide containers without rendering the widget again.
		if ( this.isEdit && window.MutationObserver && this.elements.$texts[ 0 ] ) {
			this.mutations = new MutationObserver( () => {
				window.clearTimeout( this.rebuildTimer );
				this.rebuildTimer = window.setTimeout( () => this.build(), 60 );
			} );
			this.mutations.observe( this.elements.$texts[ 0 ], { childList: true } );
		}
	}

	onDestroy() {
		window.clearTimeout( this.rebuildTimer );

		if ( this.mutations ) {
			this.mutations.disconnect();
		}

		this.destroyEngine();
		super.onDestroy();
	}

	onElementChange( propertyName ) {
		if ( [ 'autoplay_speed', 'transition_speed', 'transition' ].includes( propertyName ) ) {
			this.build();
		}
	}

	onEditSettingsChange( propertyName ) {
		if ( 'activeItemIndex' === propertyName && this.engine ) {
			this.engine.go( ( this.getEditSettings( 'activeItemIndex' ) || 1 ) - 1, true );
		}
	}
}

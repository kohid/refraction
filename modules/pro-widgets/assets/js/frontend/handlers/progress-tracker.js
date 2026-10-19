/**
 * Progress Tracker: reading progress for the page, the post content, or any selector.
 * Progress is 0 when the tracked element's top reaches the top of the screen and 100 when its end reaches
 * the bottom of the screen. An unknown or invalid selector falls back to the whole page.
 */
const CONTENT_SELECTORS = [ '.refraction-widget-theme-post-content', '.entry-content', '.post-content', 'article', 'main' ];

export default class ProgressTracker extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return { selectors: { tracker: '.refraction-progress-tracker', percent: '.refraction-progress-tracker__percent' } };
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$tracker: this.$element.find( selectors.tracker ),
			$percent: this.$element.find( selectors.percent ),
		};
	}

	onInit() {
		super.onInit();

		this.frame = null;
		this.value = -1;
		this.win = this.elements.$tracker[ 0 ]?.ownerDocument.defaultView || window;
		this.doc = this.win.document;
		this.schedule = this.schedule.bind( this );

		if ( ! this.elements.$tracker.length ) {
			return;
		}

		this.win.addEventListener( 'scroll', this.schedule, { passive: true } );
		this.win.addEventListener( 'resize', this.schedule );
		this.update();
	}

	onDestroy() {
		super.onDestroy();

		if ( this.win ) {
			this.win.removeEventListener( 'scroll', this.schedule );
			this.win.removeEventListener( 'resize', this.schedule );
			this.win.cancelAnimationFrame( this.frame );
		}
	}

	onElementChange() {
		this.update();
	}

	schedule() {
		if ( null === this.frame ) {
			this.frame = this.win.requestAnimationFrame( () => {
				this.frame = null;
				this.update();
			} );
		}
	}

	findTarget() {
		const mode = this.getElementSettings( 'relative_to' );

		if ( 'selector' === mode ) {
			const selector = String( this.getElementSettings( 'target_selector' ) || '' ).trim();

			try {
				return selector ? this.doc.querySelector( selector ) : null;
			} catch ( e ) {
				return null;
			}
		}

		if ( 'content' === mode ) {
			for ( const selector of CONTENT_SELECTORS ) {
				const found = this.doc.querySelector( selector );

				if ( found ) {
					return found;
				}
			}
		}

		return null;
	}

	/** Returns 0..1. */
	measure() {
		const win = this.win,
			scrollY = win.pageYOffset || this.doc.documentElement.scrollTop,
			target = this.findTarget();
		let start = 0,
			end;

		if ( target ) {
			start = target.getBoundingClientRect().top + scrollY;
			end = start + target.offsetHeight - win.innerHeight;
		} else {
			end = Math.max( this.doc.documentElement.scrollHeight, this.doc.body.scrollHeight ) - win.innerHeight;
		}

		if ( end <= start ) {
			return scrollY >= start ? 1 : 0;
		}

		return Math.min( 1, Math.max( 0, ( scrollY - start ) / ( end - start ) ) );
	}

	update() {
		const progress = this.measure(),
			percent = Math.round( progress * 100 ),
			tracker = this.elements.$tracker[ 0 ];

		tracker.style.setProperty( '--refraction-pt-progress', String( progress ) );

		if ( percent !== this.value ) {
			this.value = percent;
			tracker.setAttribute( 'aria-valuenow', String( percent ) );
			this.elements.$percent.text( `${ percent }%` );
		}
	}
}

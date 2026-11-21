import Base from 'refraction-frontend/handlers/base';

/**
 * Timeline (0.139.0): the line runs from the first marker to the last (or the whole height), and with "Line fills as
 * the page scrolls" it colours in down to the middle of the screen, the markers it has reached taking their "reached"
 * look (.is-reached). Measured again when the timeline's size changes (another screen size, pictures loading) and in
 * Edit Mode when the widget is drawn again.
 */
export default class Timeline extends Base {
	onInit( ...args ) {
		super.onInit( ...args );

		this.measure = this.measure.bind( this );
		this.onScroll = this.onScroll.bind( this );
		this.frame = 0;

		if ( 'ResizeObserver' in window ) {
			this.resize = new ResizeObserver( () => this.measure() );
			this.resize.observe( this.$element.get( 0 ) );
		}

		window.addEventListener( 'scroll', this.onScroll, { passive: true } );
		window.addEventListener( 'resize', this.onScroll, { passive: true } );
		this.measure();
	}

	onDestroy() {
		if ( this.resize ) {
			this.resize.disconnect();
		}

		window.removeEventListener( 'scroll', this.onScroll );
		window.removeEventListener( 'resize', this.onScroll );
		window.cancelAnimationFrame( this.frame );
		super.onDestroy();
	}

	onElementChange() {
		this.measure();
	}

	/** The timeline's box, looked up each time: Edit Mode draws the widget's markup again in place. */
	get root() {
		return this.findElement( '.rf-tl' ).get( 0 ) || null;
	}

	/** This timeline's own entries and markers (not those of a timeline inside an entry). */
	markers() {
		const list = this.root.querySelector( ':scope > .rf-tl__items' );

		return list ? Array.from( list.children ).filter( ( el ) => el.classList.contains( 'rf-tl__item' ) ).map( ( item ) => [ item, item.querySelector( ':scope > .rf-tl__marker' ) ] ).filter( ( pair ) => pair[ 1 ] ) : [];
	}

	/** The line's ends: the first and last markers' middles, or the whole height. */
	measure() {
		if ( ! this.root ) {
			return;
		}

		this.zigzag();

		const marks = this.markers();
		const full = 'full' === this.getElementSettings( 'line_ends' );
		const box = this.root.getBoundingClientRect();

		if ( ! marks.length || full ) {
			this.root.style.removeProperty( '--rf-tl-line-top' );
			this.root.style.removeProperty( '--rf-tl-line-bottom' );
		} else {
			const middle = ( el ) => {
				const r = el.getBoundingClientRect();

				return r.top + ( r.height / 2 ) - box.top;
			};

			this.root.style.setProperty( '--rf-tl-line-top', Math.round( middle( marks[ 0 ][ 1 ] ) ) + 'px' );
			this.root.style.setProperty( '--rf-tl-line-bottom', Math.round( box.height - middle( marks[ marks.length - 1 ][ 1 ] ) ) + 'px' );
		}

		this.paint();
	}

	/**
	 * Zigzag (on the screen sizes whose layout is Zigzag: --rf-tl-zigzag 1): each entry starts part-way down the one
	 * before it (--rf-tl-zz-start, %), so the two sides interlock, but never over an earlier entry on its own side (it
	 * waits for it, with the space between entries) nor level with the previous marker. Done with a negative top
	 * margin worked out from the entries' heights only, so drawing again gives the same result. Other layouts: none.
	 */
	zigzag() {
		const list = this.root.querySelector( ':scope > .rf-tl__items' );

		if ( ! list ) {
			return;
		}

		const items = Array.from( list.children ).filter( ( el ) => el.classList.contains( 'rf-tl__item' ) );
		const style = getComputedStyle( this.root );

		if ( '1' !== style.getPropertyValue( '--rf-tl-zigzag' ).trim() ) {
			items.forEach( ( item ) => item.style.removeProperty( 'margin-top' ) );
			return;
		}

		const start = Math.max( 0.1, Math.min( 1, ( parseFloat( style.getPropertyValue( '--rf-tl-zz-start' ) ) || 50 ) / 100 ) );
		const gap = parseFloat( getComputedStyle( list ).rowGap ) || 0;
		const bottoms = {};
		let top = 0;
		let height = 0;

		items.forEach( ( item, index ) => {
			const h = item.offsetHeight;
			const side = getComputedStyle( item ).getPropertyValue( '--rf-tl-col' ).trim();
			const marker = item.querySelector( ':scope > .rf-tl__marker' );
			let at = 0;

			if ( index ) {
				at = Math.max( top + ( height * start ), top + ( marker ? marker.offsetHeight : 0 ) + 8 );

				if ( undefined !== bottoms[ side ] ) {
					at = Math.max( at, bottoms[ side ] + gap );
				}

				// Its place in the flow without a margin is under the entry before, after the space between entries.
				item.style.marginTop = Math.round( at - ( top + height + gap ) ) + 'px';
			} else {
				item.style.removeProperty( 'margin-top' );
			}

			bottoms[ side ] = Math.max( bottoms[ side ] ?? -Infinity, at + h );
			top = at;
			height = h;
		} );
	}

	onScroll() {
		if ( ! this.frame ) {
			this.frame = window.requestAnimationFrame( () => {
				this.frame = 0;
				this.paint();
			} );
		}
	}

	/** The scroll fill: down to the middle of the screen; the markers above that point are reached. */
	paint() {
		if ( ! this.root ) {
			return;
		}

		const marks = this.markers();

		if ( 'yes' !== this.getElementSettings( 'progress' ) ) {
			this.root.style.removeProperty( '--rf-tl-progress' );
			marks.forEach( ( [ item ] ) => item.classList.remove( 'is-reached' ) );
			return;
		}

		const line = this.root.querySelector( ':scope > .rf-tl__line' );

		if ( ! line ) {
			return;
		}

		const r = line.getBoundingClientRect();
		const at = window.innerHeight / 2;
		const done = r.height > 0 ? Math.max( 0, Math.min( 1, ( at - r.top ) / r.height ) ) : 0;

		this.root.style.setProperty( '--rf-tl-progress', ( done * 100 ).toFixed( 2 ) + '%' );
		marks.forEach( ( [ item, marker ] ) => {
			const m = marker.getBoundingClientRect();
			item.classList.toggle( 'is-reached', m.top + ( m.height / 2 ) <= at );
		} );
	}
}

import Base from 'refraction-frontend/handlers/base';

/**
 * Pin Board (0.143.0): the dashed curves from each note to the next, behind the notes (svg.rf-pb__links). A curve
 * leaves the note on the side facing the next one (or its bottom when the next is below it) and reaches the next note's
 * facing side or its pin, bending like a loose string. Drawn in the zigzag (or the grid too, as set), again whenever
 * the board or a note changes size, and in Edit Mode when a setting changes.
 */
const NS = 'http://www.w3.org/2000/svg';

export default class PinBoard extends Base {
	onInit( ...args ) {
		super.onInit( ...args );

		this.schedule = this.schedule.bind( this );
		this.frame = 0;

		if ( 'ResizeObserver' in window ) {
			this.resize = new ResizeObserver( this.schedule );
			this.resize.observe( this.$element.get( 0 ) );
		}

		window.addEventListener( 'resize', this.schedule );
		window.addEventListener( 'load', this.schedule );

		if ( this.isEdit ) {
			try {
				this.settingsModel = refraction.getContainer( this.getID() ).settings;
				this.settingsModel.on( 'change', this.schedule );
			} catch ( e ) {}
		}

		this.draw();
	}

	onDestroy() {
		if ( this.resize ) {
			this.resize.disconnect();
		}

		if ( this.settingsModel ) {
			this.settingsModel.off( 'change', this.schedule );
		}

		window.removeEventListener( 'resize', this.schedule );
		window.removeEventListener( 'load', this.schedule );
		window.cancelAnimationFrame( this.frame );
		super.onDestroy();
	}

	onElementChange() {
		this.schedule();
	}

	schedule() {
		if ( ! this.frame ) {
			this.frame = window.requestAnimationFrame( () => {
				this.frame = 0;
				this.draw();
			} );
		}
	}

	draw() {
		const board = this.findElement( '.rf-pb' ).get( 0 );
		const svg = board && board.querySelector( ':scope > .rf-pb__links' );

		if ( ! svg ) {
			return;
		}

		const list = board.querySelector( ':scope > .rf-pb__notes' );
		const notes = list ? Array.from( list.children ).filter( ( el ) => el.classList.contains( 'rf-pb__note' ) ) : [];
		const s = this.getElementSettings();
		const style = getComputedStyle( board );
		const zigzag = '1' === style.getPropertyValue( '--rf-pb-zigzag' ).trim();
		const show = 'always' === s.links || ( 'none' !== s.links && zigzag );

		svg.replaceChildren();

		if ( ! show || notes.length < 2 ) {
			return;
		}

		// Watch the notes too: a note growing moves the ones after it.
		if ( this.resize ) {
			notes.forEach( ( note ) => this.resize.observe( note ) );
		}

		const origin = board.getBoundingClientRect();
		const width = parseFloat( style.getPropertyValue( '--rf-pb-link-w' ) ) || 1.5;
		const dash = { dashed: `${ width * 4 } ${ width * 4 }`, dotted: `0.01 ${ width * 3 }` }[ s.link_style || 'dashed' ];
		const box = ( el ) => {
			const r = el.getBoundingClientRect();

			return { l: r.left - origin.left, r: r.right - origin.left, t: r.top - origin.top, b: r.bottom - origin.top, cx: r.left - origin.left + ( r.width / 2 ), cy: r.top - origin.top + ( r.height / 2 ) };
		};

		notes.slice( 0, -1 ).forEach( ( note, i ) => {
			const a = box( note );
			const nextNote = notes[ i + 1 ];
			const b = box( nextNote );
			const pin = nextNote.querySelector( ':scope > .rf-pb__pin' );
			const sideways = Math.abs( b.cx - a.cx ) > ( ( a.r - a.l ) / 3 );
			const right = b.cx > a.cx;
			let start;
			let end;
			let c1;
			let c2;

			if ( sideways ) {
				// Out of the side facing the next note, a third of the way down.
				start = [ right ? a.r : a.l, a.t + ( ( a.b - a.t ) * 0.62 ) ];

				if ( 'pin' === s.link_end && pin ) {
					const p = box( pin );
					end = [ p.cx, p.cy ];
					c2 = [ end[ 0 ], end[ 1 ] - Math.max( 30, ( end[ 1 ] - start[ 1 ] ) * 0.6 ) ];
				} else {
					end = [ right ? b.l : b.r, b.t + ( ( b.b - b.t ) * 0.3 ) ];
					c2 = [ end[ 0 ] - ( ( right ? 1 : -1 ) * Math.max( 30, Math.abs( end[ 0 ] - start[ 0 ] ) * 0.5 ) ), end[ 1 ] ];
				}

				c1 = [ start[ 0 ] + ( ( right ? 1 : -1 ) * Math.max( 30, Math.abs( end[ 0 ] - start[ 0 ] ) * 0.5 ) ), start[ 1 ] ];
			} else {
				// One under another: from the bottom to the next one's top (or pin), with a slight swing.
				start = [ a.cx, a.b ];

				if ( 'pin' === s.link_end && pin ) {
					const p = box( pin );
					end = [ p.cx, p.cy ];
				} else {
					end = [ b.cx, b.t ];
				}

				const swing = Math.max( 24, ( end[ 1 ] - start[ 1 ] ) * 0.4 );
				c1 = [ start[ 0 ] + ( swing * 0.6 ), start[ 1 ] + swing ];
				c2 = [ end[ 0 ] + ( swing * 0.6 ), end[ 1 ] - swing ];
			}

			const path = document.createElementNS( NS, 'path' );
			path.setAttribute( 'd', `M${ start[ 0 ] },${ start[ 1 ] } C${ c1[ 0 ] },${ c1[ 1 ] } ${ c2[ 0 ] },${ c2[ 1 ] } ${ end[ 0 ] },${ end[ 1 ] }` );
			path.setAttribute( 'stroke-width', width );

			if ( dash ) {
				path.setAttribute( 'stroke-dasharray', dash );
			}

			svg.appendChild( path );
		} );
	}
}

import Base from 'refraction-frontend/handlers/base';

/**
 * Pin Board (0.143.0, 0.144.0).
 *
 * - The lines from each note to the next, behind the notes (svg.rf-pb__links): their shape (curve, S-curve, loose
 *   string, straight, elbow), pattern (dashed, dotted, solid, long dashes, dash and dot) and ends (an arrow, dots).
 * - The reveal: each note appears as it comes into view (several together one after another), then the line to it
 *   draws itself (a mask over the line, so a dashed line stays dashed); the heading and footer fade in. Again every time
 *   it comes into view if asked. None for visitors who ask for less motion.
 * - Edit Mode: a note dragged by its white frame or its pin moves; dragged by the handle on its right edge it widens or
 *   narrows. On release the place is saved for the screen size shown, as the note's From The Left / From The Top /
 *   Width; in the zigzag or the grid every note keeps where it is and this screen size turns to the Free layout. The
 *   Heading and Footer switches add or remove their rows (first and last in the Notes list).
 */
const NS = 'http://www.w3.org/2000/svg';

// A pattern's dashes, from the line's width.
const DASHES = {
	dashed: ( w ) => [ w * 4, w * 4 ],
	dotted: ( w ) => [ 0.01, w * 3 ],
	long: ( w ) => [ w * 10, w * 5 ],
	'dash-dot': ( w ) => [ w * 7, w * 3.5, 0.01, w * 3.5 ],
};

const svgEl = ( name, attrs = {} ) => {
	const node = document.createElementNS( NS, name );
	Object.entries( attrs ).forEach( ( [ k, v ] ) => node.setAttribute( k, v ) );
	return node;
};

export default class PinBoard extends Base {
	onInit( ...args ) {
		super.onInit( ...args );

		this.schedule = this.schedule.bind( this );
		this.frame = 0;
		this.shownLines = new Set();
		this.shown = new WeakSet();

		if ( 'ResizeObserver' in window ) {
			this.resize = new ResizeObserver( this.schedule );
			this.resize.observe( this.$element.get( 0 ) );
		}

		window.addEventListener( 'resize', this.schedule );
		window.addEventListener( 'load', this.schedule );

		if ( this.isEdit ) {
			this.setUpEditing();
		}

		this.setUpReveal();
		this.draw();
	}

	onDestroy() {
		if ( this.resize ) {
			this.resize.disconnect();
		}

		if ( this.seen ) {
			this.seen.disconnect();
		}

		if ( this.mutations ) {
			this.mutations.disconnect();
		}

		if ( this.settingsModel ) {
			this.settingsModel.off( 'change', this.onSettings );
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

	board() {
		return this.findElement( '.rf-pb' ).get( 0 ) || null;
	}

	/** This board's own rows (not those of a board inside a note). */
	slots() {
		const list = this.board()?.querySelector( ':scope > .rf-pb__notes' );

		return list ? Array.from( list.children ).filter( ( el ) => el.classList.contains( 'rf-pb__slot' ) ) : [];
	}

	notes() {
		return this.slots().filter( ( el ) => el.classList.contains( 'rf-pb__note' ) );
	}

	// ---------------------------------------------------------------- the lines

	draw() {
		const board = this.board();
		const svg = board && board.querySelector( ':scope > .rf-pb__links' );

		if ( ! svg ) {
			return;
		}

		if ( this.isEdit ) {
			board.classList.add( 'rf-pb--editing' );
			this.notes().forEach( ( note ) => {
				if ( ! note.querySelector( ':scope > .rf-pb__resize' ) ) {
					const handle = document.createElement( 'span' );
					handle.className = 'rf-pb__resize';
					handle.title = 'Drag to change the width';
					note.appendChild( handle );
				}
			} );
		}

		const notes = this.notes();
		const s = this.getElementSettings();
		const style = getComputedStyle( board );
		const zigzag = '1' === style.getPropertyValue( '--rf-pb-zigzag' ).trim();
		const show = 'always' === s.links || ( 'none' !== s.links && zigzag );

		svg.replaceChildren();

		if ( ! show || notes.length < 2 ) {
			return;
		}

		if ( this.resize ) {
			notes.forEach( ( note ) => this.resize.observe( note ) );
		}

		const origin = board.getBoundingClientRect();
		const width = parseFloat( style.getPropertyValue( '--rf-pb-link-w' ) ) || 1.5;
		const dash = ( DASHES[ s.link_style ] || ( 'solid' === s.link_style ? null : DASHES.dashed ) );
		const pattern = dash ? dash( width ) : null;
		const strength = Math.max( 0, Number( s.link_curve?.size ?? 100 ) ) / 100;
		const defs = svgEl( 'defs' );
		const uid = 'rf-pb-' + this.getID();
		const markers = this.markers( defs, uid, width, s.link_marker || '' );
		const revealing = this.revealOn() && 'yes' === s.reveal_lines;

		svg.appendChild( defs );
		board.style.setProperty( '--rf-pb-dash', pattern ? pattern.reduce( ( a, b ) => a + b, 0 ) + 'px' : '12px' );

		const box = ( el ) => {
			const r = el.getBoundingClientRect();

			return { l: r.left - origin.left, r: r.right - origin.left, t: r.top - origin.top, b: r.bottom - origin.top, cx: r.left - origin.left + ( r.width / 2 ), cy: r.top - origin.top + ( r.height / 2 ) };
		};

		notes.slice( 0, -1 ).forEach( ( note, i ) => {
			const d = this.linkPath( box( note ), box( notes[ i + 1 ] ), notes[ i + 1 ], s, strength, box );
			const path = svgEl( 'path', { class: 'rf-pb__link', d, 'stroke-width': width } );

			if ( pattern ) {
				path.setAttribute( 'stroke-dasharray', pattern.join( ' ' ) );
			}

			if ( markers.start ) {
				path.setAttribute( 'marker-start', `url(#${ markers.start })` );
			}

			if ( markers.end ) {
				path.setAttribute( 'marker-end', `url(#${ markers.end })` );
			}

			// Drawn when the note it leads to has come in: a mask the line's length, slid open.
			if ( revealing ) {
				const mask = svgEl( 'mask', { id: `${ uid }-m${ i }`, maskUnits: 'userSpaceOnUse' } );
				const reveal = svgEl( 'path', { d, fill: 'none', stroke: '#fff', 'stroke-width': ( width * 2 ) + 16, 'stroke-linecap': 'round' } );
				mask.appendChild( reveal );
				defs.appendChild( mask );
				path.setAttribute( 'mask', `url(#${ mask.id })` );
				svg.appendChild( path );

				const length = Math.ceil( reveal.getTotalLength() ) + 2;
				reveal.setAttribute( 'stroke-dasharray', `${ length } ${ length }` );
				reveal.setAttribute( 'stroke-dashoffset', this.shownLines.has( i ) ? 0 : length );
				reveal.dataset.length = length;
				reveal.classList.add( 'rf-pb__reveal-line' );
				reveal.dataset.line = i;
				return;
			}

			svg.appendChild( path );
		} );
	}

	/**
	 * The ends' markers in the defs: { start, end } ids.
	 *
	 * @param {Element} defs  The defs to add them to.
	 * @param {string}  uid   This board's id prefix.
	 * @param {number}  width The line's width.
	 * @param {string}  kind  '', 'arrow', 'dots', 'dot-arrow'.
	 */
	markers( defs, uid, width, kind ) {
		const size = Math.max( 6, width * 5 );
		const make = ( id, d, refX ) => {
			const m = svgEl( 'marker', { id, viewBox: '0 0 10 10', refX, refY: 5, markerWidth: size, markerHeight: size, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' } );
			m.appendChild( svgEl( 'path', { d, class: 'rf-pb__end' } ) );
			defs.appendChild( m );
			return id;
		};
		const arrow = () => make( uid + '-arrow', 'M0,0 L10,5 L0,10 Z', 9 );
		const dot = () => make( uid + '-dot', 'M5,2 A3,3 0 1,1 4.99,2 Z', 5 );

		if ( 'arrow' === kind ) {
			return { end: arrow() };
		}

		if ( 'dots' === kind ) {
			const id = dot();
			return { start: id, end: id };
		}

		if ( 'dot-arrow' === kind ) {
			return { start: dot(), end: arrow() };
		}

		return {};
	}

	/**
	 * The path from a note to the next.
	 *
	 * @param {Object}   a        The note's box.
	 * @param {Object}   b        The next note's box.
	 * @param {Element}  next     The next note.
	 * @param {Object}   s        The settings.
	 * @param {number}   strength Curve strength (1: as designed).
	 * @param {Function} box      Box of an element.
	 */
	linkPath( a, b, next, s, strength, box ) {
		const shape = s.link_shape || 'curve';
		const pin = 'pin' === s.link_end ? next.querySelector( ':scope > .rf-pb__pin' ) : null;
		const sideways = Math.abs( b.cx - a.cx ) > ( ( a.r - a.l ) / 3 );
		const right = b.cx > a.cx;
		const dir = right ? 1 : -1;
		let start;
		let end;

		if ( sideways ) {
			start = [ right ? a.r : a.l, a.t + ( ( a.b - a.t ) * 0.62 ) ];
			end = pin ? [ box( pin ).cx, box( pin ).cy ] : [ right ? b.l : b.r, b.t + ( ( b.b - b.t ) * 0.3 ) ];
		} else {
			start = [ a.cx, a.b ];
			end = pin ? [ box( pin ).cx, box( pin ).cy ] : [ b.cx, b.t ];
		}

		const [ x1, y1 ] = start;
		const [ x2, y2 ] = end;
		const M = `M${ x1 },${ y1 }`;

		if ( 'straight' === shape ) {
			return `${ M } L${ x2 },${ y2 }`;
		}

		if ( 'elbow' === shape ) {
			if ( sideways && ! pin ) {
				const mid = ( x1 + x2 ) / 2;
				return `${ M } L${ mid },${ y1 } L${ mid },${ y2 } L${ x2 },${ y2 }`;
			}

			if ( sideways ) {
				return `${ M } L${ x2 },${ y1 } L${ x2 },${ y2 }`;
			}

			const mid = ( y1 + y2 ) / 2;
			return `${ M } L${ x1 },${ mid } L${ x2 },${ mid } L${ x2 },${ y2 }`;
		}

		const dx = Math.abs( x2 - x1 );
		const dy = Math.abs( y2 - y1 );
		const C = ( c1, c2 ) => `${ M } C${ c1[ 0 ] },${ c1[ 1 ] } ${ c2[ 0 ] },${ c2[ 1 ] } ${ x2 },${ y2 }`;

		if ( 'loose' === shape ) {
			// A string hanging between the two ends.
			const sag = Math.max( 40, Math.hypot( dx, dy ) * 0.35 ) * strength;
			return C( [ x1 + ( dir * dx * 0.2 ), Math.max( y1, y2 ) + sag ], [ x2 - ( dir * dx * 0.2 ), Math.max( y1, y2 ) + sag ] );
		}

		if ( 's-curve' === shape ) {
			if ( sideways ) {
				const pull = Math.max( 30, dx * 0.8 ) * strength;
				return C( [ x1 + ( dir * pull ), y1 ], [ x2 - ( dir * pull ), y2 ] );
			}

			const pull = Math.max( 30, dy * 0.8 ) * strength;
			return C( [ x1, y1 + pull ], [ x2, y2 - pull ] );
		}

		// Curve (0.143.0's).
		if ( sideways ) {
			const out = Math.max( 30, dx * 0.5 ) * strength;

			if ( pin ) {
				return C( [ x1 + ( dir * out ), y1 ], [ x2, y2 - ( Math.max( 30, ( y2 - y1 ) * 0.6 ) * strength ) ] );
			}

			return C( [ x1 + ( dir * out ), y1 ], [ x2 - ( dir * out ), y2 ] );
		}

		const swing = Math.max( 24, dy * 0.4 ) * strength;
		return C( [ x1 + ( swing * 0.6 ), y1 + swing ], [ x2 + ( swing * 0.6 ), y2 - swing ] );
	}

	// ---------------------------------------------------------------- the reveal

	revealOn() {
		const reduced = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		return !! this.getElementSettings( 'reveal' ) && ! reduced;
	}

	setUpReveal() {
		const board = this.board();

		if ( this.seen ) {
			this.seen.disconnect();
			this.seen = null;
		}

		if ( ! board ) {
			return;
		}

		const on = this.revealOn();

		[ ...board.classList ].filter( ( c ) => 0 === c.indexOf( 'rf-pb--reveal' ) ).forEach( ( c ) => board.classList.remove( c ) );
		this.slots().forEach( ( slot ) => {
			slot.classList.remove( 'is-pending' );
			slot.style.removeProperty( '--rf-pb-delay' );
		} );

		if ( ! on || ! ( 'IntersectionObserver' in window ) ) {
			this.shownLines = new Set( this.notes().map( ( n, i ) => i ) );
			return;
		}

		const s = this.getElementSettings();

		board.classList.add( 'rf-pb--reveal', 'rf-pb--reveal-' + s.reveal );
		board.style.setProperty( '--rf-pb-rd', Math.max( 100, Number( s.reveal_duration ) || 700 ) + 'ms' );
		this.shown = new WeakSet();
		this.shownLines = new Set();

		const targets = this.slots().filter( ( slot ) => slot.classList.contains( 'rf-pb__note' ) || 'yes' === s.reveal_parts );
		targets.forEach( ( slot ) => slot.classList.add( 'is-pending' ) );

		const stagger = Math.max( 0, Number( s.reveal_stagger ?? 180 ) );
		const duration = Math.max( 100, Number( s.reveal_duration ) || 700 );
		const repeat = 'yes' === s.reveal_repeat;

		this.seen = new IntersectionObserver( ( entries ) => {
			let k = 0;
			const notes = this.notes();

			entries.sort( ( x, y ) => x.boundingClientRect.top - y.boundingClientRect.top ).forEach( ( entry ) => {
				const slot = entry.target;

				if ( entry.isIntersecting && ! this.shown.has( slot ) ) {
					const delay = k * stagger;
					k++;
					this.shown.add( slot );
					slot.style.setProperty( '--rf-pb-delay', delay + 'ms' );
					slot.classList.remove( 'is-pending' );

					// The line into this note draws once the note is in.
					const n = notes.indexOf( slot );

					if ( n > 0 ) {
						window.setTimeout( () => this.showLine( n - 1 ), delay + ( duration * 0.6 ) );
					}
				} else if ( ! entry.isIntersecting && repeat && this.shown.has( slot ) ) {
					this.shown.delete( slot );
					slot.style.setProperty( '--rf-pb-delay', '0ms' );
					slot.classList.add( 'is-pending' );

					const n = notes.indexOf( slot );

					if ( n > 0 ) {
						this.hideLine( n - 1 );
					}
				}
			} );
		}, { threshold: 0.15 } );

		targets.forEach( ( slot ) => this.seen.observe( slot ) );
	}

	showLine( i ) {
		this.shownLines.add( i );

		const line = this.board()?.querySelector( `.rf-pb__reveal-line[data-line="${ i }"]` );

		if ( line ) {
			line.style.transition = `stroke-dashoffset ${ Math.max( 300, ( Number( this.getElementSettings( 'reveal_duration' ) ) || 700 ) * 1.2 ) }ms ease-in-out`;
			line.setAttribute( 'stroke-dashoffset', 0 );
		}
	}

	hideLine( i ) {
		this.shownLines.delete( i );

		const line = this.board()?.querySelector( `.rf-pb__reveal-line[data-line="${ i }"]` );

		if ( line ) {
			line.style.transition = 'none';
			line.setAttribute( 'stroke-dashoffset', line.dataset.length );
		}
	}

	// ---------------------------------------------------------------- Edit Mode

	editor() {
		const win = window.parent && window.parent !== window ? window.parent : window;

		return { ed: win.refraction || window.refraction, run: win.$e || window.$e };
	}

	setUpEditing() {
		const { ed } = this.editor();

		try {
			this.widget = ed.getContainer( this.getID() );
			this.settingsModel = this.widget.settings;
			this.onSettings = ( model ) => {
				const changed = Object.keys( model.changed || {} );

				// After the settings command: a row added from inside it would get no container (the nested hooks only
				// answer an insert run on its own).
				[ 'heading', 'footer' ].forEach( ( role ) => {
					if ( changed.includes( 'show_' + role ) ) {
						window.setTimeout( () => this.toggleRole( role, 'yes' === model.get( 'show_' + role ) ), 0 );
					}
				} );

				// A Reveal setting changed: play it again.
				if ( changed.some( ( key ) => 0 === key.indexOf( 'reveal' ) ) ) {
					window.setTimeout( () => this.setUpReveal(), 50 );
				}

				this.schedule();
			};
			this.settingsModel.on( 'change', this.onSettings );
		} catch ( e ) {}

		// Drawn again when the widget's markup is (a note added, a setting that redraws it), not for the lines' own changes.
		this.mutations = new MutationObserver( ( records ) => {
			if ( records.some( ( r ) => ! r.target.closest || ! r.target.closest( '.rf-pb__links' ) ) ) {
				this.schedule();
			}
		} );
		this.mutations.observe( this.$element.get( 0 ), { childList: true, subtree: true } );

		this.$element.get( 0 ).addEventListener( 'pointerdown', ( event ) => this.onPointerDown( event ) );
	}

	/**
	 * Adds or removes the heading / footer row (first / last in the Notes list).
	 *
	 * @param {string}  role 'heading' or 'footer'.
	 * @param {boolean} on   Whether it is wanted.
	 */
	toggleRole( role, on ) {
		const { run } = this.editor();
		const widget = this.widget;
		const rows = widget?.repeaters?.items?.children || [];
		const row = rows.find( ( r ) => role === r.settings.get( 'role' ) );

		if ( on && ! row ) {
			run.run( 'document/repeater/insert', {
				container: widget,
				name: 'items',
				model: { item_title: 'heading' === role ? 'Heading' : 'Footer', role },
				options: { at: 'heading' === role ? 0 : rows.length },
			} );
		} else if ( ! on && row ) {
			run.run( 'document/repeater/remove', { container: widget, name: 'items', index: rows.indexOf( row ) } );
		}
	}

	onPointerDown( event ) {
		// Edit Mode starts this script again when the widget is drawn again: only one of them takes a drag.
		if ( event.rfPbTaken ) {
			return;
		}

		const note = event.target.closest( '.rf-pb__note' );
		const list = this.board()?.querySelector( ':scope > .rf-pb__notes' );

		if ( ! note || ! list || note.parentElement !== list || 0 !== event.button ) {
			return;
		}

		const resizing = !! event.target.closest( '.rf-pb__resize' );

		// Inside the note's own container: its widgets are edited, not dragged.
		if ( ! resizing && event.target.closest( '.e-con' ) && note.contains( event.target.closest( '.e-con' ) ) ) {
			return;
		}

		event.rfPbTaken = true;
		event.preventDefault();
		event.stopPropagation();

		const start = { x: event.clientX, y: event.clientY, width: note.offsetWidth };
		let dx = 0;
		let dy = 0;

		note.classList.add( 'is-dragging' );
		note.setPointerCapture( event.pointerId );

		const move = ( e ) => {
			dx = e.clientX - start.x;
			dy = e.clientY - start.y;

			if ( resizing ) {
				note.style.width = Math.max( 80, start.width + dx ) + 'px';
			} else {
				note.style.translate = `${ dx }px ${ dy }px`;
			}
		};
		const up = () => {
			note.removeEventListener( 'pointermove', move );
			note.removeEventListener( 'pointerup', up );
			note.removeEventListener( 'pointercancel', up );

			if ( Math.abs( dx ) + Math.abs( dy ) > 2 ) {
				// The click that ends a drag selects nothing.
				window.addEventListener( 'click', ( e ) => {
					e.stopPropagation();
					e.preventDefault();
				}, { capture: true, once: true } );
				this.save( note, resizing ? 0 : dx, resizing ? 0 : dy, resizing ? Math.max( 80, start.width + dx ) : 0 );
			}

			note.classList.remove( 'is-dragging' );
			note.style.removeProperty( 'translate' );
			note.style.removeProperty( 'width' );
		};

		note.addEventListener( 'pointermove', move );
		note.addEventListener( 'pointerup', up );
		note.addEventListener( 'pointercancel', up );
	}

	/**
	 * Saves where the notes are, for the screen size shown: the dragged one moved by dx / dy (or widened to width), the
	 * others where they are. In the zigzag or the grid this screen size turns to Free with every note in place.
	 *
	 * @param {Element} dragged The note dragged.
	 * @param {number}  dx      Moved across (px).
	 * @param {number}  dy      Moved down (px).
	 * @param {number}  width   Its new width (px), or 0.
	 */
	save( dragged, dx, dy, width ) {
		const { ed, run } = this.editor();
		const board = this.board();
		const list = board.querySelector( ':scope > .rf-pb__notes' );
		const rows = this.widget?.repeaters?.items?.children || [];
		const W = list.clientWidth;

		if ( ! W || ! rows.length ) {
			return;
		}

		const style = getComputedStyle( board );
		const free = '1' === style.getPropertyValue( '--rf-pb-free' ).trim();
		const gap = parseFloat( style.getPropertyValue( '--rf-pb-gap' ) ) || 36;
		const heading = list.querySelector( ':scope > .rf-pb__part--heading' );
		// The notes' cell starts under the heading and the space after it.
		const top = heading ? heading.offsetTop + heading.offsetHeight + gap : 0;
		const mode = ( ed.channels?.deviceMode?.request( 'currentMode' ) ) || 'desktop';
		const key = ( name ) => ( 'desktop' === mode ? name : `${ name }_${ mode }` );
		const round = ( v ) => Math.round( v * 10 ) / 10;
		const rowOf = ( note ) => rows.find( ( r ) => note.classList.contains( 'refraction-repeater-item-' + r.id ) );
		// Every place measured first: changing the layout or a note moves the others.
		const places = ( free ? [ dragged ] : this.notes() ).map( ( note ) => {
			let w = ( note === dragged && width ? width : note.offsetWidth ) / W * 100;
			w = Math.max( 10, Math.min( 100, w ) );
			let x = ( note.offsetLeft + ( note === dragged ? dx : 0 ) ) / W * 100;
			x = Math.max( 0, Math.min( 100 - w, x ) );
			const y = Math.max( 0, note.offsetTop - top + ( note === dragged ? dy : 0 ) );

			return { row: rowOf( note ), x, y, w };
		} ).filter( ( place ) => place.row );
		const history = run.internal( 'document/history/start-log', { type: 'change', title: 'Pin Board' } );

		places.forEach( ( { row, x, y, w } ) => {
			run.run( 'document/elements/settings', {
				container: row,
				settings: {
					[ key( 'pos_x' ) ]: { unit: 'px', size: round( x ) },
					[ key( 'pos_y' ) ]: { unit: 'px', size: Math.round( y ) },
					[ key( 'note_w' ) ]: { unit: 'px', size: round( w ) },
				},
			} );
		} );

		if ( ! free ) {
			run.run( 'document/elements/settings', { container: this.widget, settings: { [ key( 'layout' ) ]: 'free' } } );
		}

		run.internal( 'document/history/end-log', { id: history } );
		this.schedule();
	}
}

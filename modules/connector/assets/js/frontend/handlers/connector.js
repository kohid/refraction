import Base from 'refraction-frontend/handlers/base';

/**
 * Connector (0.140.0): draws the arrow from one element to another as an SVG inside the widget, in coordinates from
 * the widget's corner (it sits at its container's top left, with no size). The two elements are found from the
 * settings (the container holding the widget, the one after or before it, or a CSS ID); the path, sides, gap, place
 * along each side, line width and head size are read from the widget's custom properties, which hold each screen
 * size's own values. Drawn again whenever either element, the container or the page changes size.
 */
const NS = 'http://www.w3.org/2000/svg';

// Heads in a 10 x 10 box, the tip (or the middle) at x 10 / y 5 where the line ends.
const HEADS = {
	arrow: { d: 'M0,0 L10,5 L0,10 Z', fill: true, ref: 9 },
	open: { d: 'M1,1 L9,5 L1,9', fill: false, ref: 9 },
	thin: { d: 'M3,2 L9,5 L3,8', fill: false, ref: 9 },
	circle: { d: 'M5,1.5 A3.5,3.5 0 1,1 4.99,1.5 Z', fill: true, ref: 5 },
	diamond: { d: 'M1,5 L5,1 L9,5 L5,9 Z', fill: true, ref: 5 },
	square: { d: 'M2,2 H8 V8 H2 Z', fill: true, ref: 5 },
};

const NORMAL = { right: [ 1, 0 ], left: [ -1, 0 ], top: [ 0, -1 ], bottom: [ 0, 1 ] };

const el = ( name, attrs = {} ) => {
	const node = document.createElementNS( NS, name );
	Object.entries( attrs ).forEach( ( [ k, v ] ) => node.setAttribute( k, v ) );
	return node;
};

/**
 * A polyline with rounded corners (never more than half a segment).
 *
 * @param {Array}  points [ x, y ] points.
 * @param {number} r      Corner radius.
 */
function rounded( points, r ) {
	let d = `M${ points[ 0 ][ 0 ] },${ points[ 0 ][ 1 ] }`;

	for ( let i = 1; i < points.length - 1; i++ ) {
		const [ px, py ] = points[ i - 1 ];
		const [ cx, cy ] = points[ i ];
		const [ nx, ny ] = points[ i + 1 ];
		const inLen = Math.hypot( cx - px, cy - py );
		const outLen = Math.hypot( nx - cx, ny - cy );
		const k = Math.min( r, inLen / 2, outLen / 2 );

		if ( k < 0.5 ) {
			d += ` L${ cx },${ cy }`;
			continue;
		}

		const a = [ cx - ( ( cx - px ) / inLen * k ), cy - ( ( cy - py ) / inLen * k ) ];
		const b = [ cx + ( ( nx - cx ) / outLen * k ), cy + ( ( ny - cy ) / outLen * k ) ];
		d += ` L${ a[ 0 ] },${ a[ 1 ] } Q${ cx },${ cy } ${ b[ 0 ] },${ b[ 1 ] }`;
	}

	const last = points[ points.length - 1 ];

	return d + ` L${ last[ 0 ] },${ last[ 1 ] }`;
}

export default class Connector extends Base {
	onInit( ...args ) {
		super.onInit( ...args );

		this.draw = this.draw.bind( this );
		this.schedule = this.schedule.bind( this );
		this.frame = 0;
		this.watched = [];

		if ( 'ResizeObserver' in window ) {
			this.resize = new ResizeObserver( this.schedule );
			this.resize.observe( document.body );
		}

		window.addEventListener( 'resize', this.schedule );
		window.addEventListener( 'load', this.schedule );

		// Edit Mode: any change of the widget's settings (the panel, undo, paste style...) draws it again once its CSS
		// is in place; the panel's own notice (onElementChange) only comes for changes typed in the panel.
		if ( this.isEdit ) {
			try {
				this.settingsModel = refraction.getContainer( this.getID() ).settings;
				this.settingsModel.on( 'change', this.schedule );
			} catch ( e ) {}

			// While the Connector is selected, the two elements it joins are outlined.
			this.selection = new MutationObserver( () => this.outlineLinked() );
			this.selection.observe( this.$element.get( 0 ), { attributes: true, attributeFilter: [ 'class' ] } );
		}

		this.draw();
	}

	onDestroy() {
		if ( this.resize ) {
			this.resize.disconnect();
		}

		if ( this.seen ) {
			this.seen.disconnect();
		}

		window.removeEventListener( 'resize', this.schedule );
		window.removeEventListener( 'load', this.schedule );

		if ( this.settingsModel ) {
			this.settingsModel.off( 'change', this.schedule );
		}

		if ( this.selection ) {
			this.selection.disconnect();
			this.linked = [];
			this.outlineLinked();
		}

		window.cancelAnimationFrame( this.frame );
		super.onDestroy();
	}

	onElementChange( name ) {
		if ( 'animation' === name ) {
			this.drawn = false;
		}

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

	/** The container holding the widget (the closest one around it). */
	holder() {
		const parent = this.$element.get( 0 ).parentElement;

		return parent ? parent.closest( '.e-con, .refraction-element' ) : null;
	}

	/**
	 * An end: the holding container, its next or previous sibling element, or an element by CSS ID.
	 *
	 * @param {string} end 'from' or 'to'.
	 */
	target( end ) {
		const s = this.getElementSettings();
		const kind = s[ end ] || ( 'from' === end ? 'parent' : 'next' );
		const sibling = ( node, way ) => {
			let n = node && node[ way ];

			while ( n && ! n.classList.contains( 'refraction-element' ) ) {
				n = n[ way ];
			}

			return n;
		};

		// Picked on the page in Edit Mode: the element's own id.
		if ( 'element' === kind ) {
			const id = String( s[ end + '_element' ] || '' ).replace( /[^a-z0-9]/gi, '' );

			return id ? document.querySelector( `.refraction-element[data-id="${ id }"]` ) : null;
		}

		if ( 'id' === kind ) {
			const id = String( s[ end + '_id' ] || '' ).replace( /^#/, '' ).trim();

			return id ? document.getElementById( id ) : null;
		}

		const holder = this.holder();

		if ( 'next' === kind ) {
			return sibling( holder, 'nextElementSibling' );
		}

		if ( 'previous' === kind ) {
			return sibling( holder, 'previousElementSibling' );
		}

		return holder;
	}

	/** Each screen size's own values, from the widget's custom properties. */
	values() {
		const style = getComputedStyle( this.$element.get( 0 ) );
		const read = ( name ) => style.getPropertyValue( '--rf-cn-' + name ).trim();
		const num = ( name, d ) => {
			const n = parseFloat( read( name ) );

			return Number.isFinite( n ) ? n : d;
		};

		return {
			fromSide: read( 'from-side' ) || 'auto',
			toSide: read( 'to-side' ) || 'auto',
			fromAt: num( 'from-at', 50 ) / 100,
			toAt: num( 'to-at', 50 ) / 100,
			path: read( 'path' ) || 'elbow',
			radius: num( 'radius', 8 ),
			curve: num( 'curve', 40 ) / 100,
			gap: num( 'gap', 4 ),
			width: num( 'w', 2 ),
			head: num( 'head', 10 ),
			style: read( 'style' ) || 'dotted',
		};
	}

	/**
	 * The sides facing each other: side by side (or more apart sideways) left / right, else top / bottom.
	 *
	 * @param {Object} a The first box.
	 * @param {Object} b The second box.
	 */
	static facing( a, b ) {
		const dx = ( b.left + ( b.width / 2 ) ) - ( a.left + ( a.width / 2 ) );
		const dy = ( b.top + ( b.height / 2 ) ) - ( a.top + ( a.height / 2 ) );
		const overlapY = b.top < a.bottom && b.bottom > a.top;
		const overlapX = b.left < a.right && b.right > a.left;
		const across = overlapY || ( ! overlapX && Math.abs( dx ) > Math.abs( dy ) );

		return across ? [ dx > 0 ? 'right' : 'left', dx > 0 ? 'left' : 'right' ] : [ dy > 0 ? 'bottom' : 'top', dy > 0 ? 'top' : 'bottom' ];
	}

	static point( r, side, at, gap ) {
		switch ( side ) {
			case 'left': return [ r.left - gap, r.top + ( r.height * at ) ];
			case 'top': return [ r.left + ( r.width * at ), r.top - gap ];
			case 'bottom': return [ r.left + ( r.width * at ), r.bottom + gap ];
			default: return [ r.right + gap, r.top + ( r.height * at ) ];
		}
	}

	draw() {
		const host = this.$element.get( 0 );
		const box = host.querySelector( ':scope > .rf-cn, :scope > .refraction-widget-container > .rf-cn' ) || host.querySelector( '.rf-cn' );

		if ( ! box ) {
			return;
		}

		const from = this.target( 'from' );
		const to = this.target( 'to' );

		this.watch( [ from, to, this.holder() ] );
		this.linked = [ from, to ];
		this.outlineLinked();

		const old = box.querySelector( ':scope > .rf-cn__svg' );

		if ( old ) {
			old.remove();
		}

		if ( ! from || ! to || from === to ) {
			return;
		}

		const origin = box.getBoundingClientRect();
		const shift = ( r ) => ( { left: r.left - origin.left, top: r.top - origin.top, right: r.right - origin.left, bottom: r.bottom - origin.top, width: r.width, height: r.height } );
		const a = shift( from.getBoundingClientRect() );

		if ( ! a.width && ! a.height ) {
			return;
		}

		const b = shift( to.getBoundingClientRect() );
		const v = this.values();
		const s = this.getElementSettings();

		const [ autoFrom, autoTo ] = Connector.facing( a, b );
		const fromSide = NORMAL[ v.fromSide ] ? v.fromSide : autoFrom;
		const toSide = NORMAL[ v.toSide ] ? v.toSide : autoTo;
		const p = Connector.point( a, fromSide, v.fromAt, v.gap );
		const q = Connector.point( b, toSide, v.toAt, v.gap );
		const d = this.pathData( p, q, fromSide, toSide, v );

		const svg = el( 'svg', { class: 'rf-cn__svg', 'aria-hidden': 'true', focusable: 'false' } );
		const defs = el( 'defs' );
		const uid = 'rf-cn-' + ( this.getID() || Math.random().toString( 36 ).slice( 2 ) );
		const line = el( 'path', { class: 'rf-cn__line', d, 'stroke-width': v.width } );

		[ [ 'end', s.head_end || 'arrow' ], [ 'start', s.head_start || 'none' ] ].forEach( ( [ where, kind ] ) => {
			const head = HEADS[ kind ];

			if ( ! head ) {
				return;
			}

			const marker = el( 'marker', { id: `${ uid }-${ where }`, viewBox: '0 0 10 10', refX: head.ref, refY: 5, markerWidth: v.head, markerHeight: v.head, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' } );
			marker.appendChild( el( 'path', { d: head.d, class: head.fill ? 'rf-cn__head-fill' : 'rf-cn__head-line' } ) );
			defs.appendChild( marker );
			line.setAttribute( 'end' === where ? 'marker-end' : 'marker-start', `url(#${ uid }-${ where })` );
		} );

		// Dashes from the width: dashed, or round dots.
		const dash = { dashed: [ v.width * 3, v.width * 2.5 ], dotted: [ 0.01, v.width * 2.2 ] }[ v.style ];
		const flowDash = dash || [ v.width * 4, v.width * 3 ];

		if ( dash ) {
			line.setAttribute( 'stroke-dasharray', dash.join( ' ' ) );
		}

		svg.append( defs, line );
		box.appendChild( svg );

		const length = line.getTotalLength ? line.getTotalLength() : 0;
		const motion = s.animation || '';
		const reduced = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		box.classList.toggle( 'rf-cn--flow', 'flow' === motion );
		// Drawn once: later redraws (a new width) show it at once.
		const drawing = 'draw' === motion && ! reduced && ! this.drawn;
		box.classList.toggle( 'rf-cn--draw', drawing );
		box.style.setProperty( '--rf-cn-len', Math.ceil( length ) );

		if ( 'flow' === motion ) {
			line.setAttribute( 'stroke-dasharray', flowDash.join( ' ' ) );
			box.style.setProperty( '--rf-cn-dash-total', ( flowDash[ 0 ] + flowDash[ 1 ] ) + 'px' );
		}

		if ( drawing ) {
			// Solid while it draws; its own dashes once drawn.
			line.removeAttribute( 'stroke-dasharray' );
			this.drawWhenSeen( box, from, line, dash );
		}

		if ( 'pulse' === motion && ! reduced && length > 0 ) {
			const dot = el( 'circle', { class: 'rf-cn__dot', r: Math.max( 2.5, v.width * 1.8 ) } );
			const travel = el( 'animateMotion', { dur: getComputedStyle( host ).getPropertyValue( '--rf-cn-speed' ).trim() || '1.6s', repeatCount: 'indefinite', path: d } );
			dot.appendChild( travel );
			svg.appendChild( dot );
		}
	}

	pathData( p, q, fromSide, toSide, v ) {
		if ( 'straight' === v.path ) {
			return `M${ p[ 0 ] },${ p[ 1 ] } L${ q[ 0 ] },${ q[ 1 ] }`;
		}

		const [ nx1, ny1 ] = NORMAL[ fromSide ];
		const [ nx2, ny2 ] = NORMAL[ toSide ];

		if ( 'curved' === v.path ) {
			const pull = Math.max( 20, Math.hypot( q[ 0 ] - p[ 0 ], q[ 1 ] - p[ 1 ] ) * Math.max( 0.05, v.curve ) );

			return `M${ p[ 0 ] },${ p[ 1 ] } C${ p[ 0 ] + ( nx1 * pull ) },${ p[ 1 ] + ( ny1 * pull ) } ${ q[ 0 ] + ( nx2 * pull ) },${ q[ 1 ] + ( ny2 * pull ) } ${ q[ 0 ] },${ q[ 1 ] }`;
		}

		// Elbow: out of each side at right angles.
		const across = ( side ) => 'left' === side || 'right' === side;
		let points;

		if ( across( fromSide ) && across( toSide ) ) {
			const mid = ( p[ 0 ] + q[ 0 ] ) / 2;
			points = [ p, [ mid, p[ 1 ] ], [ mid, q[ 1 ] ], q ];
		} else if ( ! across( fromSide ) && ! across( toSide ) ) {
			const mid = ( p[ 1 ] + q[ 1 ] ) / 2;
			points = [ p, [ p[ 0 ], mid ], [ q[ 0 ], mid ], q ];
		} else if ( across( fromSide ) ) {
			points = [ p, [ q[ 0 ], p[ 1 ] ], q ];
		} else {
			points = [ p, [ p[ 0 ], q[ 1 ] ], q ];
		}

		// Straight segments of no length are dropped (the two lined up).
		points = points.filter( ( pt, i ) => 0 === i || Math.hypot( pt[ 0 ] - points[ i - 1 ][ 0 ], pt[ 1 ] - points[ i - 1 ][ 1 ] ) > 0.5 );

		return rounded( points, v.radius );
	}

	/** Edit Mode: outline the start (dashed) and the end (solid) while this Connector is selected. */
	outlineLinked() {
		if ( ! this.isEdit ) {
			return;
		}

		const on = this.$element.hasClass( 'refraction-element-editable' );
		const [ from, to ] = this.linked || [];

		( this.outlined || [] ).forEach( ( node ) => node.classList.remove( 'rf-cn-linked-from', 'rf-cn-linked-to' ) );
		this.outlined = [];

		if ( on ) {
			[ [ from, 'rf-cn-linked-from' ], [ to, 'rf-cn-linked-to' ] ].forEach( ( [ node, cls ] ) => {
				if ( node ) {
					node.classList.add( cls );
					this.outlined.push( node );
				}
			} );
		}
	}

	/**
	 * Redraw when either end, the container or the page changes size.
	 *
	 * @param {Array} nodes The elements.
	 */
	watch( nodes ) {
		if ( ! this.resize ) {
			return;
		}

		nodes.filter( Boolean ).forEach( ( node ) => {
			if ( ! this.watched.includes( node ) ) {
				this.watched.push( node );
				this.resize.observe( node );
			}
		} );
	}

	drawWhenSeen( box, from, line, dash ) {
		if ( this.seen ) {
			this.seen.disconnect();
		}

		const done = () => {
			this.drawn = true;
			box.classList.add( 'is-drawn' );
			window.setTimeout( () => {
				if ( dash && line.isConnected ) {
					box.classList.remove( 'rf-cn--draw' );
					line.setAttribute( 'stroke-dasharray', dash.join( ' ' ) );
				}
			}, ( ( parseFloat( getComputedStyle( box ).getPropertyValue( '--rf-cn-speed' ) ) || 1.6 ) * 1000 ) + 400 );
		};

		if ( ! ( 'IntersectionObserver' in window ) ) {
			done();
			return;
		}

		this.seen = new IntersectionObserver( ( entries ) => {
			if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
				this.seen.disconnect();
				// The next frame, so the hidden start is painted first.
				window.requestAnimationFrame( () => window.requestAnimationFrame( done ) );
			}
		}, { threshold: 0.3 } );
		this.seen.observe( from );
	}
}

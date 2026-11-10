/**
 * Dashboard widgets (modules/dashboard-widgets): what the server-drawn markup needs in the browser.
 * - Chart: draws in when it comes into view (is-drawn), and a tooltip over a bar group, a line's column or a slice.
 * - Stat Card: the number counts up when it comes into view.
 * - Data Table: sorting by a heading, searching, and pages.
 * Runs on the page and again for each widget the editor's preview renders.
 */
( function() {
	const reduced = () => !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );

	/**
	 * Calls fn once the element is well in view (at once without IntersectionObserver).
	 *
	 * @param {Element}  el
	 * @param {Function} fn
	 */
	function whenSeen( el, fn ) {
		if ( ! ( 'IntersectionObserver' in window ) ) {
			fn();
			return;
		}

		const io = new IntersectionObserver( ( entries ) => {
			if ( entries.some( ( e ) => e.isIntersecting ) ) {
				io.disconnect();
				fn();
			}
		}, { threshold: 0.25 } );
		io.observe( el );
	}

	const escapeHtml = ( text ) => String( text ).replace( /[&<>"']/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ c ] ) );

	// ---------------------------------------------------------------- chart
	function initChart( fig ) {
		if ( fig.rfChart ) {
			return;
		}

		fig.rfChart = true;

		if ( ! fig.classList.contains( 'rf-chart--animate' ) || reduced() ) {
			fig.classList.add( 'is-drawn' );
		} else {
			// Two frames so the undrawn state paints first.
			whenSeen( fig, () => requestAnimationFrame( () => requestAnimationFrame( () => fig.classList.add( 'is-drawn' ) ) ) );
		}

		let data;

		try {
			data = JSON.parse( fig.getAttribute( 'data-rf-chart' ) || '{}' );
		} catch ( e ) {
			return;
		}

		const tip = fig.querySelector( '.rf-chart__tip' );

		if ( ! tip || ! data.labels ) {
			return;
		}

		const ring = fig.querySelector( '.rf-chart__ring' );

		let active = null;

		const hide = () => {
			tip.classList.remove( 'is-shown' );

			if ( active ) {
				active.classList.remove( 'is-active' );
				active = null;
			}
		};

		const show = ( target, html, x, y ) => {
			if ( active !== target ) {
				if ( active ) {
					active.classList.remove( 'is-active' );
				}

				active = target;
				active.classList.add( 'is-active' );
			}

			tip.innerHTML = html;
			const box = fig.getBoundingClientRect();
			const half = tip.offsetWidth / 2;
			tip.style.left = Math.max( half, Math.min( box.width - half, x - box.left ) ) + 'px';
			tip.style.top = Math.max( tip.offsetHeight + 12, y - box.top ) + 'px';
			tip.classList.add( 'is-shown' );
		};

		fig.addEventListener( 'pointermove', ( e ) => {
			const slice = e.target.closest( '.rf-chart__slice' );

			if ( slice && ring ) {
				const i = Number( slice.getAttribute( 'data-i' ) );
				const s = data.series[ 0 ];
				const share = slice.style.getPropertyValue( '--share' );

				show( slice, `<b>${ escapeHtml( data.labels[ i ] ) }</b><span><i style="background:${ escapeHtml( slice.getAttribute( 'stroke' ) ) }"></i>${ escapeHtml( s.name ) }<em>${ escapeHtml( s.values[ i ] ) } · ${ Math.round( parseFloat( share ) ) }%</em></span>`, e.clientX, e.clientY );
				return;
			}

			const group = e.target.closest( '.rf-chart__group' );

			if ( ! group ) {
				hide();
				return;
			}

			const i = Number( group.getAttribute( 'data-i' ) );
			const rows = data.series.map( ( s ) => `<span><i style="background:${ escapeHtml( s.color ) }"></i>${ escapeHtml( s.name ) }<em>${ escapeHtml( s.values[ i ] ) }</em></span>` ).join( '' );
			const r = group.getBoundingClientRect();
			const horizontal = !! group.closest( '.is-horizontal' );

			show( group, `<b>${ escapeHtml( data.labels[ i ] ) }</b>${ rows }`, horizontal ? e.clientX : r.left + ( r.width / 2 ), horizontal ? r.top + ( r.height / 2 ) : e.clientY );
		} );

		fig.addEventListener( 'pointerleave', hide );
	}

	// ---------------------------------------------------------------- stat card
	function formatCount( value, cfg ) {
		const decimals = Math.max( 0, Math.min( 6, Number( cfg.decimals ) || 0 ) );
		const fixed = Math.abs( value ).toFixed( decimals ).split( '.' );
		fixed[ 0 ] = fixed[ 0 ].replace( /\B(?=(\d{3})+(?!\d))/g, ',' );

		return ( value < 0 ? '-' : '' ) + ( cfg.prefix || '' ) + fixed.join( '.' ) + ( cfg.suffix || '' );
	}

	function initStat( el ) {
		if ( el.rfCount ) {
			return;
		}

		el.rfCount = true;

		let cfg;

		try {
			cfg = JSON.parse( el.getAttribute( 'data-rf-count' ) );
		} catch ( e ) {
			return;
		}

		if ( reduced() || ! cfg || ! Number.isFinite( cfg.to ) ) {
			return;
		}

		const final = el.textContent;
		el.textContent = formatCount( 0, cfg );

		whenSeen( el, () => {
			const start = performance.now();
			const duration = 1400;
			const step = ( now ) => {
				const t = Math.min( 1, ( now - start ) / duration );
				const eased = 1 - Math.pow( 1 - t, 3 );

				el.textContent = t < 1 ? formatCount( cfg.to * eased, cfg ) : final;

				if ( t < 1 ) {
					requestAnimationFrame( step );
				}
			};

			requestAnimationFrame( step );
		} );
	}

	// ---------------------------------------------------------------- data table
	function initTable( wrap ) {
		if ( wrap.rfTable ) {
			return;
		}

		wrap.rfTable = true;

		let cfg = {};

		try {
			cfg = JSON.parse( wrap.getAttribute( 'data-rf-table' ) || '{}' );
		} catch ( e ) {}

		const table = wrap.querySelector( '.rf-table' );
		const body = table && table.tBodies[ 0 ];

		if ( ! body ) {
			return;
		}

		const rows = Array.from( body.rows );
		const search = wrap.querySelector( '.rf-table-tools input' );
		const pager = wrap.querySelector( '.rf-table-pager' );
		const empty = wrap.querySelector( '.rf-table__empty' );
		const perPage = Math.max( 0, Number( cfg.perPage ) || 0 );
		let order = rows.slice();
		let page = 0;

		const render = () => {
			const query = search ? search.value.trim().toLowerCase() : '';
			const shown = order.filter( ( r ) => ! query || r.textContent.toLowerCase().includes( query ) );
			const pages = perPage ? Math.max( 1, Math.ceil( shown.length / perPage ) ) : 1;

			page = Math.min( page, pages - 1 );

			const from = perPage ? page * perPage : 0;
			const visible = new Set( perPage ? shown.slice( from, from + perPage ) : shown );

			order.forEach( ( r ) => {
				body.appendChild( r );
				r.hidden = ! visible.has( r );
			} );

			if ( empty ) {
				empty.hidden = shown.length > 0;
			}

			if ( pager ) {
				pager.innerHTML = '';
				pager.hidden = pages < 2;

				const button = ( label, to, current, disabled, aria ) => {
					const b = document.createElement( 'button' );
					b.type = 'button';
					b.textContent = label;
					b.disabled = !! disabled;

					if ( aria ) {
						b.setAttribute( 'aria-label', aria );
					}

					if ( current ) {
						b.setAttribute( 'aria-current', 'page' );
					}

					b.addEventListener( 'click', () => {
						page = to;
						render();
					} );
					pager.appendChild( b );
				};

				button( '‹', page - 1, false, 0 === page, 'Previous page' );

				for ( let p = 0; p < pages; p++ ) {
					button( String( p + 1 ), p, p === page, false, `Page ${ p + 1 }` );
				}

				button( '›', page + 1, false, page >= pages - 1, 'Next page' );
			}
		};

		if ( cfg.sortable ) {
			table.querySelectorAll( '.rf-table__sort' ).forEach( ( btn ) => {
				btn.addEventListener( 'click', () => {
					const col = Number( btn.getAttribute( 'data-col' ) );
					const th = btn.closest( 'th' );
					const dir = 'ascending' === th.getAttribute( 'aria-sort' ) ? 'descending' : 'ascending';

					table.querySelectorAll( 'th[aria-sort]' ).forEach( ( h ) => h.setAttribute( 'aria-sort', 'none' ) );
					th.setAttribute( 'aria-sort', dir );

					// A cell found by its column (cells can span several columns, so their position is not the column).
					const key = ( r ) => {
						const c = r.querySelector( `td[data-col="${ col }"]` ) || r.cells[ col ];

						return c ? c.getAttribute( 'data-sort' ) || c.textContent.trim() : '';
					};
					const factor = 'ascending' === dir ? 1 : -1;

					order = rows.slice().sort( ( a, b ) => {
						const x = key( a );
						const y = key( b );
						// Numbers (data-sort holds the plain number of a number, progress or date cell) sort as numbers.
						const nx = '' === x ? NaN : Number( x );
						const ny = '' === y ? NaN : Number( y );

						if ( ! isNaN( nx ) && ! isNaN( ny ) ) {
							return ( nx - ny ) * factor;
						}

						return x.localeCompare( y, undefined, { numeric: true, sensitivity: 'base' } ) * factor;
					} );
					page = 0;
					render();
				} );
			} );
		}

		if ( search ) {
			search.addEventListener( 'input', () => {
				page = 0;
				render();
			} );
		}

		render();
	}

	function scan( scope ) {
		const root = scope || document;

		root.querySelectorAll( '[data-rf-chart]' ).forEach( initChart );
		root.querySelectorAll( '[data-rf-count]' ).forEach( initStat );
		root.querySelectorAll( '[data-rf-table]' ).forEach( initTable );
	}

	function hookIntoEditor( tries ) {
		const fe = window.refractionFrontend;

		if ( fe && fe.hooks ) {
			[ 'refraction-chart', 'refraction-data-table', 'refraction-stat-card' ].forEach( ( name ) => {
				fe.hooks.addAction( `frontend/element_ready/${ name }.default`, ( $scope ) => $scope && $scope[ 0 ] && scan( $scope[ 0 ] ) );
			} );
			return;
		}

		if ( tries < 100 ) {
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

/**
 * Front end of the Loop Builder widgets: pagination links, load more, infinite load, the Taxonomy Filter,
 * the Portfolio filter and masonry layout, and the Loop Carousel. Server work goes through the REST endpoint
 * whose URL and nonce the page prints in `window.refractionLoop`; the context token on each `.refraction-loop`
 * tells the server which widget to rebuild. Without JavaScript the pagination links still work as links.
 */
( function ( $ ) {
	const config = window.refractionLoop || {};
	const i18n = config.i18n || {};
	const state = new WeakMap();

	const stateOf = ( loop ) => {
		if ( ! state.has( loop ) ) {
			state.set( loop, { filter: null, busy: false, observer: null } );
		}

		return state.get( loop );
	};

	const announce = ( loop, text ) => {
		const status = loop.querySelector( '.refraction-loop-status' );

		if ( status ) {
			status.textContent = text;
		}
	};

	const refreshHandlers = ( container, nodes ) => {
		const frontend = window.refractionFrontend;

		if ( ! frontend || ! frontend.elementsHandler ) {
			return;
		}

		nodes.forEach( ( node ) => {
			if ( 1 !== node.nodeType ) {
				return;
			}

			[ node, ...node.querySelectorAll( '[data-element_type]' ) ].forEach( ( element ) => {
				if ( element.getAttribute && element.getAttribute( 'data-element_type' ) ) {
					frontend.elementsHandler.runReadyTrigger( element );
				}
			} );
		} );
	};

	// --- Masonry ---------------------------------------------------------------------------------------
	const layoutMasonry = ( loop ) => {
		if ( ! loop.classList.contains( 'refraction-portfolio--masonry' ) ) {
			return;
		}

		const items = loop.querySelector( '.refraction-loop-items' );

		if ( ! items ) {
			return;
		}

		const rowGap = parseFloat( getComputedStyle( items ).rowGap ) || 0;

		items.style.gridAutoRows = '1px';

		items.querySelectorAll( '.refraction-portfolio-item' ).forEach( ( item ) => {
			item.style.gridRowEnd = '';

			if ( item.hidden ) {
				return;
			}

			item.style.gridRowEnd = 'span ' + Math.ceil( item.getBoundingClientRect().height + rowGap );
		} );
	};

	const watchMasonry = ( loop ) => {
		if ( ! loop.classList.contains( 'refraction-portfolio--masonry' ) ) {
			return;
		}

		const run = () => layoutMasonry( loop );

		loop.querySelectorAll( 'img' ).forEach( ( img ) => {
			if ( ! img.complete ) {
				img.addEventListener( 'load', run, { once: true } );
			}
		} );

		if ( window.ResizeObserver ) {
			const observer = new ResizeObserver( run );
			observer.observe( loop.querySelector( '.refraction-loop-items' ) );
		}

		window.addEventListener( 'resize', run );
		run();
	};

	// --- Portfolio filter (client side) --------------------------------------------------------------
	const initPortfolioFilter = ( loop ) => {
		const bar = loop.querySelector( '.refraction-portfolio-filter' );

		if ( ! bar ) {
			return;
		}

		bar.addEventListener( 'click', ( event ) => {
			const button = event.target.closest( '.refraction-portfolio-filter__item' );

			if ( ! button ) {
				return;
			}

			const term = button.getAttribute( 'data-filter-term' );

			bar.querySelectorAll( '.refraction-portfolio-filter__item' ).forEach( ( item ) => {
				const active = item === button;

				item.classList.toggle( 'is-active', active );
				item.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
			} );

			loop.querySelectorAll( '.refraction-portfolio-item' ).forEach( ( item ) => {
				const terms = ( item.getAttribute( 'data-terms' ) || '' ).split( ' ' );

				item.hidden = !! term && ! terms.includes( term );
			} );

			layoutMasonry( loop );
		} );
	};

	// --- Server driven lists -------------------------------------------------------------------------
	const request = ( loop, page ) => {
		const current = stateOf( loop );

		return fetch( config.restUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-Refraction-Nonce': config.nonce },
			body: JSON.stringify( { token: loop.getAttribute( 'data-token' ), page, filter: current.filter } ),
		} ).then( ( response ) => {
			if ( ! response.ok ) {
				throw new Error( 'http ' + response.status );
			}

			return response.json();
		} );
	};

	const toNodes = ( html ) => {
		const template = document.createElement( 'template' );

		template.innerHTML = html;

		return Array.from( template.content.childNodes );
	};

	const apply = ( loop, result, append ) => {
		const itemsBox = loop.querySelector( '.refraction-loop-items' );
		const pagination = loop.querySelector( '.refraction-loop-pagination' );
		const empty = loop.querySelector( '.refraction-loop-empty' );
		const nodes = toNodes( result.items );

		if ( ! append ) {
			itemsBox.replaceChildren();
		}

		nodes.forEach( ( node ) => itemsBox.appendChild( node ) );
		itemsBox.hidden = 0 === itemsBox.children.length;

		if ( empty ) {
			empty.hidden = 0 !== itemsBox.children.length;
		}

		if ( pagination ) {
			pagination.innerHTML = result.pagination;
		}

		loop.setAttribute( 'data-page', String( result.page ) );
		loop.setAttribute( 'data-total', String( result.total ) );
		refreshHandlers( itemsBox, nodes );
		watchInfinite( loop );
	};

	const load = ( loop, page, append ) => {
		const current = stateOf( loop );

		if ( current.busy ) {
			return Promise.resolve();
		}

		current.busy = true;
		loop.classList.add( 'is-loading' );
		loop.setAttribute( 'aria-busy', 'true' );

		return request( loop, page )
			.then( ( result ) => {
				apply( loop, result, append );
				announce( loop, append ? i18n.loaded : i18n.filtered );
			} )
			.catch( () => {
				announce( loop, i18n.error );
				loop.classList.add( 'has-error' );
			} )
			.finally( () => {
				current.busy = false;
				loop.classList.remove( 'is-loading' );
				loop.removeAttribute( 'aria-busy' );
			} );
	};

	function watchInfinite( loop ) {
		const current = stateOf( loop );

		if ( current.observer ) {
			current.observer.disconnect();
			current.observer = null;
		}

		const more = loop.querySelector( '.refraction-loop-more' );

		if ( 'infinite' !== loop.getAttribute( 'data-pagination' ) || ! more || ! window.IntersectionObserver ) {
			return;
		}

		current.observer = new IntersectionObserver( ( entries ) => {
			if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
				load( loop, parseInt( more.getAttribute( 'data-page' ), 10 ), true );
			}
		}, { rootMargin: '200px' } );
		current.observer.observe( more );
	}

	const initServerList = ( loop ) => {
		if ( ! loop.getAttribute( 'data-token' ) || ! config.restUrl ) {
			return;
		}

		loop.addEventListener( 'click', ( event ) => {
			const more = event.target.closest( '.refraction-loop-more' );
			const link = event.target.closest( '.refraction-pagination a[data-page]' );

			if ( more ) {
				event.preventDefault();
				load( loop, parseInt( more.getAttribute( 'data-page' ), 10 ), true );
			} else if ( link ) {
				event.preventDefault();
				load( loop, parseInt( link.getAttribute( 'data-page' ), 10 ), false ).then( () => {
					const top = loop.getBoundingClientRect().top;

					if ( top < 0 ) {
						loop.scrollIntoView( { behavior: 'smooth', block: 'start' } );
					}
				} );
			}
		} );

		loop.addEventListener( 'keydown', ( event ) => {
			if ( ( 'Enter' === event.key || ' ' === event.key ) && event.target.matches( '.refraction-loop-more' ) ) {
				event.preventDefault();
				event.target.click();
			}
		} );

		watchInfinite( loop );
	};

	// --- Taxonomy Filter -----------------------------------------------------------------------------
	const findTarget = ( bar ) => {
		const id = bar.getAttribute( 'data-target' );

		if ( id ) {
			const wrapper = document.getElementById( id );

			return wrapper ? ( wrapper.matches( '.refraction-loop' ) ? wrapper : wrapper.querySelector( '.refraction-loop' ) ) : null;
		}

		return document.querySelector( '.refraction-loop[data-filterable="1"]' );
	};

	const initTaxonomyFilter = ( bar ) => {
		bar.addEventListener( 'click', ( event ) => {
			const button = event.target.closest( '.refraction-taxonomy-filter__item' );
			const loop = findTarget( bar );

			if ( ! button || ! loop ) {
				return;
			}

			const termId = parseInt( button.getAttribute( 'data-term-id' ), 10 ) || 0;

			bar.querySelectorAll( '.refraction-taxonomy-filter__item' ).forEach( ( item ) => {
				const active = item === button;

				item.classList.toggle( 'is-active', active );
				item.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
			} );

			stateOf( loop ).filter = termId ? { taxonomy: bar.getAttribute( 'data-taxonomy' ), term_id: termId } : null;
			load( loop, 1, false );
		} );
	};

	// --- Wiring ----------------------------------------------------------------------------------------
	const register = () => {
		const frontend = window.refractionFrontend;
		const hooks = frontend.hooks;

		[ 'posts', 'archive-posts', 'loop-grid', 'portfolio' ].forEach( ( name ) => {
			hooks.addAction( `frontend/element_ready/${ name }.default`, ( $scope ) => {
				const loop = $scope[ 0 ].querySelector( '.refraction-loop' );

				if ( ! loop ) {
					return;
				}

				initServerList( loop );
				initPortfolioFilter( loop );
				watchMasonry( loop );
			} );
		} );

		hooks.addAction( 'frontend/element_ready/taxonomy-filter.default', ( $scope ) => {
			const bar = $scope[ 0 ].querySelector( '.refraction-taxonomy-filter' );

			if ( bar ) {
				initTaxonomyFilter( bar );
			}
		} );

		const Base = window.refractionModules && window.refractionModules.frontend.handlers.CarouselBase;

		if ( Base ) {
			class LoopCarousel extends Base {
				getDefaultSettings() {
					const settings = super.getDefaultSettings();

					settings.selectors.carousel = '.refraction-loop-carousel-wrapper';

					return settings;
				}
			}

			hooks.addAction( 'frontend/element_ready/loop-carousel.default', ( $element ) => {
				frontend.elementsHandler.addHandler( LoopCarousel, { $element, elementName: 'loop-carousel.default' } );
			} );
		}
	};

	if ( window.refractionFrontend && window.refractionFrontend.hooks ) {
		register();
	} else {
		$( window ).on( 'refraction/frontend/init', register );
	}
}( window.jQuery ) );

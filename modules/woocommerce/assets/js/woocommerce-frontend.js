/**
 * Front end of the WooCommerce widgets: gallery thumbnails and zoom, Menu Cart panel and numbers, and adding to
 * the cart without leaving the page. Plain DOM code with event delegation, so it also works for widgets the
 * editor preview adds later. jQuery is only used to listen to WooCommerce's own events.
 */
( function () {
	const config = window.refractionWoo || { i18n: {} };
	const $ = window.jQuery;

	// --- Product Images ---------------------------------------------------------------------------------
	const showSlide = ( root, index ) => {
		root.querySelectorAll( '.refraction-product-images__slide' ).forEach( ( slide ) => {
			slide.classList.toggle( 'is-active', Number( slide.dataset.index || 0 ) === index );
		} );

		root.querySelectorAll( '.refraction-product-images__thumb' ).forEach( ( thumb ) => {
			const active = Number( thumb.dataset.index ) === index;

			thumb.classList.toggle( 'is-active', active );
			thumb.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
		} );
	};

	document.addEventListener( 'click', ( event ) => {
		const thumb = event.target.closest( '.refraction-product-images__thumb' );

		if ( thumb ) {
			showSlide( thumb.closest( '.refraction-product-images' ), Number( thumb.dataset.index ) );
		}
	} );

	document.addEventListener( 'mousemove', ( event ) => {
		const slide = event.target.closest && event.target.closest( '.has-zoom .refraction-product-images__slide' );

		if ( slide ) {
			const box = slide.getBoundingClientRect();

			slide.style.setProperty( '--refraction-zoom-x', ( ( event.clientX - box.left ) / box.width * 100 ) + '%' );
			slide.style.setProperty( '--refraction-zoom-y', ( ( event.clientY - box.top ) / box.height * 100 ) + '%' );
		}
	} );

	// --- Menu Cart --------------------------------------------------------------------------------------
	const closeCart = ( cart ) => {
		const panel = cart.querySelector( '.refraction-menu-cart__panel' );
		const overlay = cart.querySelector( '.refraction-menu-cart__overlay' );
		const toggle = cart.querySelector( '.refraction-menu-cart__toggle' );

		if ( panel ) {
			panel.hidden = true;
		}

		if ( overlay ) {
			overlay.hidden = true;
		}

		if ( toggle ) {
			toggle.setAttribute( 'aria-expanded', 'false' );
		}
	};

	const openCart = ( cart ) => {
		const panel = cart.querySelector( '.refraction-menu-cart__panel' );
		const overlay = cart.querySelector( '.refraction-menu-cart__overlay' );
		const toggle = cart.querySelector( '.refraction-menu-cart__toggle' );

		document.querySelectorAll( '.refraction-menu-cart' ).forEach( ( other ) => other !== cart && closeCart( other ) );
		panel.hidden = false;

		if ( overlay ) {
			overlay.hidden = false;
		}

		toggle.setAttribute( 'aria-expanded', 'true' );
	};

	document.addEventListener( 'click', ( event ) => {
		const toggle = event.target.closest( '.refraction-menu-cart__toggle' );

		if ( toggle ) {
			const cart = toggle.closest( '.refraction-menu-cart' );

			if ( 'none' !== cart.dataset.mode ) {
				event.preventDefault();
				cart.querySelector( '.refraction-menu-cart__panel' ).hidden ? openCart( cart ) : closeCart( cart );
			}

			return;
		}

		if ( event.target.closest( '.refraction-menu-cart__close' ) || event.target.closest( '.refraction-menu-cart__overlay' ) ) {
			closeCart( event.target.closest( '.refraction-menu-cart' ) );
			return;
		}

		// A click outside any open dropdown closes it.
		document.querySelectorAll( '.refraction-menu-cart[data-mode="dropdown"]' ).forEach( ( cart ) => {
			if ( ! cart.contains( event.target ) ) {
				closeCart( cart );
			}
		} );
	} );

	document.addEventListener( 'keydown', ( event ) => {
		if ( 'Escape' === event.key ) {
			document.querySelectorAll( '.refraction-menu-cart' ).forEach( closeCart );
		}
	} );

	/** Copy the count and total of the hidden data element WooCommerce's cart fragments refresh into every Menu Cart. */
	const refreshCartNumbers = () => {
		const data = document.querySelector( '.refraction-cart-data' );

		if ( ! data ) {
			return;
		}

		const count = Number( data.dataset.count || 0 );

		document.querySelectorAll( '.refraction-menu-cart' ).forEach( ( cart ) => {
			const badge = cart.querySelector( '.refraction-menu-cart__count' );
			const total = cart.querySelector( '.refraction-menu-cart__total' );

			if ( badge ) {
				badge.textContent = String( count );
				badge.hidden = 0 === count && badge.dataset.hideEmpty === '1';
			}

			if ( total ) {
				total.innerHTML = data.dataset.total || '';
			}
		} );
	};

	// --- Add to Cart without leaving the page ------------------------------------------------------------
	document.addEventListener( 'submit', ( event ) => {
		const form = event.target;
		const box = form.closest && form.closest( '.refraction-add-to-cart[data-ajax-add="yes"]' );

		if ( ! box || ! form.matches( 'form.cart' ) || ! window.fetch || ! window.FormData ) {
			return;
		}

		event.preventDefault();

		const notices = box.querySelector( '.refraction-add-to-cart__notices' );
		const data = new FormData( form );

		if ( event.submitter && event.submitter.name ) {
			data.append( event.submitter.name, event.submitter.value );
		}

		box.classList.add( 'is-busy' );

		if ( notices ) {
			notices.textContent = config.i18n.adding || '';
		}

		fetch( form.getAttribute( 'action' ) || window.location.href, { method: 'POST', body: data, credentials: 'same-origin' } )
			.then( ( response ) => response.text().then( ( html ) => ( { html, url: response.url, ok: response.ok } ) ) )
			.then( ( result ) => {
				const doc = new DOMParser().parseFromString( result.html, 'text/html' );
				// Classic themes print .woocommerce-message and friends, block themes print notice banners: take whatever the wrapper holds.
				const found = Array.from( doc.querySelectorAll( '.woocommerce-notices-wrapper > *' ) ).filter( ( node ) => node.textContent.trim() );
				const error = doc.querySelector( '.woocommerce-notices-wrapper .woocommerce-error, .woocommerce-notices-wrapper .is-error' );

				// The store redirects to the cart after adding when that option is on.
				if ( ! error && result.ok && /\/cart\/?(\?|$)/.test( result.url ) && ! /\/cart\/?(\?|$)/.test( window.location.href ) ) {
					window.location.href = result.url;
					return;
				}

				if ( notices ) {
					notices.replaceChildren( ...found.map( ( node ) => document.importNode( node, true ) ) );

					if ( ! found.length ) {
						const message = document.createElement( 'div' );

						message.className = result.ok ? 'woocommerce-message' : 'woocommerce-error';
						message.textContent = result.ok ? config.i18n.added : config.i18n.error;
						notices.replaceChildren( message );
					}
				}

				if ( $ && ! error ) {
					$( document.body ).trigger( 'wc_fragment_refresh' );
				}
			} )
			.catch( () => {
				if ( notices ) {
					notices.textContent = config.i18n.error || '';
				}
			} )
			.finally( () => box.classList.remove( 'is-busy' ) );
	} );

	// --- WooCommerce events -----------------------------------------------------------------------------
	if ( $ ) {
		$( document.body ).on( 'wc_fragments_loaded wc_fragments_refreshed removed_from_cart added_to_cart', refreshCartNumbers );
		$( document.body ).on( 'found_variation reset_image', 'form.variations_form', function () {
			const root = this.closest( '.product, body' ).querySelector( '.refraction-product-images' );

			if ( root ) {
				showSlide( root, 0 );
			}
		} );
	}
}() );

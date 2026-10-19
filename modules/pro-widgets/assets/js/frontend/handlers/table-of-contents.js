import { buildOutline, slugify, uniqueId } from './toc-logic.mjs';

/**
 * Table of Contents: scans the page for headings, gives them stable unique ids, builds a nested list with
 * hierarchical numbers, scrolls smoothly (never for reduced motion), marks the current section and manages
 * the collapse button.
 */
const AUTO_CONTAINERS = [ '.refraction-widget-theme-post-content', '.entry-content', '.post-content', 'article', 'main' ];

export default class TableOfContents extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				toc: '.refraction-toc',
				nav: '.refraction-toc__nav',
				toggle: '.refraction-toc__toggle',
				body: '.refraction-toc__body',
				empty: '.refraction-toc__empty',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$toc: this.$element.find( selectors.toc ),
			$nav: this.$element.find( selectors.nav ),
			$toggle: this.$element.find( selectors.toggle ),
			$body: this.$element.find( selectors.body ),
			$empty: this.$element.find( selectors.empty ),
		};
	}

	onInit() {
		super.onInit();

		this.items = [];
		this.doc = this.elements.$toc[ 0 ]?.ownerDocument || document;
		this.win = this.doc.defaultView || window;

		if ( ! this.elements.$toc.length ) {
			return;
		}

		this.build();
	}

	bindEvents() {
		this.elements.$toggle.on( 'click', this.onToggle.bind( this ) );
		this.elements.$nav.on( 'click', '.refraction-toc__link', this.onLinkClick.bind( this ) );
	}

	onDestroy() {
		super.onDestroy();
		this.unobserve();
	}

	onElementChange( propertyName ) {
		if ( /^(headings|container_selector|exclude_selector|highlight_active)$/.test( propertyName ) ) {
			this.build();
		}
	}

	/* ---------------------------------------------------------------- scanning */
	findContainer() {
		const custom = String( this.getElementSettings( 'container_selector' ) || '' ).trim();

		if ( custom ) {
			try {
				return this.doc.querySelector( custom );
			} catch ( e ) {
				return null;
			}
		}

		for ( const selector of AUTO_CONTAINERS ) {
			const found = this.doc.querySelector( selector );

			if ( found ) {
				return found;
			}
		}

		return this.doc.body;
	}

	collectHeadings() {
		const container = this.findContainer();
		const levels = ( this.getElementSettings( 'headings' ) || [] ).filter( ( h ) => /^h[1-6]$/.test( h ) );

		if ( ! container || ! levels.length ) {
			return [];
		}

		const exclude = String( this.getElementSettings( 'exclude_selector' ) || '' ).trim();
		let nodes = Array.from( container.querySelectorAll( levels.join( ',' ) ) );

		nodes = nodes.filter( ( node ) => {
			// Never list the headings of a Table of Contents widget (this one or another) or ignored ones.
			if ( node.closest( '.refraction-toc, .refraction-toc-ignore' ) ) {
				return false;
			}

			try {
				return ! ( exclude && node.matches( exclude ) );
			} catch ( e ) {
				return true;
			}
		} );

		return nodes;
	}

	build() {
		const nodes = this.collectHeadings();
		const used = new Set( Array.from( this.doc.querySelectorAll( '[id]' ) ).map( ( el ) => el.id ) );

		// A heading keeps the id it has; others get one from their text, unique on the page.
		const raw = nodes.map( ( node ) => {
			if ( ! node.id ) {
				node.id = uniqueId( slugify( node.textContent ), used );
				used.add( node.id );
			}

			return { level: parseInt( node.tagName.substring( 1 ), 10 ), text: node.textContent, id: node.id, node };
		} );

		this.items = buildOutline( raw );

		this.render();
		this.observeSections();
	}

	/* --------------------------------------------------------------- rendering */
	render() {
		const nav = this.elements.$nav[ 0 ],
			toc = this.elements.$toc[ 0 ];

		nav.textContent = '';

		const empty = 0 === this.items.length;
		const hideWhenEmpty = 'yes' === toc.dataset.hideEmpty;

		// Hiding is done on the widget; in the editor the box stays so the widget can still be selected.
		toc.classList.toggle( 'is-empty-hidden', empty && hideWhenEmpty && ! this.isEditMode() );
		this.elements.$empty.prop( 'hidden', ! empty );
		this.elements.$nav.prop( 'hidden', empty );

		if ( empty ) {
			return;
		}

		const root = this.doc.createElement( 'ol' );

		root.className = 'refraction-toc__list';

		const lists = [ root ];
		let lastItem = null;

		this.items.forEach( ( item ) => {
			while ( lists.length - 1 > item.depth ) {
				lists.pop();
			}

			while ( lists.length - 1 < item.depth ) {
				const nested = this.doc.createElement( 'ol' );

				nested.className = 'refraction-toc__list';
				( lastItem || lists[ lists.length - 1 ] ).appendChild( nested );
				lists.push( nested );
			}

			const li = this.doc.createElement( 'li' ),
				link = this.doc.createElement( 'a' ),
				number = this.doc.createElement( 'span' ),
				text = this.doc.createElement( 'span' );

			li.className = 'refraction-toc__item';
			link.className = 'refraction-toc__link';
			link.href = `#${ item.id }`;
			link.dataset.target = item.id;
			number.className = 'refraction-toc__number';
			number.textContent = item.number;
			text.className = 'refraction-toc__text';
			text.textContent = item.text;
			link.append( number, text );
			li.appendChild( link );
			lists[ lists.length - 1 ].appendChild( li );
			lastItem = li;
		} );

		nav.appendChild( root );
	}

	isEditMode() {
		return !! ( window.refractionFrontend && refractionFrontend.isEditMode && refractionFrontend.isEditMode() );
	}

	/* ------------------------------------------------------------ interactions */
	onToggle() {
		const toggle = this.elements.$toggle[ 0 ],
			open = 'true' !== toggle.getAttribute( 'aria-expanded' );

		toggle.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
		this.elements.$body.prop( 'hidden', ! open );
		this.elements.$toc.toggleClass( 'is-collapsed', ! open );
	}

	getOffset() {
		const value = refractionFrontend.utils.controls
			? refractionFrontend.utils.controls.getResponsiveControlValue( this.getElementSettings(), 'scroll_offset', 'size' )
			: this.getElementSettings( 'scroll_offset' )?.size;

		return Number( value ) || 0;
	}

	onLinkClick( event ) {
		const id = event.currentTarget.dataset.target,
			target = this.doc.getElementById( id );

		if ( ! target ) {
			return;
		}

		event.preventDefault();

		const reduce = !! ( this.win.matchMedia && this.win.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ),
			smooth = 'yes' === this.getElementSettings( 'smooth_scroll' ) && ! reduce,
			top = target.getBoundingClientRect().top + ( this.win.pageYOffset || this.doc.documentElement.scrollTop ) - this.getOffset();

		this.win.scrollTo( { top: Math.max( 0, top ), behavior: smooth ? 'smooth' : 'auto' } );

		// Keyboard and screen reader users land on the heading.
		if ( ! target.hasAttribute( 'tabindex' ) ) {
			target.setAttribute( 'tabindex', '-1' );
		}

		target.focus( { preventScroll: true } );

		if ( ! this.isEditMode() && this.win.history && this.win.history.pushState ) {
			try {
				this.win.history.pushState( null, '', `#${ id }` );
			} catch ( e ) {
				// A sandboxed frame may refuse; scrolling already worked.
			}
		}

		this.setActive( id );
	}

	/** The current section is the last heading that has passed the top line (scroll position based, rAF throttled). */
	observeSections() {
		this.unobserve();

		if ( 'yes' !== this.getElementSettings( 'highlight_active' ) || ! this.items.length ) {
			return;
		}

		this.frame = null;
		this.onScroll = () => {
			if ( null === this.frame ) {
				this.frame = this.win.requestAnimationFrame( () => {
					this.frame = null;
					this.updateActive();
				} );
			}
		};

		this.win.addEventListener( 'scroll', this.onScroll, { passive: true } );
		this.win.addEventListener( 'resize', this.onScroll );
		this.updateActive();
	}

	unobserve() {
		if ( this.onScroll ) {
			this.win.removeEventListener( 'scroll', this.onScroll );
			this.win.removeEventListener( 'resize', this.onScroll );
			this.win.cancelAnimationFrame( this.frame );
			this.onScroll = null;
		}
	}

	updateActive() {
		const line = this.getOffset() + 4;
		let current = null;

		for ( const item of this.items ) {
			const el = this.doc.getElementById( item.id );

			if ( el && el.getBoundingClientRect().top <= line ) {
				current = item.id;
			} else if ( el ) {
				break;
			}
		}

		this.setActive( current );
	}

	setActive( id ) {
		this.elements.$nav.find( '.refraction-toc__link' ).each( ( i, link ) => {
			if ( id && link.dataset.target === id ) {
				link.setAttribute( 'aria-current', 'location' );
			} else {
				link.removeAttribute( 'aria-current' );
			}
		} );
	}
}

import Base from 'refraction-frontend/handlers/base';

/**
 * Sidebar Panel (0.129.0). Docked and floating panels are fixed to their edge; when "Move the page aside" is on, the
 * page gets room for them through a padding on <body> (one per side, the widest panel wins). Below the chosen screen
 * size the panel folds into a button that opens it as a drawer. In Edit Mode the same happens (the preview is the
 * page), and a folded drawer stays open when "Keep the drawer open in Edit Mode" is on so its content can be edited.
 */
const pushes = { left: new Map(), right: new Map() };

const applyPush = ( side ) => {
	const sizes = Array.from( pushes[ side ].values() ),
		size = sizes.length ? Math.max( ...sizes ) : 0,
		body = document.body;

	if ( size ) {
		body.style.setProperty( `--rf-sbp-push-${ side }`, size + 'px' );
		body.classList.add( `rf-sbp-push-${ side }` );
	} else {
		body.style.removeProperty( `--rf-sbp-push-${ side }` );
		body.classList.remove( `rf-sbp-push-${ side }` );
	}
};

// A widget drawn again in Edit Mode gets a new handler; the one before it lets go of the page first.
const live = new Map();
let uid = 0;

export default class SidebarPanel extends Base {
	getDefaultSettings() {
		return { selectors: { root: '.rf-sbp' } };
	}

	onInit() {
		super.onInit();

		this.uid = ++uid;

		const key = this.$element[ 0 ].dataset.id || String( this.uid );

		if ( live.get( key ) && live.get( key ) !== this ) {
			live.get( key ).teardown();
		}

		live.set( key, this );
		this.setup();
	}

	setup() {
		this.teardown();

		this.root = this.$element[ 0 ].querySelector( '.rf-sbp' );

		if ( ! this.root ) {
			return;
		}

		const d = this.root.dataset;

		this.side = 'right' === d.side ? 'right' : 'left';
		this.look = d.look || 'docked';
		this.push = 'yes' === d.push && 'inline' !== this.look;
		this.collapse = d.collapse || 'tablet';
		this.previewOpen = this.isEdit && 'no' !== d.previewOpen;
		this.panel = this.root.querySelector( '.rf-sbp__panel' );
		this.toggle = this.root.querySelector( '.rf-sbp__toggle' );
		this.overlay = this.root.querySelector( '.rf-sbp__overlay' );
		this.closeBtn = this.root.querySelector( '.rf-sbp__close' );
		this.isOpen = false;

		this.onToggle = () => ( this.isOpen ? this.close() : this.open() );
		this.onClose = () => this.close();
		this.onKey = ( event ) => {
			if ( 'Escape' === event.key && this.isOpen && ! this.previewOpen ) {
				this.close();
			}
		};
		this.onResize = () => this.update();

		this.toggle.addEventListener( 'click', this.onToggle );
		this.closeBtn.addEventListener( 'click', this.onClose );
		this.overlay.addEventListener( 'click', this.onClose );
		document.addEventListener( 'keydown', this.onKey );
		window.addEventListener( 'resize', this.onResize );

		if ( window.ResizeObserver ) {
			this.observer = new ResizeObserver( () => this.measure() );
			this.observer.observe( this.panel );
		}

		this.update();
	}

	teardown() {
		if ( ! this.root ) {
			return;
		}

		this.toggle.removeEventListener( 'click', this.onToggle );
		this.closeBtn.removeEventListener( 'click', this.onClose );
		this.overlay.removeEventListener( 'click', this.onClose );
		document.removeEventListener( 'keydown', this.onKey );
		window.removeEventListener( 'resize', this.onResize );
		this.observer?.disconnect();
		pushes.left.delete( this.uid );
		pushes.right.delete( this.uid );
		applyPush( 'left' );
		applyPush( 'right' );
		this.root = null;
	}

	breakpoint( name ) {
		const list = window.refractionFrontend?.config?.responsive?.activeBreakpoints || {};

		return list[ name ]?.value || ( 'mobile' === name ? 767 : 1024 );
	}

	isFolded() {
		const width = window.innerWidth;

		switch ( this.collapse ) {
			case 'all':
				return true;
			case 'mobile':
				return width <= this.breakpoint( 'mobile' );
			case 'tablet':
				return width <= this.breakpoint( 'tablet' );
			default:
				return false;
		}
	}

	update() {
		const folded = this.isFolded();

		this.folded = folded;
		this.root.classList.toggle( 'is-folded', folded );

		if ( folded && this.previewOpen ) {
			this.open( false );
		} else if ( ! folded && this.isOpen ) {
			this.close( false );
		}

		this.measure();
	}

	measure() {
		if ( ! this.root ) {
			return;
		}

		pushes.left.delete( this.uid );
		pushes.right.delete( this.uid );

		if ( this.push && ! this.folded ) {
			const gap = 'floating' === this.look ? parseFloat( getComputedStyle( this.root ).getPropertyValue( '--rf-sbp-gap' ) ) || 0 : 0,
				size = Math.round( this.panel.offsetWidth + ( gap * 2 ) );

			if ( size ) {
				pushes[ this.side ].set( this.uid, size );
			}
		}

		applyPush( 'left' );
		applyPush( 'right' );
	}

	open( focus = true ) {
		if ( this.isOpen ) {
			return;
		}

		this.isOpen = true;
		this.returnTo = this.root.ownerDocument.activeElement;
		this.root.classList.add( 'is-open' );
		this.toggle.setAttribute( 'aria-expanded', 'true' );

		if ( ! this.previewOpen ) {
			this.overlay.hidden = false;
		}

		if ( focus ) {
			this.panel.focus( { preventScroll: true } );
		}
	}

	close( restore = true ) {
		if ( ! this.isOpen ) {
			return;
		}

		this.isOpen = false;
		this.root.classList.remove( 'is-open' );
		this.toggle.setAttribute( 'aria-expanded', 'false' );
		this.overlay.hidden = true;

		if ( restore && this.returnTo && document.contains( this.returnTo ) ) {
			this.returnTo.focus( { preventScroll: true } );
		}
	}

	onElementChange() {
		// Layout settings draw the widget again (render_type template); the CSS settings only need a new measure.
		clearTimeout( this.measureTimer );
		this.measureTimer = setTimeout( () => this.measure(), 60 );
	}

	onDestroy() {
		this.teardown();
		super.onDestroy();
	}
}

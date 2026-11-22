import Base from 'refraction-frontend/handlers/base';
import { easing } from 'refraction-frontend/utils/motion-easings';

/**
 * Dynamic Container's Entrance (0.121.0): when the list comes into view its items appear one after another, in sync,
 * and (as chosen) the widgets inside each one after the item. Each part gets its own delay (--rf-dc-d); the CSS moves
 * it from the chosen place (assets/scss/frontend.scss). Once all have appeared the classes go, so hover animations and
 * the widgets' own effects work as before. "Every time": armed again (hidden) once the list has left the screen.
 * In Edit Mode it plays when the widget is drawn and when an Entrance setting changes.
 */
const FROM = {
	'fade-up': ( d ) => [ `translate3d(0, ${ d }px, 0)`, '' ],
	'fade-down': ( d ) => [ `translate3d(0, ${ -d }px, 0)`, '' ],
	'fade-left': ( d ) => [ `translate3d(${ d }px, 0, 0)`, '' ],
	'fade-right': ( d ) => [ `translate3d(${ -d }px, 0, 0)`, '' ],
	fade: () => [ 'none', '' ],
	'zoom-in': () => [ 'scale(0.86)', '' ],
	'zoom-out': () => [ 'scale(1.12)', '' ],
	blur: () => [ 'none', 'blur(12px)' ],
	'flip-up': ( d ) => [ `perspective(900px) translate3d(0, ${ d / 2 }px, 0) rotateX(32deg)`, '' ],
	rise: ( d ) => [ `translate3d(0, ${ d }px, 0) rotate(3deg)`, '' ],
};

export default class DynamicContainer extends Base {
	getDefaultSettings() {
		return { selectors: { list: '.rf-dc' } };
	}

	getDefaultElements() {
		return { $list: this.findElement( this.getSettings( 'selectors' ).list ) };
	}

	options() {
		const s = this.getElementSettings();
		const num = ( v, d, lo, hi ) => Math.max( lo, Math.min( hi, Number.isFinite( Number( v ) ) && '' !== v && null !== v && undefined !== v ? Number( v ) : d ) );

		return {
			effect: FROM[ s.entrance ] ? s.entrance : '',
			parts: [ 'cascade', 'items', 'widgets' ].includes( s.entrance_parts ) ? s.entrance_parts : 'cascade',
			itemGap: num( s.entrance_item_gap, 120, 0, 2000 ),
			innerGap: num( s.entrance_inner_gap, 80, 0, 2000 ),
			duration: num( s.entrance_duration, 700, 100, 3000 ),
			distance: num( s.entrance_distance, 40, 0, 300 ),
			easing: easing( s.entrance_easing || 'glide' ),
			repeat: 'yes' === s.entrance_repeat,
		};
	}

	/** This list's own items (never those of a list inside an item). */
	items() {
		const list = this.elements.$list[ 0 ];

		return list ? Array.from( list.children ).filter( ( el ) => el.classList.contains( 'e-con' ) ) : [];
	}

	/**
	 * The widgets inside an item, in order (not those of a list inside it, nor those with their own entrance).
	 * @param {HTMLElement} item
	 */
	widgetsOf( item ) {
		const list = this.elements.$list[ 0 ];

		return Array.from( item.querySelectorAll( '.refraction-widget' ) ).filter( ( w ) => w.closest( '.rf-dc' ) === list && ! w.hasAttribute( 'data-rf-reveal' ) && ! w.classList.contains( 'refraction-invisible' ) && ! w.closest( '.refraction-invisible' ) );
	}

	/** Marks the parts that appear and gives each its delay; returns how long the whole entrance takes. */
	arm() {
		const o = this.opts;
		const list = this.elements.$list[ 0 ];
		const [ transform, blur ] = FROM[ o.effect ]( o.distance );
		let last = 0;

		list.style.setProperty( '--rf-dc-from', transform );
		list.style.setProperty( '--rf-dc-blur', blur || 'none' );
		list.style.setProperty( '--rf-dc-dur', o.duration + 'ms' );
		list.style.setProperty( '--rf-dc-ease', o.easing );

		const mark = ( el, delay ) => {
			el.classList.add( 'rf-dc-a' );
			el.style.setProperty( '--rf-dc-d', delay + 'ms' );
			this.parts.push( el );
			last = Math.max( last, delay );
		};

		this.items().forEach( ( item, i ) => {
			const start = i * o.itemGap;

			if ( 'widgets' !== o.parts ) {
				mark( item, start );
			}

			if ( 'items' !== o.parts ) {
				const first = 'cascade' === o.parts ? 1 : 0;
				this.widgetsOf( item ).forEach( ( w, k ) => mark( w, start + ( ( k + first ) * o.innerGap ) ) );
			}
		} );

		// Drawn hidden before the transitions apply.
		list.classList.add( 'is-armed' );
		list.classList.remove( 'is-in' );
		void list.offsetWidth; // eslint-disable-line no-void

		return last + o.duration;
	}

	/** Every part back to normal: no entrance classes or delays. */
	disarm() {
		const list = this.elements.$list[ 0 ];

		window.clearTimeout( this.doneTimer );
		( this.parts || [] ).forEach( ( el ) => {
			el.classList.remove( 'rf-dc-a' );
			el.style.removeProperty( '--rf-dc-d' );
		} );
		this.parts = [];

		if ( list ) {
			list.classList.remove( 'is-armed', 'is-in' );
		}
	}

	play() {
		const list = this.elements.$list[ 0 ];
		const total = this.total;

		list.classList.add( 'is-in' );
		this.shown = true;
		window.clearTimeout( this.doneTimer );
		// Played: everything back to normal (hover animations, the widgets' own effects).
		this.doneTimer = window.setTimeout( () => this.disarm(), total + 100 );
	}

	build() {
		this.unbuild();

		const list = this.elements.$list[ 0 ];
		this.opts = this.options();

		if ( ! list || ! this.opts.effect || ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) ) {
			return;
		}

		// Settings > Performance > Animations On The First Screen (0.146.0): on screen when the page opens, the items
		// show at once (no entrance to wait for).
		const first = ! this.built;
		this.built = true;

		if ( first && ! this.isEdit && document.body.classList.contains( 'rf-first-screen' ) ) {
			const r = list.getBoundingClientRect();

			if ( r.height > 0 && r.top < window.innerHeight && r.bottom > 0 ) {
				return;
			}
		}

		this.parts = [];
		this.total = this.arm();
		this.shown = false;

		if ( ! window.IntersectionObserver ) {
			this.play();
			return;
		}

		this.observer = new IntersectionObserver( ( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting && ! this.shown ) {
					this.play();

					if ( ! this.opts.repeat ) {
						this.observer.disconnect();
					}
				} else if ( ! entry.isIntersecting && this.shown && this.opts.repeat && 0 === entry.intersectionRatio ) {
					// Left the screen completely: hidden again (out of sight), ready to play.
					this.disarm();
					this.parts = [];
					this.total = this.arm();
					this.shown = false;
				}
			} );
		}, { threshold: [ 0, 0.15 ] } );
		this.observer.observe( list );
	}

	unbuild() {
		if ( this.observer ) {
			this.observer.disconnect();
			this.observer = null;
		}

		this.disarm();
	}

	onInit( ...args ) {
		super.onInit( ...args );
		// In Edit Mode the items are drawn just after the widget: wait for them.
		this.buildTimer = window.setTimeout( () => this.build(), this.isEdit ? 300 : 0 );
	}

	onDestroy() {
		window.clearTimeout( this.buildTimer );
		this.unbuild();
		super.onDestroy();
	}

	onElementChange( propertyName ) {
		if ( 0 === propertyName.indexOf( 'entrance' ) ) {
			this.build();
		}
	}
}

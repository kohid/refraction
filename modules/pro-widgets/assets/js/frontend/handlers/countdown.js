/**
 * Countdown: due date or per-visitor evergreen timer. All times are absolute (Unix ms), so a throttled
 * background tab catches up on the next tick. Cookies and storage may be blocked; the timer then lives
 * in memory for the page view.
 */
const COOKIE_DAYS = 30;
const SIZES = { days: 86400, hours: 3600, minutes: 60, seconds: 1 };

const readCookie = ( name ) => {
	try {
		const match = document.cookie.split( '; ' ).find( ( row ) => row.startsWith( `${ name }=` ) );

		return match ? decodeURIComponent( match.split( '=' )[ 1 ] ) : null;
	} catch ( e ) {
		return null;
	}
};

const writeCookie = ( name, value ) => {
	try {
		document.cookie = `${ name }=${ encodeURIComponent( value ) }; max-age=${ COOKIE_DAYS * 86400 }; path=/; SameSite=Lax`;
	} catch ( e ) {
		// Cookies are blocked: nothing to remember.
	}
};

const readStorage = ( name ) => {
	try {
		return window.localStorage.getItem( name );
	} catch ( e ) {
		return null;
	}
};

const writeStorage = ( name, value ) => {
	try {
		window.localStorage.setItem( name, value );
	} catch ( e ) {
		// Storage is blocked.
	}
};

export default class Countdown extends refractionModules.frontend.handlers.Base {
	getDefaultSettings() {
		return { selectors: { root: '.refraction-countdown' } };
	}

	getDefaultElements() {
		return { $root: this.$element.find( this.getSettings( 'selectors' ).root ) };
	}

	onInit() {
		super.onInit();

		const root = this.elements.$root[ 0 ];

		if ( ! root ) {
			return;
		}

		this.root = root;
		this.units = ( root.dataset.units || '' ).split( ',' ).filter( Boolean );
		this.action = root.dataset.action || 'none';
		this.expired = root.classList.contains( 'is-expired' );
		this.digits = {};
		root.querySelectorAll( '[data-unit]' ).forEach( ( el ) => {
			this.digits[ el.dataset.unit ] = el;
		} );

		this.end = this.getEnd();

		if ( null === this.end ) {
			this.expire();
			return;
		}

		this.tick();
	}

	onDestroy() {
		super.onDestroy();
		window.clearTimeout( this.timer );
		this.stopped = true;
	}

	getEnd() {
		const dataset = this.root.dataset;

		if ( 'evergreen' !== dataset.type ) {
			const due = parseInt( dataset.due, 10 );

			return Number.isFinite( due ) ? due * 1000 : null;
		}

		const key = dataset.key,
			total = parseInt( dataset.total, 10 ) || 0,
			stored = parseInt( readCookie( key ) || readStorage( key ), 10 );

		if ( Number.isFinite( stored ) && stored > 0 ) {
			return stored;
		}

		const end = Date.now() + total * 1000;

		writeCookie( key, String( end ) );
		writeStorage( key, String( end ) );

		return end;
	}

	tick() {
		if ( this.stopped ) {
			return;
		}

		const left = Math.max( 0, Math.ceil( ( this.end - Date.now() ) / 1000 ) );

		this.render( left );

		if ( 0 === left ) {
			this.expire();
			return;
		}

		// Aim at the next full second so the digits flip on time.
		this.timer = window.setTimeout( () => this.tick(), 1000 - ( Date.now() % 1000 ) + 20 );
	}

	render( seconds ) {
		let rest = seconds;

		this.units.forEach( ( unit ) => {
			const value = Math.floor( rest / SIZES[ unit ] );

			rest -= value * SIZES[ unit ];

			const text = String( value ).padStart( 2, '0' ),
				el = this.digits[ unit ];

			if ( el && el.textContent !== text ) {
				el.textContent = text;
			}
		} );
	}

	expire() {
		const root = this.root;

		if ( this.expiredHandled ) {
			return;
		}

		this.expiredHandled = true;
		root.classList.add( 'is-expired' );
		this.render( 0 );

		const isEdit = !! ( window.refractionFrontend && refractionFrontend.isEditMode && refractionFrontend.isEditMode() );

		if ( 'message' === this.action ) {
			const units = root.querySelector( '.refraction-countdown__units' ),
				message = root.querySelector( '.refraction-countdown__message' );

			if ( ! isEdit ) {
				units?.setAttribute( 'hidden', '' );
			}

			message?.removeAttribute( 'hidden' );
		} else if ( 'redirect' === this.action && root.dataset.redirect && ! isEdit ) {
			try {
				const url = new URL( root.dataset.redirect, window.location.href );

				if ( /^https?:$/.test( url.protocol ) ) {
					window.location.assign( url.href );
				}
			} catch ( e ) {
				// A malformed URL is ignored rather than breaking the page.
			}
		}
	}
}

import Base from 'refraction-frontend/handlers/base';

/**
 * Event Calendar: previous / next / today, the Month, List and Day views, search (on submit and while typing), the
 * month picker under the title, "+N more" on busy days and the preview card on hover or focus with "View event" and
 * "Add to calendar". Views are reloaded from refraction/v1/events/calendar; the newest request wins.
 *
 * Adapted from the calendar of the owner's Community Business Directory plugin.
 */
const EVENT = '.rf-cal-ev, .rf-cal-agenda-ev, .rf-cal-day-card';
const pad = ( n ) => ( n < 10 ? '0' : '' ) + n;
const ymd = ( d ) => d.getFullYear() + '-' + pad( d.getMonth() + 1 ) + '-' + pad( d.getDate() );
const parse = ( s ) => {
	const p = String( s ).split( '-' );
	return new Date( +p[ 0 ], ( +p[ 1 ] || 1 ) - 1, +p[ 2 ] || 1 );
};
const esc = ( s ) => String( s || '' ).replace( /[&<>"]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ c ] ) );
const chevron = ( points ) => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="' + points + '"/></svg>';

/** The CSS variables the preview card takes from its calendar (it sits in <body>, outside the widget). */
const CARD_VARS = [ '--rf-cal-primary', '--rf-cal-warm', '--rf-cal-ink', '--rf-cal-muted', '--rf-cal-line', '--rf-cal-surface', '--rf-cal-radius' ];

export default class EventCalendar extends Base {
	getDefaultSettings() {
		return { selectors: { root: '.rf-cal' } };
	}

	getDefaultElements() {
		return { $root: this.findElement( this.getSettings( 'selectors' ).root ) };
	}

	onInit( ...args ) {
		super.onInit( ...args );

		const cal = this.elements.$root[ 0 ];

		if ( ! cal || cal.rfCal ) {
			return;
		}

		cal.rfCal = true;
		this.cal = cal;
		this.config = JSON.parse( cal.dataset.config || '{}' );
		this.q = cal.querySelector( '.rf-cal-q' );
		this.req = 0;
		this.bind();
	}

	part( name ) {
		return this.cal.querySelector( '.rf-cal-' + name );
	}

	view() {
		return this.cal.dataset.view || 'month';
	}

	query() {
		return this.q ? this.q.value.trim() : '';
	}

	updateTitle() {
		this.part( 'title-text' ).textContent = 'day' === this.view() ? this.cal.dataset.dayTitle : this.cal.dataset.monthTitle;
	}

	load( date ) {
		const mine = ++this.req;
		const c = this.config;
		const url = new URL( c.rest, window.location.href );

		Object.entries( { date, search: this.query(), categories: c.categories || '', week_start: c.week_start, per_day: c.per_day, times: c.times } )
			.forEach( ( [ key, value ] ) => url.searchParams.set( key, value ) );

		this.cal.classList.add( 'is-loading' );
		this.part( 'loader' ).hidden = false;

		return fetch( url.toString(), { credentials: 'same-origin', headers: { Accept: 'application/json' } } )
			.then( ( response ) => ( response.ok ? response.json() : Promise.reject( response.status ) ) )
			.then( ( data ) => {
				if ( mine !== this.req ) {
					return;
				}

				this.cal.dataset.date = data.date;
				this.cal.dataset.monthTitle = data.monthTitle;
				this.cal.dataset.dayTitle = data.dayTitle;
				this.part( 'month' ).innerHTML = data.month;
				this.part( 'agenda' ).innerHTML = data.list;
				this.part( 'day' ).innerHTML = data.day;
				this.updateTitle();

				if ( this.pickerOpen ) {
					this.renderPicker();
				}
			} )
			.catch( () => {} )
			.then( () => {
				if ( mine === this.req ) {
					this.cal.classList.remove( 'is-loading' );
					this.part( 'loader' ).hidden = true;
				}
			} );
	}

	/**
	 * Previous or next: a day in the Day view, a month otherwise (keeping the day of the month where it can).
	 * @param {number} delta -1 or 1.
	 */
	step( delta ) {
		const cur = parse( this.cal.dataset.date );

		if ( 'day' === this.view() ) {
			cur.setDate( cur.getDate() + delta );
		} else {
			const day = cur.getDate();
			cur.setDate( 1 );
			cur.setMonth( cur.getMonth() + delta );
			cur.setDate( Math.min( day, new Date( cur.getFullYear(), cur.getMonth() + 1, 0 ).getDate() ) );
		}

		this.load( ymd( cur ) );
	}

	setView( name ) {
		this.cal.dataset.view = name;
		this.cal.querySelectorAll( '.rf-cal-view' ).forEach( ( b ) => {
			const on = b.dataset.view === name;
			b.classList.toggle( 'is-active', on );
			b.setAttribute( 'aria-selected', on ? 'true' : 'false' );
		} );
		this.part( 'month' ).hidden = 'month' !== name;
		this.part( 'agenda' ).hidden = 'list' !== name;
		this.part( 'day' ).hidden = 'day' !== name;
		this.updateTitle();
		this.closePicker();
	}

	// ---------------------------------------------------------------- the month picker under the title

	renderPicker() {
		const i18n = this.config.i18n || {};
		const { y, m } = this.pickerView;
		const lead = ( new Date( y, m, 1 ).getDay() - this.config.week_start + 7 ) % 7;
		const cur = new Date( y, m, 1 - lead );
		const selected = this.cal.dataset.date;
		const today = ymd( new Date() );
		const days = ( i18n.days || [ 'S', 'M', 'T', 'W', 'T', 'F', 'S' ] );
		let html = '<div class="rf-cal-pk-head"><button type="button" class="rf-cal-pk-nav rf-cal-pk-prev" aria-label="' + esc( i18n.prevMonth ) + '">' + chevron( '15 18 9 12 15 6' ) + '</button>' +
			'<span class="rf-cal-pk-title">' + esc( ( i18n.months || [] )[ m ] || m + 1 ) + ' ' + y + '</span>' +
			'<button type="button" class="rf-cal-pk-nav rf-cal-pk-next" aria-label="' + esc( i18n.nextMonth ) + '">' + chevron( '9 18 15 12 9 6' ) + '</button></div><div class="rf-cal-pk-dows">';

		for ( let i = 0; i < 7; i++ ) {
			html += '<span>' + esc( days[ ( i + this.config.week_start ) % 7 ] ) + '</span>';
		}

		html += '</div><div class="rf-cal-pk-grid">';

		for ( let i = 0; i < 42; i++ ) {
			const key = ymd( cur );
			const cls = 'rf-cal-pk-day' + ( cur.getMonth() !== m ? ' is-other' : '' ) + ( key === today ? ' is-today' : '' ) + ( key === selected ? ' is-sel' : '' );
			html += '<button type="button" class="' + cls + '" data-date="' + key + '">' + cur.getDate() + '</button>';
			cur.setDate( cur.getDate() + 1 );
		}

		this.part( 'picker' ).innerHTML = html + '</div>';
	}

	openPicker() {
		const d = parse( this.cal.dataset.date );
		this.pickerView = { y: d.getFullYear(), m: d.getMonth() };
		this.renderPicker();
		this.part( 'picker' ).classList.add( 'is-open' );
		this.pickerOpen = true;
		this.part( 'title' ).setAttribute( 'aria-expanded', 'true' );
	}

	closePicker() {
		if ( ! this.pickerOpen ) {
			return;
		}

		this.part( 'picker' ).classList.remove( 'is-open' );
		this.pickerOpen = false;
		this.part( 'title' ).setAttribute( 'aria-expanded', 'false' );
	}

	// ---------------------------------------------------------------- the preview card

	card() {
		let pop = document.querySelector( '.rf-cal-pop[data-for="' + this.config.id + '"]' );

		if ( pop ) {
			return pop;
		}

		pop = document.createElement( 'div' );
		pop.className = 'rf-cal-pop';
		pop.dataset.for = this.config.id;
		pop.hidden = true;
		document.body.appendChild( pop );
		pop.addEventListener( 'mouseenter', () => {
			clearTimeout( pop.hideTimer );
			clearTimeout( pop.fadeTimer );
		} );
		pop.addEventListener( 'mouseleave', () => this.hideCard() );
		pop.addEventListener( 'focusout', ( e ) => {
			if ( ! pop.contains( e.relatedTarget ) ) {
				this.hideCard();
			}
		} );
		pop.addEventListener( 'click', ( e ) => {
			const toggle = e.target.closest( '.rf-cal-addcal-toggle' );

			if ( toggle ) {
				e.preventDefault();
				const open = ! toggle.classList.contains( 'is-open' );
				toggle.classList.toggle( 'is-open', open );
				toggle.nextElementSibling.classList.toggle( 'is-open', open );
				toggle.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
			}
		} );

		return pop;
	}

	hideCard() {
		const pop = this.card();
		clearTimeout( pop.hideTimer );
		clearTimeout( pop.fadeTimer );
		pop.hideTimer = setTimeout( () => {
			pop.classList.remove( 'is-shown' );
			pop.fadeTimer = setTimeout( () => {
				pop.hidden = true;
			}, 180 );
		}, 140 );
	}

	showCard( ev ) {
		const pop = this.card();
		const i18n = this.config.i18n || {};
		const style = getComputedStyle( this.cal );
		let links = {};

		try {
			links = JSON.parse( ev.dataset.cal || '{}' );
		} catch ( e ) {}

		clearTimeout( pop.hideTimer );
		clearTimeout( pop.fadeTimer );
		CARD_VARS.forEach( ( name ) => pop.style.setProperty( name, style.getPropertyValue( name ) ) );
		pop.style.setProperty( '--ev', ev.style.getPropertyValue( '--ev' ) );

		const title = ev.querySelector( '.rf-cal-ev-title, .rf-cal-agenda-title, .rf-cal-day-title' );
		let html = ev.dataset.thumb ? '<div class="rf-cal-pop-img" style="background-image:url(\'' + esc( ev.dataset.thumb ).replace( /'/g, '%27' ) + '\')"></div>' : '';
		html += '<div class="rf-cal-pop-body">';
		html += '<div class="rf-cal-pop-time">' + esc( [ ev.dataset.date, ev.dataset.time ].filter( Boolean ).join( ' · ' ) ) + '</div>';
		html += '<div class="rf-cal-pop-title">' + esc( title ? title.textContent : '' ) + '</div>';
		html += ev.dataset.venue ? '<div class="rf-cal-pop-venue">' + esc( ev.dataset.venue ) + '</div>' : '';
		html += ev.dataset.excerpt ? '<p class="rf-cal-pop-ex">' + esc( ev.dataset.excerpt ) + '</p>' : '';
		html += '<div class="rf-cal-pop-actions"><a class="rf-cal-pop-btn rf-cal-pop-view" href="' + esc( ev.getAttribute( 'href' ) ) + '">' + esc( i18n.view ) + ' →</a>';

		if ( this.config.addToCalendar ) {
			let menu = '';

			Object.entries( i18n.providers || {} ).forEach( ( [ key, label ] ) => {
				if ( links[ key ] ) {
					// The .ics file is a data: address; the others open the calendar service in a new tab.
					const attrs = 'ics' === key ? ' download="event.ics"' : ' target="_blank" rel="noopener"';
					menu += '<a class="rf-cal-addcal-item" href="' + esc( links[ key ] ) + '"' + attrs + '>' + esc( label ) + '</a>';
				}
			} );

			if ( menu ) {
				html += '<div class="rf-cal-addcal"><button type="button" class="rf-cal-pop-btn rf-cal-addcal-toggle" aria-expanded="false">' + esc( i18n.add ) + '<svg class="rf-cal-addcal-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button><div class="rf-cal-addcal-menu">' + menu + '</div></div>';
			}
		}

		pop.innerHTML = html + '</div></div>';
		pop.hidden = false;

		// Below the event, above it when there is no room, kept inside the window.
		const r = ev.getBoundingClientRect();
		const width = pop.offsetWidth;
		const height = pop.offsetHeight;
		const vw = document.documentElement.clientWidth;
		const left = Math.max( 12, Math.min( r.left + ( r.width / 2 ) - ( width / 2 ), vw - width - 12 ) );
		let top = r.bottom + 8;

		if ( top + height > window.innerHeight - 12 ) {
			top = Math.max( 12, r.top - height - 8 );
		}

		pop.style.left = ( left + window.pageXOffset ) + 'px';
		pop.style.top = ( top + window.pageYOffset ) + 'px';
		requestAnimationFrame( () => pop.classList.add( 'is-shown' ) );
	}

	// ---------------------------------------------------------------- events

	bind() {
		const cal = this.cal;

		this.part( 'prev' ).addEventListener( 'click', () => this.step( -1 ) );
		this.part( 'next' ).addEventListener( 'click', () => this.step( 1 ) );
		this.part( 'today-btn' ).addEventListener( 'click', () => this.load( ymd( new Date() ) ) );
		cal.querySelectorAll( '.rf-cal-view' ).forEach( ( b ) => b.addEventListener( 'click', () => this.setView( b.dataset.view ) ) );

		const form = this.part( 'search' );

		if ( form ) {
			form.addEventListener( 'submit', ( e ) => {
				e.preventDefault();
				this.load( cal.dataset.date );
			} );

			let timer = null;
			this.q.addEventListener( 'input', () => {
				clearTimeout( timer );
				const words = this.query();

				if ( 1 === words.length ) {
					return;
				}

				timer = setTimeout( () => this.load( cal.dataset.date ), 400 );
			} );
		}

		this.part( 'title' ).addEventListener( 'click', ( e ) => {
			e.stopPropagation();

			if ( this.pickerOpen ) {
				this.closePicker();
			} else {
				this.openPicker();
			}
		} );
		this.part( 'picker' ).addEventListener( 'click', ( e ) => {
			e.stopPropagation();

			if ( e.target.closest( '.rf-cal-pk-prev' ) || e.target.closest( '.rf-cal-pk-next' ) ) {
				const d = new Date( this.pickerView.y, this.pickerView.m + ( e.target.closest( '.rf-cal-pk-prev' ) ? -1 : 1 ), 1 );
				this.pickerView = { y: d.getFullYear(), m: d.getMonth() };
				this.renderPicker();
				return;
			}

			const day = e.target.closest( '.rf-cal-pk-day' );

			if ( day ) {
				this.load( day.dataset.date );
				this.closePicker();
			}
		} );
		document.addEventListener( 'click', () => this.closePicker() );
		cal.addEventListener( 'keydown', ( e ) => {
			if ( 'Escape' === e.key ) {
				this.closePicker();
			}
		} );

		// "+N more" / "Show less" (delegated: the views are replaced on every load).
		cal.addEventListener( 'click', ( e ) => {
			const more = e.target.closest( '.rf-cal-more' );

			if ( ! more ) {
				return;
			}

			const cell = more.closest( '.rf-cal-cell' );
			const open = cell.classList.toggle( 'is-expanded' );
			cell.querySelectorAll( '.rf-cal-ev.is-extra' ).forEach( ( ev ) => {
				ev.hidden = ! open;
			} );
			more.querySelector( '.rf-cal-more-show' ).hidden = open;
			more.querySelector( '.rf-cal-more-hide' ).hidden = ! open;
			more.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
		} );

		if ( ! this.config.preview ) {
			return;
		}

		cal.addEventListener( 'mouseover', ( e ) => {
			const ev = e.target.closest( EVENT );

			if ( ev && ! ev.hidden && this.current !== ev ) {
				this.current = ev;
				this.showCard( ev );
			}
		} );
		cal.addEventListener( 'mouseout', ( e ) => {
			const ev = e.target.closest( EVENT );

			if ( ev && ! ( e.relatedTarget && ( ev.contains( e.relatedTarget ) || this.card().contains( e.relatedTarget ) ) ) ) {
				this.current = null;
				this.hideCard();
			}
		} );
		cal.addEventListener( 'focusin', ( e ) => {
			const ev = e.target.closest( EVENT );

			if ( ev && ! ev.hidden ) {
				this.current = ev;
				this.showCard( ev );
			}
		} );
		cal.addEventListener( 'focusout', ( e ) => {
			if ( ! this.card().contains( e.relatedTarget ) ) {
				this.current = null;
				this.hideCard();
			}
		} );
		window.addEventListener( 'scroll', () => {
			const pop = this.card();

			if ( ! pop.hidden ) {
				this.current = null;
				this.hideCard();
			}
		}, { passive: true } );
	}
}

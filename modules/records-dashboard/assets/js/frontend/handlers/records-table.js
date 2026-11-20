import Base from 'refraction-frontend/handlers/base';
import { ask, collectionOf } from './request';

/**
 * Records Table (0.129.0): search, status and date filters, sorting by a heading, pages, Refresh and Export CSV, all
 * asked from the site (the rows come back as HTML written by Records_View, the same as the first page). Choosing a
 * row tells Record Details widgets which record to show (`refraction:record-select`) and opens the Off-Canvas named
 * in the settings. Viewers can drag the headings into another order; it is kept in their browser.
 */
export default class RecordsTable extends Base {
	onInit() {
		super.onInit();

		this.root = this.$element[ 0 ].querySelector( '.rf-rt' );

		if ( ! this.root ) {
			return;
		}

		const d = this.root.dataset;

		this.collection = collectionOf( this.root );
		this.state = { page: 1, search: '', status: '', from: '', to: '', orderby: d.sort || '', order: d.order || 'desc' };
		this.selected = 0;
		this.parts = {
			body: this.root.querySelector( 'tbody' ),
			summary: this.root.querySelector( '.rf-rt__summary' ),
			page: this.root.querySelector( '.rf-rt__page' ),
			prev: this.root.querySelector( '.rf-rt__prev' ),
			next: this.root.querySelector( '.rf-rt__next' ),
			count: this.root.querySelector( '.rf-rt__count' ),
			clear: this.root.querySelector( '.rf-rt__clear' ),
			reset: this.root.querySelector( '.rf-rt__reset' ),
		};

		this.bind();
		this.applyOrder();
	}

	bind() {
		const root = this.root;
		let timer = 0;

		this.onInput = ( event ) => {
			const field = event.target;

			if ( ! field.name || ! [ 'search', 'status', 'from', 'to' ].includes( field.name ) || ! field.closest( '.rf-rt__filters' ) ) {
				return;
			}

			// Each value is kept at once; only the request waits, so quick changes to several filters all count.
			this.state[ field.name ] = field.value;
			this.state.page = 1;
			clearTimeout( timer );
			timer = setTimeout( () => this.load(), 'search' === field.name ? 300 : 0 );
		};

		this.onClick = ( event ) => {
			const target = event.target;
			const button = target.closest( 'button' );

			if ( button && root.contains( button ) ) {
				if ( button.classList.contains( 'rf-rt__sort' ) ) {
					this.sortBy( button.closest( 'th' ).dataset.sort );
				} else if ( button.classList.contains( 'rf-rt__prev' ) ) {
					this.go( this.state.page - 1 );
				} else if ( button.classList.contains( 'rf-rt__next' ) ) {
					this.go( this.state.page + 1 );
				} else if ( button.classList.contains( 'rf-rt__refresh' ) ) {
					this.load();
				} else if ( button.classList.contains( 'rf-rt__export' ) ) {
					this.exportCsv( button );
				} else if ( button.classList.contains( 'rf-rt__clear' ) ) {
					this.clear();
				} else if ( button.classList.contains( 'rf-rt__reset' ) ) {
					this.saveOrder( null );
					this.applyOrder();
				}

				return;
			}

			const row = target.closest( 'tr.rf-rt-row, tr.rf-rec-row' );

			if ( row && row.dataset.id && ! target.closest( 'a' ) ) {
				this.choose( Number( row.dataset.id ) );
			}
		};

		this.onKey = ( event ) => {
			const row = event.target.closest && event.target.closest( 'tr.rf-rec-row' );

			if ( row && ( 'Enter' === event.key || ' ' === event.key ) && event.target === row ) {
				event.preventDefault();
				this.choose( Number( row.dataset.id ) );
			}
		};

		this.onChanged = ( event ) => {
			if ( event.detail?.collection === this.collection ) {
				this.load();
			}
		};

		root.addEventListener( 'input', this.onInput );
		root.addEventListener( 'change', this.onInput );
		root.addEventListener( 'click', this.onClick );
		root.addEventListener( 'keydown', this.onKey );
		document.addEventListener( 'refraction:record-changed', this.onChanged );

		if ( 'yes' === root.dataset.reorder ) {
			this.bindReorder();
		}
	}

	onDestroy() {
		document.removeEventListener( 'refraction:record-changed', this.onChanged );
		super.onDestroy();
	}

	async load() {
		this.root.classList.add( 'is-loading' );

		try {
			const data = await ask( this.root, 'rows', { ...this.state, id: this.selected } );

			this.state.page = data.page;
			this.parts.body.innerHTML = data.html;
			this.parts.summary.textContent = data.summary;
			this.parts.page.textContent = data.pager;
			this.parts.prev.disabled = data.page <= 1;
			this.parts.next.disabled = data.page >= data.pages;

			if ( this.parts.count ) {
				this.parts.count.textContent = String( data.total );
			}

			this.applyOrder();
			this.root.querySelector( '.rf-rt__error' )?.remove();
		} catch ( error ) {
			this.showError( error.message );
		} finally {
			this.root.classList.remove( 'is-loading' );
			this.updateClear();
		}
	}

	showError( message ) {
		let box = this.root.querySelector( '.rf-rt__error' );

		if ( ! box ) {
			box = document.createElement( 'div' );
			box.className = 'rf-rt__error';
			box.setAttribute( 'role', 'alert' );
			this.root.querySelector( '.rf-rt__scroll' ).before( box );
		}

		box.textContent = message;
	}

	go( page ) {
		this.state.page = Math.max( 1, page );
		this.load();
	}

	sortBy( key ) {
		if ( ! key ) {
			return;
		}

		this.state.order = key === this.state.orderby && 'desc' === this.state.order ? 'asc' : 'desc';
		this.state.orderby = key;
		this.state.page = 1;

		const sorted = 'asc' === this.state.order ? 'ascending' : 'descending';

		this.root.querySelectorAll( 'th[data-sort]' ).forEach( ( th ) => {
			th.setAttribute( 'aria-sort', th.dataset.sort === key ? sorted : 'none' );
		} );

		this.load();
	}

	clear() {
		this.root.querySelectorAll( '.rf-rt__filters input, .rf-rt__filters select' ).forEach( ( field ) => {
			field.value = '';
		} );
		Object.assign( this.state, { search: '', status: '', from: '', to: '', page: 1 } );
		this.load();
	}

	updateClear() {
		if ( this.parts.clear ) {
			this.parts.clear.hidden = ! ( this.state.search || this.state.status || this.state.from || this.state.to );
		}
	}

	choose( id ) {
		this.selected = id;
		this.root.querySelectorAll( 'tr.rf-rec-row' ).forEach( ( row ) => row.classList.toggle( 'is-selected', Number( row.dataset.id ) === id ) );
		document.dispatchEvent( new CustomEvent( 'refraction:record-select', { detail: { collection: this.collection, id } } ) );

		const panel = this.root.dataset.panel;

		// In Edit Mode the Off-Canvas is already shown in the page.
		if ( panel && ! this.isEdit && window.refractionOffCanvas ) {
			window.refractionOffCanvas.open( panel );
		}
	}

	async exportCsv( button ) {
		button.disabled = true;

		try {
			const data = await ask( this.root, 'csv', this.state );
			const url = URL.createObjectURL( new Blob( [ data.csv ], { type: 'text/csv;charset=utf-8' } ) );
			const link = document.createElement( 'a' );

			link.href = url;
			link.download = data.name;
			document.body.append( link );
			link.click();
			link.remove();
			setTimeout( () => URL.revokeObjectURL( url ), 1000 );
		} catch ( error ) {
			this.showError( error.message );
		} finally {
			button.disabled = false;
		}
	}

	/* ---------------------------------------------------- column order */

	storageKey() {
		return this.root.dataset.key || '';
	}

	savedOrder() {
		const count = this.root.querySelectorAll( 'thead th' ).length;

		try {
			const order = JSON.parse( window.localStorage.getItem( this.storageKey() ) || 'null' );

			if ( Array.isArray( order ) && order.length === count && [ ...order ].sort( ( a, b ) => a - b ).every( ( n, i ) => n === i ) ) {
				return order;
			}
		} catch ( error ) {}

		return null;
	}

	saveOrder( order ) {
		try {
			if ( order ) {
				window.localStorage.setItem( this.storageKey(), JSON.stringify( order ) );
			} else {
				window.localStorage.removeItem( this.storageKey() );
			}
		} catch ( error ) {}
	}

	currentOrder() {
		return Array.from( this.root.querySelectorAll( 'thead th' ) ).map( ( th ) => Number( th.dataset.col ) );
	}

	applyOrder() {
		const saved = 'yes' === this.root.dataset.reorder ? this.savedOrder() : null;
		const order = saved || this.currentOrder().slice().sort( ( a, b ) => a - b );
		const place = ( parent, selector ) => {
			if ( ! parent ) {
				return;
			}

			const cells = {};

			parent.querySelectorAll( ':scope > ' + selector ).forEach( ( cell ) => {
				cells[ cell.dataset.col ] = cell;
			} );

			order.forEach( ( col ) => cells[ col ] && parent.append( cells[ col ] ) );
		};

		place( this.root.querySelector( 'colgroup' ), 'col' );
		place( this.root.querySelector( 'thead tr' ), 'th' );
		this.root.querySelectorAll( 'tbody tr.rf-rec-row' ).forEach( ( row ) => place( row, 'td' ) );

		if ( this.parts.reset ) {
			this.parts.reset.hidden = ! saved;
		}
	}

	bindReorder() {
		let from = null;

		this.root.addEventListener( 'dragstart', ( event ) => {
			const th = event.target.closest && event.target.closest( 'thead th' );

			if ( ! th ) {
				return;
			}

			from = th.dataset.col;
			th.classList.add( 'is-dragging' );
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData( 'text/plain', from );
		} );

		this.root.addEventListener( 'dragover', ( event ) => {
			const th = event.target.closest && event.target.closest( 'thead th' );

			if ( th && null !== from ) {
				event.preventDefault();
				this.root.querySelectorAll( 'thead th.is-drop' ).forEach( ( el ) => el !== th && el.classList.remove( 'is-drop' ) );
				th.classList.add( 'is-drop' );
			}
		} );

		this.root.addEventListener( 'drop', ( event ) => {
			const th = event.target.closest && event.target.closest( 'thead th' );

			if ( ! th || null === from ) {
				return;
			}

			event.preventDefault();

			const order = this.currentOrder(),
				moving = Number( from ),
				target = Number( th.dataset.col );

			if ( moving !== target ) {
				order.splice( order.indexOf( moving ), 1 );
				order.splice( order.indexOf( target ) + ( order.indexOf( target ) >= this.currentOrder().indexOf( moving ) ? 1 : 0 ), 0, moving );
				this.saveOrder( order );
				this.applyOrder();
			}
		} );

		this.root.addEventListener( 'dragend', () => {
			from = null;
			this.root.querySelectorAll( 'thead th.is-dragging, thead th.is-drop' ).forEach( ( el ) => el.classList.remove( 'is-dragging', 'is-drop' ) );
		} );
	}
}

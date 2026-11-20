import Base from 'refraction-frontend/handlers/base';
import { ask, collectionOf } from './request';

/**
 * Record Details (0.129.0): shows the record a Records Table row chose (`refraction:record-select`) and changes its
 * status with the status buttons, then tells the tables to load again (`refraction:record-changed`). In Edit Mode it
 * follows a table too, but its status buttons change nothing.
 */
export default class RecordDetails extends Base {
	onInit() {
		super.onInit();

		this.root = this.$element[ 0 ].querySelector( '.rf-rd' );

		if ( ! this.root ) {
			return;
		}

		this.collection = collectionOf( this.root );
		this.inner = this.root.querySelector( '.rf-rd__inner' );
		this.error = this.root.querySelector( '.rf-rd__error' );

		this.onSelect = ( event ) => {
			if ( event.detail?.collection === this.collection && event.detail.id ) {
				this.show( event.detail.id );
			}
		};

		this.onClick = ( event ) => {
			const button = event.target.closest( '.rf-rd-status' );

			if ( button && ! button.disabled && 'true' !== button.getAttribute( 'aria-pressed' ) ) {
				this.setStatus( button.dataset.status );
			}
		};

		document.addEventListener( 'refraction:record-select', this.onSelect );
		this.root.addEventListener( 'click', this.onClick );
	}

	onDestroy() {
		document.removeEventListener( 'refraction:record-select', this.onSelect );
		super.onDestroy();
	}

	fail( message ) {
		this.error.textContent = message;
		this.error.hidden = false;
	}

	async run( op, data ) {
		this.root.classList.add( 'is-loading' );
		this.error.hidden = true;

		try {
			const result = await ask( this.root, op, data );

			this.inner.innerHTML = result.html;
			this.root.dataset.id = String( result.id );

			return result;
		} catch ( error ) {
			this.fail( error.message );

			return null;
		} finally {
			this.root.classList.remove( 'is-loading' );
		}
	}

	show( id ) {
		return this.run( 'record', { id } );
	}

	async setStatus( status ) {
		const id = Number( this.root.dataset.id );

		if ( ! id || this.isEdit ) {
			return;
		}

		const result = await this.run( 'status', { id, to: status } );

		if ( result ) {
			document.dispatchEvent( new CustomEvent( 'refraction:record-changed', { detail: { collection: this.collection, id, status } } ) );
		}
	}
}

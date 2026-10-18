export default class extends Marionette.LayoutView {
	tagName() {
		return 'header';
	}

	className() {
		return 'refraction-templates-modal__header';
	}

	getTemplate() {
		return '#tmpl-refraction-templates-modal__header';
	}

	regions() {
		return {
			logoArea: '.refraction-templates-modal__header__logo-area',
			tools: '#refraction-template-library-header-tools',
			menuArea: '.refraction-templates-modal__header__menu-area',
		};
	}

	ui() {
		return {
			closeModal: '.refraction-templates-modal__header__close',
		};
	}

	events() {
		return {
			'click @ui.closeModal': 'onCloseModalClick',
		};
	}

	onRender() {
		this.bindEscapeKey();
	}

	bindEscapeKey() {
		this.onDocumentKeyDown = ( event ) => {
			if ( 'Escape' === event.key ) {
				this.onCloseModalClick();
			}
		};

		document.addEventListener( 'keydown', this.onDocumentKeyDown );
	}

	onDestroy() {
		if ( this.onDocumentKeyDown ) {
			document.removeEventListener( 'keydown', this.onDocumentKeyDown );
		}
	}

	templateHelpers() {
		return {
			closeType: this.getOption( 'closeType' ),
		};
	}

	onCloseModalClick() {
		this._parent._parent._parent.hideModal();

		const documentType = this.getDocumentType();

		const customEvent = new CustomEvent( `core/modal/close/${ documentType }` );

		window.dispatchEvent( customEvent );

		if ( this.isFloatingButtonLibraryClose() ) {
			$e.internal( 'document/save/set-is-modified', { status: false } );
			window.location.href = refraction.config.admin_floating_button_admin_url;
		}
	}

	getDocumentType() {
		const DEFAULT_TYPE = 'default';

		if ( 'undefined' === typeof window.refraction ) {
			return DEFAULT_TYPE;
		}

		return refraction?.config?.document?.type ?? DEFAULT_TYPE;
	}

	isFloatingButtonLibraryClose() {
		return window.refraction && refraction.config?.admin_floating_button_admin_url &&
			'floating-buttons' === refraction.config?.document?.type &&
			(
				this.$el
					.closest( '.dialog-lightbox-widget-content' )
					.find( '.refraction-template-library-template-floating_button' ).length ||
				this.$el
					.closest( '.dialog-lightbox-widget-content' )
					.find( '#refraction-template-library-preview' ).length ||
				this.$el
					.closest( '.dialog-lightbox-widget-content' )
					.find( '#refraction-template-library-templates-empty' ).length
			);
	}
}

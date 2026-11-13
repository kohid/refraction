var BaseRegion = require( 'refraction-regions/base' );

module.exports = BaseRegion.extend( {
	el: '#refraction-panel',

	getStorageKey() {
		return 'panel';
	},

	getDefaultStorage() {
		return {
			size: {
				width: '',
			},
			// Where the panel is: docked 'left' (as always), docked 'right', or '' floating at `float`.
			dock: 'left',
			float: {
				top: '',
				left: '',
				height: '',
			},
		};
	},

	constructor() {
		BaseRegion.prototype.constructor.apply( this, arguments );

		var PanelLayoutView = require( 'refraction-regions/panel/layout' );

		this.show( new PanelLayoutView() );

		this.setSize();

		this.storage.float = this.storage.float || {};
		this.dockSide = [ 'left', 'right', '' ].includes( this.storage.dock ) ? this.storage.dock : 'left';
		this.applyDock();
		this.$el.draggable( {
			iframeFix: true,
			handle: '#refraction-panel-header',
			cancel: 'button, input, a',
			drag: ( event, ui ) => this.onDrag( event, ui ),
			stop: ( event, ui ) => this.onDragStop( event, ui ),
		} );

		this.listenTo( refraction.channels.dataEditMode, 'switch', this.onEditModeSwitched );
	},

	/**
	 * Docks the panel to 'left' or 'right', or floats it ('') like the Structure and Elements windows. Pressing the
	 * side it is docked to floats it (header buttons); dragging it by its header against an edge docks it there,
	 * pulling it away from its edge floats it. Docked on the right it sits before a docked Structure or Elements
	 * window; the page makes room as it does on the left (see panel.scss and elements-float.scss).
	 *
	 * @param {string} side 'left', 'right' or ''.
	 */
	setDock( side ) {
		this.dockSide = [ 'left', 'right' ].includes( side ) ? side : '';
		this.saveStorage( 'dock', this.dockSide );
		this.applyDock();
		refraction.getPanelView()?.updateScrollbar?.();
		window.dispatchEvent( new CustomEvent( 'refraction/panel/dock', { detail: { side: this.dockSide } } ) );
	},

	applyDock() {
		const $body = refractionCommon.elements.$body;
		const floating = '' === this.dockSide;

		$body
			.toggleClass( 'rf-panel--right', 'right' === this.dockSide )
			.toggleClass( 'rf-panel--floating', floating )
			.removeClass( 'rf-panel--dock-hint-left rf-panel--dock-hint-right' );

		if ( floating ) {
			const place = this.storage.float || {};

			this.$el.css( { top: place.top || '', left: place.left || '', height: place.height || '' } );
		} else {
			this.$el.css( { top: '', left: '', right: '', bottom: '', height: '' } );
		}

		this.resizable();
		this.ensurePosition();
		this.updateDockButtons();
	},

	updateDockButtons() {
		jQuery( '#refraction-panel-header .rf-panel-dock' ).each( ( index, button ) => {
			const active = button.dataset.dock === this.dockSide;

			button.classList.toggle( 'rf-panel-dock--active', active );
			button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
		} );
	},

	// A floating panel left outside the window (a smaller window) comes back to its default place.
	ensurePosition() {
		if ( this.dockSide ) {
			return;
		}

		const rect = this.el.getBoundingClientRect();

		if ( rect.left > innerWidth - 60 || rect.right < 60 || rect.top > innerHeight - 40 || rect.top < 0 ) {
			this.$el.css( { top: '', left: '' } );
		}
	},

	edgeAt( left ) {
		if ( left < 10 ) {
			return 'left';
		}

		return left + this.el.offsetWidth > innerWidth - 10 ? 'right' : '';
	},

	onDrag( event, ui ) {
		if ( this.dockSide ) {
			// Pulled away from its edge: it floats where it is dragged.
			if ( Math.abs( ui.position.left - ui.originalPosition.left ) > 30 ) {
				this.dockSide = '';
				this.saveStorage( 'dock', '' );
				refractionCommon.elements.$body.removeClass( 'rf-panel--right' ).addClass( 'rf-panel--floating' );
				this.$el.css( { height: Math.min( 760, innerHeight - 120 ) + 'px' } );
				this.resizable();
				this.updateDockButtons();
			}

			return;
		}

		ui.position.top = Math.max( 0, ui.position.top );

		const edge = this.edgeAt( ui.position.left );

		refractionCommon.elements.$body
			.toggleClass( 'rf-panel--dock-hint-left', 'left' === edge )
			.toggleClass( 'rf-panel--dock-hint-right', 'right' === edge );
	},

	onDragStop( event, ui ) {
		refractionCommon.elements.$body.removeClass( 'rf-panel--dock-hint-left rf-panel--dock-hint-right' );

		const edge = this.dockSide ? '' : this.edgeAt( ui.position.left );

		if ( edge ) {
			this.setDock( edge );
			return;
		}

		if ( ! this.dockSide ) {
			this.saveFloat();
			window.dispatchEvent( new CustomEvent( 'refraction/panel/dock', { detail: { side: '' } } ) );
		} else {
			this.applyDock();
		}
	},

	saveFloat() {
		const style = this.el.style;

		this.saveStorage( 'float', { top: style.top, left: style.left, height: style.height } );
	},

	setSize() {
		const savedWidth = this.storage.size.width;

		refractionCommon.elements.$body.css( '--e-editor-panel-width', savedWidth );
	},

	resizable() {
		var self = this;
		const inner = refractionCommon.config.isRTL ? 'w' : 'e';

		if ( self.$el.resizable( 'instance' ) ) {
			self.$el.resizable( 'destroy' );
		}

		// Docked: its inner edge; floating: every edge.
		let handles = inner;

		if ( 'right' === self.dockSide ) {
			handles = 'e' === inner ? 'w' : 'e';
		} else if ( '' === self.dockSide ) {
			handles = 'n, e, s, w, se, sw';
		}

		self.$el.resizable( {
			handles,
			minWidth: 250,
			maxWidth: 680,
			start() {
				refraction.$previewWrapper.addClass( 'ui-resizable-resizing' );
			},
			stop( event, ui ) {
				refraction.$previewWrapper.removeClass( 'ui-resizable-resizing' );

				refraction.getPanelView().updateScrollbar();

				self.saveSize( { width: ui.size.width + 'px' } );

				if ( '' === self.dockSide ) {
					self.saveFloat();
				}
			},
			resize( event, ui ) {
				refractionCommon.elements.$body.css( '--e-editor-panel-width', ui.size.width + 'px' );

				self.$el.css( 'width', '' );

				// Docked, its place comes from the CSS (for RTL and the right side).
				if ( self.dockSide ) {
					self.$el.css( { left: '', right: '', top: '', height: '' } );
				}
			},
		} );
	},

	onEditModeSwitched( activeMode ) {
		// For the top bar's Panel button (editor-app-bar, extensions/panel-toggle).
		window.dispatchEvent( new CustomEvent( 'refraction/panel/visibility', { detail: { visible: 'preview' !== activeMode } } ) );

		if ( 'edit' !== activeMode ) {
			return;
		}

		this.setSize();
	},
} );

/**
 * The floating Elements window: the widgets list in a window of its own, moved by its header like Structure, resized
 * from its edges, and docked to the left edge (beside the panel) or the right edge (before a docked Structure) by its
 * header buttons or by dragging it against that edge. Shown and hidden from the top bar (Floating Elements), its close
 * button or Ctrl+Shift+K; where it was, its size and whether it is shown are remembered in the browser.
 *
 * A docked window takes its own space: the page beside it gets narrower, as with a docked Structure (see
 * elements-float.scss, which reads the body classes and --rf-ef-width set here).
 */
import Component from './component';
import Layout from './layout';

const BaseRegion = require( 'refraction-regions/base' );

const SIDES = [ 'left', 'right' ];
const DEFAULT_WIDTH = 280;

export default class extends BaseRegion {
	constructor( options ) {
		super( options );

		this.component = $e.components.register( new Component( { manager: this } ) );

		this.dockSide = '';
		this.ensurePosition = this.ensurePosition.bind( this );

		this.listenTo( refraction.channels.dataEditMode, 'switch', this.onEditModeSwitched );
		this.followTopBarHeight();

		refraction.on( 'document:loaded', this.onDocumentLoaded.bind( this ) );
		refraction.on( 'document:unloaded', this.onDocumentUnloaded.bind( this ) );

		// Created after the first document opened: catch up with it.
		const current = refraction.documents.getCurrent();

		if ( current?.config?.panel?.has_elements ) {
			this.onDocumentLoaded( current );
		}
	}

	// The editor's layout reads the top bar height from --editor-v2-top-bar-height (48px), but Refraction's top bar is
	// taller: a docked window (this one, a docked Structure) and the editor wrapper went under it. Keep the variable
	// equal to the real height.
	followTopBarHeight() {
		const bar = document.getElementById( 'refraction-editor-wrapper-v2' );

		if ( ! bar || ! window.ResizeObserver ) {
			return;
		}

		const sync = () => {
			const height = Math.round( bar.getBoundingClientRect().height );

			if ( height > 0 ) {
				document.body.style.setProperty( '--editor-v2-top-bar-height', height + 'px' );
			}
		};

		new ResizeObserver( sync ).observe( bar );
		sync();
	}

	getStorageKey() {
		return 'elementsFloat';
	}

	getDefaultStorage() {
		return {
			visible: false,
			dock: '',
			size: {
				width: '',
				height: '',
				top: '',
				left: '',
			},
		};
	}

	getDraggableOptions() {
		return {
			iframeFix: true,
			handle: '.rf-ef__title',
			drag: this.onDrag.bind( this ),
			stop: this.onDragStop.bind( this ),
		};
	}

	getResizableOptions( handles = 'all' ) {
		return {
			handles,
			containment: 'document',
			minWidth: 200,
			maxWidth: 560,
			minHeight: 240,
			start: () => refraction.$previewWrapper.addClass( 'ui-resizable-resizing' ),
			stop: () => {
				refraction.$previewWrapper.removeClass( 'ui-resizable-resizing' );
				this.setWidth( this.el.offsetWidth + 'px' );

				if ( ! this.dockSide ) {
					this.saveFloatingSize();
				}
			},
			resize: ( event, ui ) => this.setWidth( ui.size.width + 'px', false ),
		};
	}

	initLayout() {
		if ( this.currentView ) {
			return;
		}

		this.show( new Layout( { region: this } ) );
		this.$el.draggable( this.getDraggableOptions() );
	}

	isOpen() {
		return this.$el.is( ':visible' );
	}

	open() {
		this.initLayout();
		this.$el.show();
		this.setWidth();

		if ( SIDES.includes( this.storage.dock ) ) {
			this.dock( this.storage.dock, true );
		} else {
			this.float( true );
		}

		this.saveStorage( 'visible', true );
		refractionCommon.elements.$window.on( 'resize', this.ensurePosition );
	}

	close( silent ) {
		this.$el.hide();
		this.clearDockClasses();

		if ( ! silent ) {
			this.saveStorage( 'visible', false );
		}

		if ( this.$el.resizable( 'instance' ) ) {
			this.$el.resizable( 'destroy' );
		}

		refractionCommon.elements.$window.off( 'resize', this.ensurePosition );
	}

	// Dock to a side, or float again with ''.
	setDock( side ) {
		if ( SIDES.includes( side ) ) {
			this.dock( side );
		} else {
			this.float();
		}
	}

	dock( side, restoring = false ) {
		this.clearDockClasses();
		this.dockSide = side;
		refractionCommon.elements.$body.addClass( 'rf-ef-docked rf-ef-docked--' + side );

		// Docked: the height and place come from the CSS, only the inner edge resizes.
		this.$el.css( { top: '', left: '', right: '', bottom: '', height: '' } );
		this.resetResizable( 'left' === side ? 'e' : 'w' );

		if ( ! restoring ) {
			this.saveStorage( 'dock', side );
		}

		this.updateButtons();
	}

	float( restoring = false ) {
		this.clearDockClasses();
		this.dockSide = '';

		const size = this.storage.size;

		this.$el.css( {
			top: size.top || '',
			left: size.left || '',
			height: size.height || '',
		} );
		this.resetResizable( 'all' );
		this.ensurePosition();

		if ( ! restoring ) {
			this.saveStorage( 'dock', '' );
		}

		this.updateButtons();
	}

	clearDockClasses() {
		refractionCommon.elements.$body.removeClass( 'rf-ef-docked rf-ef-docked--left rf-ef-docked--right rf-ef--dock-hint-left rf-ef--dock-hint-right' );
	}

	resetResizable( handles ) {
		if ( this.$el.resizable( 'instance' ) ) {
			this.$el.resizable( 'destroy' );
		}

		this.$el.resizable( this.getResizableOptions( handles ) );
	}

	updateButtons() {
		this.currentView?.updateDockButtons();
	}

	// The width lives in a body variable, so the docked page space follows it.
	setWidth( width = null, save = true ) {
		if ( width ) {
			this.storage.size.width = width;
		}

		const value = this.storage.size.width || DEFAULT_WIDTH + 'px';

		refractionCommon.elements.$body.css( '--rf-ef-width', value );
		this.$el.css( 'width', '' );

		if ( width && save ) {
			this.saveStorage( 'size', this.storage.size );
		}
	}

	saveFloatingSize() {
		const style = this.el.style;

		this.storage.size = {
			...this.storage.size,
			top: style.top,
			left: style.left,
			height: style.height,
		};
		this.saveStorage( 'size', this.storage.size );
	}

	// A floating window left outside the screen (a smaller window, another screen) comes back to its default place.
	ensurePosition() {
		if ( this.dockSide || ! this.isOpen() ) {
			return;
		}

		const rect = this.el.getBoundingClientRect();

		if ( rect.left > innerWidth - 40 || rect.right < 40 || rect.top > innerHeight - 40 || rect.top < 0 ) {
			this.$el.css( { top: '', left: '' } );
		}
	}

	onDrag( event, ui ) {
		if ( this.dockSide ) {
			// Pulled away from its edge: it floats again where it is dragged.
			if ( Math.abs( ui.position.left - ui.originalPosition.left ) > 30 ) {
				const height = Math.min( 520, innerHeight - 140 );

				this.float();
				this.$el.css( { height: height + 'px' } );
			}

			return;
		}

		ui.position.top = Math.max( 0, ui.position.top );

		const hint = this.edgeAt( ui.position.left );

		refractionCommon.elements.$body
			.toggleClass( 'rf-ef--dock-hint-left', 'left' === hint )
			.toggleClass( 'rf-ef--dock-hint-right', 'right' === hint );
	}

	onDragStop( event, ui ) {
		refractionCommon.elements.$body.removeClass( 'rf-ef--dock-hint-left rf-ef--dock-hint-right' );

		if ( this.dockSide ) {
			this.$el.css( { top: '', left: '' } );
			return;
		}

		const edge = this.edgeAt( ui.position.left );

		if ( edge ) {
			this.dock( edge );
			return;
		}

		this.saveFloatingSize();
	}

	// Dragged against the panel or the left edge of the page, or against the panel or the right edge (the panel may be
	// docked on either side, or floating: then only the window edges count).
	edgeAt( left ) {
		const $body = refractionCommon.elements.$body;
		const panel = document.getElementById( 'refraction-panel' );
		const shown = panel && ! $body.hasClass( 'refraction-editor-preview' ) && ! $body.hasClass( 'rf-panel--floating' );
		const rect = shown ? panel.getBoundingClientRect() : null;
		const panelRight = rect && ! $body.hasClass( 'rf-panel--right' ) ? rect.right : 0;
		const rightLimit = rect && $body.hasClass( 'rf-panel--right' ) ? rect.left : innerWidth;

		if ( left < panelRight + 10 ) {
			return 'left';
		}

		if ( left + this.el.offsetWidth > rightLimit - 10 ) {
			return 'right';
		}

		return '';
	}

	onEditModeSwitched( activeMode ) {
		if ( [ 'edit', 'picker' ].includes( activeMode ) && this.storage.visible && this.currentView ) {
			$e.route( 'elements-float' );
		} else if ( this.component.isOpen ) {
			this.component.close( true );
		} else {
			this.close( true );
		}
	}

	onDocumentLoaded( document ) {
		if ( ! document.config.panel.has_elements ) {
			return;
		}

		this.initLayout();

		if ( this.storage.visible && ! this.component.isOpen ) {
			$e.route( 'elements-float' );
		}
	}

	onDocumentUnloaded() {
		if ( this.component.isOpen ) {
			this.component.close( true );
		}
	}
}

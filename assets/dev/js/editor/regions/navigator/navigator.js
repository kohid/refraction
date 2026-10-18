import Component from './component';

const BaseRegion = require( 'refraction-regions/base' );

import NavigatorLayout from './layout';

export default class extends BaseRegion {
	constructor( options ) {
		super( options );

		this.component = $e.components.register( new Component( { manager: this } ) );

		this.isDocked = false;
		this.setSize();

		this.indicators = {
			customPosition: {
				title: __( 'Custom Positioning', 'refraction' ),
				icon: 'cursor-move',
				settingKeys: [ '_position' ],
				section: '_section_position',
			},
		};

		this.ensurePosition = this.ensurePosition.bind( this );

		this.listenTo( refraction.channels.dataEditMode, 'switch', this.onEditModeSwitched );

		// TODO: Move to hook on 'editor/documents/load'.
		refraction.on( 'document:loaded', this.onDocumentLoaded.bind( this ) );
		refraction.on( 'document:unloaded', this.onDocumentUnloaded.bind( this ) );
	}

	getStorageKey() {
		return 'navigator';
	}

	getDefaultStorage() {
		return {
			visible: true,
			size: {
				width: '',
				height: '',
				top: '',
				bottom: '',
				right: '',
				left: '',
			},
		};
	}

	getLayout() {
		return this.currentView;
	}

	getDraggableOptions() {
		return {
			iframeFix: true,
			handle: '#refraction-navigator__header',
			drag: this.onDrag.bind( this ),
			stop: this.onDragStop.bind( this ),
		};
	}

	getResizableOptions() {
		return {
			handles: 'all',
			containment: 'document',
			minWidth: 150,
			maxWidth: 500,
			minHeight: 240,
			start: () => {
				refraction.$previewWrapper.addClass( 'ui-resizable-resizing' );
			},
			stop: () => {
				refraction.$previewWrapper.removeClass( 'ui-resizable-resizing' );

				if ( this.isDocked ) {
					this.storage.size.width = refraction.helpers.getElementInlineStyle( this.$el, [ 'width' ] ).width;

					refractionCommon.storage.set( 'navigator', this.storage );
				} else {
					this.saveSize();
				}
			},
			resize: ( event, ui ) => {
				this.setSize( ui.size.width + 'px' );
			},
		};
	}

	initLayout() {
		this.show( new NavigatorLayout() );

		this.$el.draggable( this.getDraggableOptions() );
		this.$el.resizable( this.getResizableOptions() );
	}

	open( model, options ) {
		this.$el.show();

		this.setSize();

		if ( this.storage.docked ) {
			this.dock();
		}

		if ( model ) {
			model.trigger( 'request:edit' );
		}

		if ( options?.expandAllElements ) {
			this.currentView.elements.currentView.recursiveChildInvoke( 'toggleList', true );
		}

		this.saveStorage( 'visible', true );

		this.ensurePosition();

		refractionCommon.elements.$window.on( 'resize', this.ensurePosition );
	}

	close( silent ) {
		this.$el.hide();

		if ( this.isDocked ) {
			this.undock( true );
		}

		if ( ! silent ) {
			this.saveStorage( 'visible', false );
		}

		if ( this.$el.resizable( 'instance' ) ) {
			this.$el.resizable( 'destroy' );
		}

		refractionCommon.elements.$window.off( 'resize', this.ensurePosition );
	}

	isOpen() {
		return this.$el.is( ':visible' );
	}

	dock() {
		refractionCommon.elements.$body.addClass( 'refraction-navigator-docked' );
		this.setSize();

		const resizableOptions = this.getResizableOptions();

		this.$el.css( {
			height: '',
			top: '',
			bottom: '',
			left: '',
			right: '',
		} );

		if ( this.$el.resizable( 'instance' ) ) {
			this.$el.resizable( 'destroy' );
		}

		resizableOptions.handles = refractionCommon.config.isRTL ? 'e' : 'w';

		this.$el.resizable( resizableOptions );

		this.isDocked = true;

		this.saveStorage( 'docked', true );
	}

	undock( silent ) {
		refractionCommon.elements.$body.removeClass( 'refraction-navigator-docked' );
		this.setSize();

		refraction.$previewWrapper.css( refractionCommon.config.isRTL ? 'left' : 'right', '' );

		if ( this.$el.resizable( 'instance' ) ) {
			this.$el.resizable( 'destroy' );

			this.$el.resizable( this.getResizableOptions() );
		}

		this.isDocked = false;

		if ( ! silent ) {
			this.saveStorage( 'docked', false );
		}
	}

	/**
	 * Set the navigator size to a specific value or default to the storage-saved value.
	 *
	 * @param {string} size A specific new size.
	 */
	setSize( size = null ) {
		if ( size ) {
			this.storage.size.width = size;
		} else {
			this.storage.size.width = this.storage.size.width || refractionCommon.elements.$body.css( '--e-editor-navigator-width' );
		}

		// Set the navigator size using a CSS variable, and remove the inline CSS that was set by jQuery Resizeable.
		refractionCommon.elements.$body.css( '--e-editor-navigator-width', this.storage.size.width );
		this.$el.css( 'width', '' );
	}

	ensurePosition() {
		if ( this.isDocked ) {
			return;
		}

		const offset = this.$el.offset();

		if ( offset.left > innerWidth ) {
			this.$el.css( {
				left: '',
				right: '',
			} );
		}

		if ( offset.top > innerHeight ) {
			this.$el.css( {
				top: '',
				bottom: '',
			} );
		}
	}

	onDrag( event, ui ) {
		if ( this.isDocked ) {
			if ( ui.position.left === ui.originalPosition.left ) {
				if ( ui.position.top !== ui.originalPosition.top ) {
					return false;
				}
			} else {
				this.undock();
			}

			return;
		}

		if ( 0 > ui.position.top ) {
			ui.position.top = 0;
		}

		const isOutOfLeft = 0 > ui.position.left,
			isOutOfRight = ui.position.left + this.el.offsetWidth > innerWidth;

		if ( refractionCommon.config.isRTL ) {
			if ( isOutOfRight ) {
				ui.position.left = innerWidth - this.el.offsetWidth;
			}
		} else if ( isOutOfLeft ) {
			ui.position.left = 0;
		}

		refractionCommon.elements.$body.toggleClass( 'refraction-navigator--dock-hint', refractionCommon.config.isRTL ? isOutOfLeft : isOutOfRight );
	}

	onDragStop( event, ui ) {
		if ( this.isDocked ) {
			return;
		}

		this.saveSize();

		const elementRight = ui.position.left + this.el.offsetWidth;

		if ( 0 > ui.position.left || elementRight > innerWidth ) {
			this.dock();
		}

		refractionCommon.elements.$body.removeClass( 'refraction-navigator--dock-hint' );
	}

	onEditModeSwitched( activeMode ) {
		// Determine when the navigator should be visible.
		const visibleModes = [
			'edit',
			'picker',
		];

		if ( visibleModes.includes( activeMode ) && this.storage.visible ) {
			this.open();
		} else {
			this.close( true );
		}
	}

	onDocumentLoaded( document ) {
		if ( document.config.panel.has_elements ) {
			this.initLayout();

			if ( false !== this.storage.visible && ! refraction.config.starter ) {
				$e.route( 'navigator' );
			}
		}
	}

	onDocumentUnloaded() {
		if ( this.component.isOpen ) {
			this.component.close( true );
		}
	}
}

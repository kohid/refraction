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
		};
	},

	constructor() {
		BaseRegion.prototype.constructor.apply( this, arguments );

		var PanelLayoutView = require( 'refraction-regions/panel/layout' );

		this.show( new PanelLayoutView() );

		this.resizable();

		this.setSize();

		this.listenTo( refraction.channels.dataEditMode, 'switch', this.onEditModeSwitched );
	},

	setSize() {
		const savedWidth = this.storage.size.width;

		refractionCommon.elements.$body.css( '--e-editor-panel-width', savedWidth );
	},

	resizable() {
		var self = this;

		self.$el.resizable( {
			handles: refractionCommon.config.isRTL ? 'w' : 'e',
			minWidth: 250,
			maxWidth: 680,
			start() {
				refraction.$previewWrapper.addClass( 'ui-resizable-resizing' );
			},
			stop( event, ui ) {
				refraction.$previewWrapper.removeClass( 'ui-resizable-resizing' );

				refraction.getPanelView().updateScrollbar();

				self.saveSize( { width: ui.size.width + 'px' } );
			},
			resize( event, ui ) {
				refractionCommon.elements.$body.css( '--e-editor-panel-width', ui.size.width + 'px' );

				self.$el.css( {
					width: '',
					// For RTL
					left: '',
				} );
			},
		} );
	},

	onEditModeSwitched( activeMode ) {
		if ( 'edit' !== activeMode ) {
			return;
		}

		this.setSize();
	},
} );

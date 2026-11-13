const ControlSelect2View = require( 'refraction-controls/select2' );

module.exports = ControlSelect2View.extend( {
	$previewContainer: null,

	getSelect2Options() {
		return {
			dir: refractionCommon.config.isRTL ? 'rtl' : 'ltr',
			templateSelection: this.fontPreviewTemplate,
			templateResult: this.fontPreviewTemplate,
		};
	},

	/**
	 * The searchable font list (select2) is built when the control is first pointed at or focused: a section with
	 * several typography groups built one per group. Until then the plain select shows the chosen font.
	 */
	applySavedValue() {
		if ( this.fontSelectReady ) {
			ControlSelect2View.prototype.applySavedValue.apply( this, arguments );
			return;
		}

		ControlSelect2View.__super__.applySavedValue.apply( this, arguments );
	},

	onReady() {
		this.ui.select.one( 'pointerenter focus mousedown touchstart', ( event ) => {
			const opening = 'mousedown' === event.type || 'touchstart' === event.type;

			if ( opening ) {
				event.preventDefault();
			}

			this.buildFontSelect();

			if ( opening ) {
				this.ui.select.select2( 'open' );
			} else if ( 'focus' === event.type ) {
				this.$el.find( '.select2-selection' ).trigger( 'focus' );
			}
		} );
	},

	buildFontSelect() {
		if ( this.fontSelectReady || this.isDestroyed ) {
			return;
		}

		this.fontSelectReady = true;
		this.ui.select.off( 'pointerenter focus mousedown touchstart' );

		const self = this;
		this.ui.select.select2( this.getSelect2Options() );
		this.ui.select.on( 'select2:open', function() {
			self.$previewContainer = jQuery( '.select2-results__options[role="tree"]:visible' );
			// Load initial?
			setTimeout( function() {
				self.enqueueFontsInView();
			}, 100 );

			// On search
			jQuery( 'input.select2-search__field:visible' ).on( 'keyup', function() {
				self.typeStopDetection.action.apply( self );
			} );

			// On scroll
			self.$previewContainer.on( 'scroll', function() {
				self.scrollStopDetection.onScroll.apply( self );
			} );
		} );
	},

	typeStopDetection: {
		idle: 350,
		timeOut: null,
		action() {
			const parent = this,
				self = this.typeStopDetection;
			clearTimeout( self.timeOut );
			self.timeOut = setTimeout( function() {
				parent.enqueueFontsInView();
			}, self.idle );
		},
	},

	scrollStopDetection: {
		idle: 350,
		timeOut: null,
		onScroll() {
			const parent = this,
				self = this.scrollStopDetection;
			clearTimeout( self.timeOut );
			self.timeOut = setTimeout( function() {
				parent.enqueueFontsInView();
			}, self.idle );
		},
	},

	enqueueFontsInView() {
		const containerOffset = this.$previewContainer.offset(),
			top = containerOffset.top,
			bottom = top + this.$previewContainer.innerHeight(),
			fontsInView = [];

		this.$previewContainer.children().find( 'li:visible' ).each( function( index, font ) {
			const $font = jQuery( font ),
				offset = $font.offset();
			if ( offset && offset.top > top && offset.top < bottom ) {
				fontsInView.push( $font );
			}
		} );

		fontsInView.forEach( function( font ) {
			const fontFamily = jQuery( font ).find( 'span' ).html();
			refraction.helpers.enqueueFont( fontFamily, 'editor' );
		} );
	},

	fontPreviewTemplate( state ) {
		if ( ! state.id ) {
			return state.text;
		}

		return jQuery( '<span>', {
			text: state.text,
			css: {
				'font-family': state.element.value.toString(),
			},
		} );
	},

	templateHelpers() {
		var helpers = ControlSelect2View.prototype.templateHelpers.apply( this, arguments ),
			fonts = this.model.get( 'options' );

		helpers.getFontsByGroups = function( groups ) {
			var filteredFonts = {};

			_.each( fonts, function( fontType, fontName ) {
				if ( ( _.isArray( groups ) && _.contains( groups, fontType ) ) || fontType === groups ) {
					filteredFonts[ fontName ] = fontName;
				}
			} );

			return filteredFonts;
		};

		return helpers;
	},
} );

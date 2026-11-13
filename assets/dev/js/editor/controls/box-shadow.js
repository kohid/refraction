var ControlMultipleBaseItemView = require( 'refraction-controls/base-multiple' ),
	ControlBoxShadowItemView;

import ColorPicker from '../utils/color-picker';

ControlBoxShadowItemView = ControlMultipleBaseItemView.extend( {
	ui() {
		var ui = ControlMultipleBaseItemView.prototype.ui.apply( this, arguments );

		ui.sliders = '.refraction-slider';
		ui.colorPickerPlaceholder = '.refraction-color-picker-placeholder';

		return ui;
	},

	initSliders() {
		const value = this.getControlValue();

		this.ui.sliders.each( ( index, slider ) => {
			const $input = jQuery( slider ).next( '.refraction-slider-input' ).find( 'input' );

			const sliderInstance = noUiSlider.create( slider, {
				start: [ value[ slider.dataset.input ] ],
				step: 1,
				range: {
					min: +$input.attr( 'min' ),
					max: +$input.attr( 'max' ),
				},
				format: {
					to: ( sliderValue ) => +sliderValue.toFixed( 1 ),
					from: ( sliderValue ) => +sliderValue,
				},
			} );

			sliderInstance.on( 'slide', ( values ) => {
				const type = sliderInstance.target.dataset.input;

				$input.val( values[ 0 ] );

				this.setValue( type, values[ 0 ] );
			} );
		} );
	},

	initColors() {
		const value = this.getControlValue( 'color' ) || '';

		this.colorPicker = new ColorPicker( {
			picker: {
				el: this.ui.colorPickerPlaceholder[ 0 ],
				// A global color is saved as its CSS variable, which the picker can not read: shown once resolved.
				default: this.globalIdOf( value ) ? '' : value,
			},
			onChange: () => {
				// Showing a global color in the picker is not a color picked by hand.
				if ( this.showingGlobal ) {
					return;
				}

				this.setValue( 'color', this.colorPicker.getColor() );
				this.markGlobal( '' );
			},
			onClear: () => {
				this.setValue( 'color', '' );
				this.markGlobal( '' );
			},
		} );

		this.addGlobalColors( value );
	},

	/**
	 * The id of the global color a value links to (var(--e-global-color-ID)), or ''.
	 *
	 * @param {string} value The shadow's color.
	 * @return {string} The id.
	 */
	globalIdOf( value ) {
		const match = String( value || '' ).match( /^var\(\s*--e-global-color-([\w-]+)\s*\)$/ );

		return match ? match[ 1 ] : '';
	},

	/**
	 * Box and Text Shadow have their own color picker (not a Color setting), so they had no Global Colors: a globe in
	 * the picker lists the site's global colors; picking one saves the shadow's color as that color's CSS variable, so
	 * the shadow follows when the global color changes. A color picked by hand unlinks it.
	 *
	 * @param {string} value The saved color.
	 */
	addGlobalColors( value ) {
		const $tools = this.colorPicker.$pickerToolsContainer;
		const $app = jQuery( this.colorPicker.picker.getRoot().app );
		const $button = jQuery( '<button>', { type: 'button', class: 'e-control-tool rf-shadow-globals__toggle', title: __( 'Global Colors', 'refraction' ), 'aria-expanded': 'false' } )
			.append( jQuery( '<i>', { class: 'rficon-globe', 'aria-hidden': 'true' } ) );
		const $list = jQuery( '<div>', { class: 'rf-shadow-globals__list', hidden: true } );

		$tools.prepend( $button );
		$app.append( $list );

		$button.on( 'click', async ( event ) => {
			event.preventDefault();

			if ( ! $list.prop( 'hidden' ) ) {
				$list.prop( 'hidden', true );
				$button.attr( 'aria-expanded', 'false' );
				return;
			}

			const colors = await this.globalColors();

			$list.empty();
			Object.values( colors ).filter( ( color ) => color.value ).forEach( ( color ) => {
				const $item = jQuery( '<button>', { type: 'button', class: 'rf-shadow-globals__item', 'data-global-id': color.id } )
					.append( jQuery( '<span>', { class: 'rf-shadow-globals__swatch' } ).css( 'background-color', color.value ) )
					.append( jQuery( '<span>', { class: 'rf-shadow-globals__title' } ).text( color.title ) )
					.toggleClass( 'is-active', color.id === this.globalIdOf( this.getControlValue( 'color' ) ) );

				$item.on( 'click', () => this.pickGlobal( color ) );
				$list.append( $item );
			} );
			$list.prop( 'hidden', false );
			$button.attr( 'aria-expanded', 'true' );
		} );

		this.ui.globalsList = $list;

		// A saved global color: show its color and mark the picker as linked.
		const id = this.globalIdOf( value );

		if ( id ) {
			this.globalColors().then( ( colors ) => {
				const color = colors[ id ];

				if ( color && color.value && ! this.isDestroyed ) {
					this.showGlobal( color );
				}
			} );
		}
	},

	async globalColors() {
		try {
			const result = await $e.data.get( 'globals/colors' );

			return ( result && result.data ) || {};
		} catch ( e ) {
			return {};
		}
	},

	pickGlobal( color ) {
		this.setValue( 'color', `var(--e-global-color-${ color.id })` );
		this.showGlobal( color );
		this.ui.globalsList.prop( 'hidden', true );
		this.colorPicker.picker.hide();
	},

	// The picker shows a global color's value without saving it (the setting keeps the link).
	showGlobal( color ) {
		this.showingGlobal = true;

		try {
			this.colorPicker.picker.setColor( color.value, true );
		} finally {
			window.setTimeout( () => ( this.showingGlobal = false ), 0 );
		}

		this.markGlobal( color.title );
	},

	// The picker's button shows which global color the shadow uses (title) and a ring.
	markGlobal( title ) {
		const button = this.colorPicker && this.colorPicker.picker.getRoot().button;

		if ( button ) {
			button.classList.toggle( 'rf-shadow-global', !! title );
			button.title = title ? sprintf( __( 'Global color: %s', 'refraction' ), title ) : '';
		}
	},

	onInputChange( event ) {
		var type = event.currentTarget.dataset.setting,
			$slider = this.ui.sliders.filter( '[data-input="' + type + '"]' );

		$slider[ 0 ].noUiSlider.set( this.getControlValue( type ) );
	},

	onReady() {
		this.initSliders();
		this.initColors();
	},

	onBeforeDestroy() {
		this.colorPicker?.destroy();
	},
} );

module.exports = ControlBoxShadowItemView;

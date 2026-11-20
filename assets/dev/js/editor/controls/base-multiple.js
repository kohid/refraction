var ControlBaseDataView = require( 'refraction-controls/base-data' ),
	ControlBaseMultipleItemView;

ControlBaseMultipleItemView = ControlBaseDataView.extend( {

	applySavedValue() {
		var values = this.getControlValue(),
			$inputs = this.$( '[data-setting]' ),
			self = this;

		_.each( values, function( value, key ) {
			var $input = $inputs.filter( function() {
				return key === this.dataset.setting;
			} );

			self.setInputValue( $input, value );
		} );
	},

	getControlValue( key ) {
		var values = this.container.settings.get( this.model.get( 'name' ) );

		if ( ! jQuery.isPlainObject( values ) ) {
			return {};
		}

		if ( key ) {
			var value = values[ key ];

			if ( undefined === value ) {
				value = '';
			}

			return value;
		}

		return refractionCommon.helpers.cloneObject( values );
	},

	/**
	 * @inheritDoc
	 */
	getCleanControlValue( key ) {
		const values = Object.fromEntries(
			Object.entries( this.getControlValue() )
				.filter( ( [ k, v ] ) => {
					return v && this.model.get( 'default' )[ k ] !== v;
				} ),
		);

		if ( key ) {
			return values?.[ key ];
		}

		return Object.keys( values ).length ? values : undefined;
	},

	setValue( key, value ) {
		var values = this.getControlValue();

		if ( 'object' === typeof key ) {
			_.each( key, function( internalValue, internalKey ) {
				values[ internalKey ] = internalValue;
			} );
		} else {
			values[ key ] = value;
		}

		const filled = this.fillFromParent( values );

		this.setSettingsModel( values );

		if ( filled ) {
			this.applySavedValue();
		}
	},

	/**
	 * A box or text shadow on a smaller device starts blank (a blank part writes no CSS, so the larger device's
	 * shadow shows). When one part is changed there, the blank parts take the larger device's (or the desktop's)
	 * values, so the shadow is complete at once (0.131.0, Controls_Stack::auto_responsive()).
	 *
	 * @param {Object} values The new value, changed in place.
	 * @return {boolean} Whether any part was filled.
	 */
	fillFromParent( values ) {
		const isBlank = ( v ) => '' === v || undefined === v || null === v;

		if ( ! this.model.get( 'fill_from_parent' ) || ! this.model.get( 'parent' ) ) {
			return false;
		}

		const blank = Object.keys( values ).filter( ( k ) => isBlank( values[ k ] ) );

		if ( ! blank.length || blank.length === Object.keys( values ).length ) {
			return false;
		}

		const controls = this.container.settings.controls || {},
			typeDefault = refraction.config.controls[ this.model.get( 'type' ) ]?.default_value || {};

		let name = this.model.get( 'parent' );

		while ( name ) {
			const raw = this.container.settings.get( name ),
				plain = raw && raw.toJSON ? raw.toJSON() : raw;

			if ( plain && 'object' === typeof plain ) {
				blank.forEach( ( k ) => {
					if ( isBlank( values[ k ] ) && ! isBlank( plain[ k ] ) ) {
						values[ k ] = plain[ k ];
					}
				} );
			}

			name = controls[ name ]?.parent;
		}

		blank.forEach( ( k ) => {
			if ( isBlank( values[ k ] ) && undefined !== typeDefault[ k ] ) {
				values[ k ] = typeDefault[ k ];
			}
		} );

		return true;
	},

	updateElementModel( value, input ) {
		var key = input.dataset.setting;

		this.setValue( key, value );
	},
}, {
	// Static methods
	getStyleValue( placeholder, controlValue ) {
		if ( ! _.isObject( controlValue ) ) {
			return ''; // Invalid
		}

		return controlValue[ placeholder.toLowerCase() ];
	},
} );

module.exports = ControlBaseMultipleItemView;

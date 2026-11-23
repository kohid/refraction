import { createConditionsEditor, h, SEARCH_DELAY } from './conditions-editor';

/**
 * Display Conditions control of the Theme Builder templates: the shared conditions picker (conditions-editor.js), which
 * the Theme Builder list also uses.
 */

const config = window.refractionThemeBuilder || { conditions: [], canEdit: false };

const BaseData = window.refraction.modules.controls.BaseData;

const ConditionsControl = BaseData.extend( {

	onRender() {
		BaseData.prototype.onRender.apply( this, arguments );

		const mount = this.el.querySelector( '[data-tb-mount]' );

		this.picker = mount ? createConditionsEditor( {
			mount,
			config,
			value: this.getControlValue(),
			onChange: ( rules ) => {
				this.ownChange = true;
				this.setValue( rules );
				this.ownChange = false;
			},
		} ) : null;
	},

	applySavedValue() {
		if ( this.picker && ! this.ownChange ) {
			this.picker.setValue( this.getControlValue() );
		}
	},
} );

if ( window.refraction && window.refraction.addControlView ) {
	window.refraction.addControlView( 'refraction_conditions', ConditionsControl );
}

export { h, config, SEARCH_DELAY };

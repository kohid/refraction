var ControlBaseDataView = require( 'refraction-controls/base-data' ),
	ControlStructureItemView;

ControlStructureItemView = ControlBaseDataView.extend( {
	ui() {
		var ui = ControlBaseDataView.prototype.ui.apply( this, arguments );

		ui.resetStructure = '.refraction-control-structure-reset';

		return ui;
	},

	events() {
		return _.extend( ControlBaseDataView.prototype.events.apply( this, arguments ), {
			'click @ui.resetStructure': 'onResetStructureClick',
		} );
	},

	templateHelpers() {
		var helpers = ControlBaseDataView.prototype.templateHelpers.apply( this, arguments );

		helpers.getMorePresets = this.getMorePresets.bind( this );

		return helpers;
	},

	getCurrentEditedSection() {
		var editor = refraction.getPanelView().getCurrentPageView();

		return editor.getOption( 'editedElementView' );
	},

	getMorePresets() {
		var parsedStructure = refraction.presetsFactory.getParsedStructure( this.getControlValue() );

		return refraction.presetsFactory.getPresets( parsedStructure.columnsCount );
	},

	onResetStructureClick() {
		this.getCurrentEditedSection().resetColumnsCustomSize();
	},
} );

module.exports = ControlStructureItemView;

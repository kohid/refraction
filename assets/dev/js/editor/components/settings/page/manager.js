import Component from './component';
import ChildrenArray from 'refraction-editor/container/model/children-array';

var BaseSettings = require( 'refraction-editor/components/settings/base/manager' );

module.exports = BaseSettings.extend( {
	getStyleId() {
		return this.getSettings( 'name' ) + '-' + refraction.documents.getCurrent().id;
	},

	onInit() {
		BaseSettings.prototype.onInit.apply( this );

		$e.components.register( new Component( { manager: this } ) );
	},

	save() {},

	getDataToSave( data ) {
		data.id = refraction.config.document.id;

		return data;
	},

	// Emulate an element view/model structure with the parts needed for a container.
	getEditedView() {
		if ( this.editedView ) {
			return this.editedView;
		}

		const documentElementType = refraction.elementsManager.getElementTypeClass( 'document' ),
			ModelClass = documentElementType.getModel(),
			type = this.getContainerType(),
			editModel = new ModelClass( {
				id: type,
				elType: type,
				settings: this.model,
				elements: refraction.elements,
			} ),
			container = new refractionModules.editor.Container( {
				type,
				id: editModel.id,
				model: editModel,
				settings: editModel.get( 'settings' ),
				label: refraction.config.document.panel.title,
				controls: this.model.controls,
				children: new ChildrenArray( ... refraction.elements || [] ),
				parent: false,
				// Emulate a view that can render the style.
				renderer: {
					view: {
						lookup: () => container,
						renderOnChange: () => this.updateStylesheet(),
						renderUI: () => this.updateStylesheet(),
					},
				},
			} );

		this.editedView = {
			getContainer: () => container,
			getEditModel: () => editModel,
			model: editModel,
			container,
		};

		return this.editedView;
	},

	getContainerType() {
		return 'document';
	},

	/**
	 * @deprecated since 3.7.0, use `getContainerType()` instead.
	 */
	getContainerId() {
		refractionDevTools.deprecation.deprecated( 'getContainerId()', '3.7.0', 'getContainerType()' );

		return this.getContainerType();
	},
} );

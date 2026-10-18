const EditorModule = refractionModules.Module.extend( {

	onInit() {
		const $window = jQuery( window );

		$window.on( 'refraction:init-components',
			this.onRefractionInitComponents.bind( this ) );

		$window.on( 'refraction:loaded', () => {
			this.onRefractionLoaded();

			refraction.on( 'document:loaded', this.onDocumentLoaded.bind( this ) );
		} );

		$window.on( 'refraction:init', this.onRefractionReady );
	},

	// TODO: Delete as soon as possible.
	getEditorControlView( name ) {
		const editor = refraction.getPanelView().getCurrentPageView();

		return editor.children.findByModelCid( this.getEditorControlModel( name )?.cid );
	},

	// TODO: Delete as soon as possible.
	getEditorControlModel( name ) {
		const editor = refraction.getPanelView().getCurrentPageView();

		return editor.collection.findWhere( { name } );
	},

	onRefractionReady() {
		this.onRefractionInit();

		refraction
			.on( 'frontend:init', this.onRefractionFrontendInit.bind( this ) )
			.on( 'preview:loaded', this.onRefractionPreviewLoaded.bind( this ) );
	},
} );

EditorModule.prototype.onRefractionLoaded = function() {};

EditorModule.prototype.onRefractionInit = function() {};

EditorModule.prototype.onRefractionPreviewLoaded = function() {};

EditorModule.prototype.onDocumentLoaded = function() {};

EditorModule.prototype.onRefractionFrontendInit = function() {};

EditorModule.prototype.onRefractionInitComponents = function() {};

module.exports = EditorModule;

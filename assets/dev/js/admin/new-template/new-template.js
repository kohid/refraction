var NewTemplateLayout = require( 'refraction-admin/new-template/layout' );

var NewTemplateModule = refractionModules.ViewModule.extend( {

	getDefaultSettings() {
		return {
			selectors: {
				addButton: 'a.page-title-action[href*="post-new.php?post_type=refraction_library"], #refraction-template-library-add-new',
			},
		};
	},

	getDefaultElements() {
		var selectors = this.getSettings( 'selectors' );

		return {
			$addButton: jQuery( selectors.addButton ),
		};
	},

	bindEvents() {
		this.elements.$addButton.on( 'click', this.onAddButtonClick );

		refractionCommon.elements.$window.on( 'hashchange', this.showModalByHash.bind( this ) );
	},

	showModalByHash() {
		if ( '#add_new' === location.hash ) {
			this.layout?.showModal();

			location.hash = '';
		}
	},

	onInit() {
		refractionModules.ViewModule.prototype.onInit.apply( this, arguments );

		this.layout = new NewTemplateLayout();

		this.showModalByHash();
	},

	onAddButtonClick( event ) {
		event.preventDefault();

		this.layout?.showModal();
	},
} );

jQuery( function() {
	window.refractionNewTemplate = new NewTemplateModule();
} );

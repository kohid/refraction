import FloatingButtonsHandler from './floating-buttons';

export default class extends refractionModules.Module {
	constructor() {
		super();

		refractionCommon.elements.$window.on( 'refraction/admin/init', () => {
			this.runHandler();
		} );
	}

	runHandler() {
		const pageNameContact = 'e-floating-buttons',
			paths = {
				contactPagesTablePage: 'edit.php?post_type=' + pageNameContact,
				contactPagesAddNewPage: 'edit.php?post_type=refraction_library&page=' + pageNameContact,
				contactPagesTrashPage: 'edit.php?post_status=trash&post_type=' + pageNameContact,
			},
			args = {
				paths,
			};

		// This class modifies elements in the WordPress admin that are rendered "wrong" by the WordPress core
		// and could not be modified in the backend.
		new FloatingButtonsHandler( args );
	}
}

module.exports = Marionette.ItemView.extend( {
	template: '#tmpl-refraction-template-library-header-actions',

	id: 'refraction-template-library-header-actions',

	ui: {
		import: '#refraction-template-library-header-import',
		importIcon: '#refraction-template-library-header-import i',
		sync: '#refraction-template-library-header-sync',
		syncIcon: '#refraction-template-library-header-sync i',
		save: '#refraction-template-library-header-save',
		saveIcon: '#refraction-template-library-header-save i',
	},

	events: {
		'click @ui.import': 'onImportClick',
		'click @ui.sync': 'onSyncClick',
		'click @ui.save': 'onSaveClick',
	},

	onImportClick() {
		$e.route( 'library/import' );
	},

	onRender() {
		const currentTab = $e.components.get( 'library' ).currentTab ?? '';

		this.ui.import.toggleClass( 'refraction-hidden', 'templates/my-templates' !== currentTab );
	},

	onSyncClick() {
		var self = this;

		self.ui.syncIcon.addClass( 'rficon-animation-spin' );

		refraction.templates.requestLibraryData( {
			onUpdate() {
				self.ui.syncIcon.removeClass( 'rficon-animation-spin' );

				$e.routes.refreshContainer( 'library' );
			},
			forceUpdate: true,
			forceSync: true,
		} );
	},

	onSaveClick() {
		$e.route( 'library/save-template' );
	},
} );

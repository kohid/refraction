module.exports = Marionette.ItemView.extend( {
	tagName: 'main',

	template: '#tmpl-refraction-template-library-connect',

	id: 'refraction-template-library-connect',

	ui: {
		connect: '#refraction-template-library-connect__button',
		thumbnails: '#refraction-template-library-connect-thumbnails',
	},

	templateHelpers() {
		return this.getOption( 'texts' );
	},

	onRender() {
		refraction.templates.eventManager.sendPageViewEvent( {
			location: refractionCommon.eventsManager.config.secondaryLocations.templateLibrary.cloudTabConnect,
		} );

		this.ui.connect.refractionConnect( {
			parseUrl: ( url ) => url.replace( '%%template_type%%', this.model.get( 'type' ) ),
			success: () => {
				refraction.config.library_connect.is_connected = true;

				// If is connecting during insert template.
				if ( this.getOption( 'model' ) ) {
					$e.run( 'library/insert-template', {
						model: this.getOption( 'model' ),
					} );
				} else {
					$e.run( 'library/close' );
					refraction.notifications.showToast( {
						message: __( 'Connected successfully.', 'refraction' ),
					} );
				}
			},
			error: () => {
				refraction.config.library_connect.is_connected = false;
			},
		} );
	},
} );

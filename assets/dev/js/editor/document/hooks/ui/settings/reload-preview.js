import After from 'refraction-api/modules/hooks/ui/after';

export class ReloadPreview extends After {
	getCommand() {
		return 'document/elements/settings';
	}

	getId() {
		return 'save-layout';
	}

	getContainerType() {
		return 'document';
	}

	getConditions( args ) {
		return !! args.settings.template;
	}

	apply() {
		return $e.run( 'document/save/auto', { force: true } )
			.then( () => {
				refraction.reloadPreview();

				// TODO: Fix the route change.
				refraction.once( 'preview:loaded', () => {
					$e.route( 'panel/page-settings/settings' );
				} );
			} );
	}
}

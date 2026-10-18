import { getElementDefaults, updateElementDefaults } from '../api';
import extractContainerSettings from '../extract-container-settings';
import { extractElementType } from '../utils';

export default class Create extends $e.modules.editor.CommandContainerBase {
	validateArgs() {
		this.requireContainer();
	}

	async apply( { container } ) {
		$e.internal( 'panel/state-loading' );

		const type = extractElementType( container.model ),
			previousDefaults = getElementDefaults( type ),
			newDefaults = extractContainerSettings( container );

		try {
			await updateElementDefaults( type, newDefaults );

			refraction.notifications.showToast( {
				message: __( 'Default settings changed.', 'refraction' ),
				buttons: [ {
					name: 'undo',
					text: __( 'Undo', 'refraction' ),
					callback() {
						$e.run( 'kit-elements-defaults/restore', {
							type,
							settings: previousDefaults,
						} );
					},
				} ],
			} );
		} catch ( error ) {
			refraction.notifications.showToast( {
				message: __( 'An error occurred.', 'refraction' ),
			} );

			throw error;
		} finally {
			$e.internal( 'panel/state-ready' );
		}
	}
}

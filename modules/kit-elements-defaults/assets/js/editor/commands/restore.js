import { updateElementDefaults } from '../api';

export default class Restore extends $e.modules.CommandBase {
	async apply( { type, settings } ) {
		$e.internal( 'panel/state-loading' );

		try {
			await updateElementDefaults( type, settings );

			refraction.notifications.showToast( {
				message: __( 'Previous settings restored.', 'refraction' ),
			} );
		} catch ( e ) {
			refraction.notifications.showToast( {
				message: __( 'An error occurred.', 'refraction' ),
			} );

			throw e;
		} finally {
			$e.internal( 'panel/state-ready' );
		}
	}
}

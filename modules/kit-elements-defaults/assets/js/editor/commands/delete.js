import { deleteElementDefaults } from '../api';

export default class Delete extends $e.modules.CommandBase {
	async apply( { type } ) {
		$e.internal( 'panel/state-loading' );

		try {
			await deleteElementDefaults( type );

			refraction.notifications.showToast( {
				message: __( 'Default settings has been reset.', 'refraction' ),
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

import { useCallback } from 'react';
import { useSuppressedMessage } from '@refraction/editor-current-user';
import { notify } from '@refraction/editor-notifications';
import { __ } from '@wordpress/i18n';

const MESSAGE_KEY = 'atomic_elements_promo';

export const usePromoSuppressedMessage = () => {
	const [ suppressed, setSuppressMessage ] = useSuppressedMessage( MESSAGE_KEY );

	const toggleSuppressMessage = useCallback( () => {
		if ( ! suppressed ) {
			setSuppressMessage();
			notify( {
				type: 'default',
				message: __( 'You can enable the Atomic editor anytime from Editor Settings.', 'refraction' ),
				id: MESSAGE_KEY,
			} );
		}
	}, [ suppressed, setSuppressMessage ] );

	return [ suppressed, toggleSuppressMessage ] as const;
};

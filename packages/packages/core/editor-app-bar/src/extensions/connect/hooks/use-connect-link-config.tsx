import { useCallback } from 'react';
import { UserIcon } from '@elementor/icons';
import { __ } from '@wordpress/i18n';

import { type ExtendedWindow } from '../../../types';

const dispatchConnectClickEvent = ( eventName: string ) => {
	try {
		const extendedWindow = window as unknown as ExtendedWindow;
		const config = extendedWindow?.refractionCommon?.eventsManager?.config;

		if ( config ) {
			extendedWindow.refractionCommon.eventsManager.dispatchEvent( config.names.topBar[ eventName ], {
				location: config.locations.topBar,
				secondaryLocation: config.secondaryLocations.eLogoMenu,
				trigger: config.triggers.dropdownClick,
				element: config.elements.buttonIcon,
			} );
		}
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.warn( error );
	}
};

export default function useConnectLinkConfig() {
	const extendedWindow = window as unknown as ExtendedWindow;
	let isUserConnected = false;
	const isPro = extendedWindow?.refraction?.helpers.hasPro();
	let target = '_blank';
	if ( isPro ) {
		isUserConnected = extendedWindow?.refractionPro?.config.isActive ?? false;
	} else {
		isUserConnected = extendedWindow?.refractionCommon?.config.library_connect.is_connected ?? false;
		target = '_self';
	}

	const handleConnectClick = useCallback(
		( event: React.MouseEvent< HTMLElement > ) => {
			event.preventDefault();

			if ( extendedWindow.jQuery && extendedWindow.jQuery.fn?.refractionConnect ) {
				const connectUrl = extendedWindow?.refraction?.config.user.top_bar.connect_url;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const $tempButton = ( extendedWindow as any ).jQuery( '<a>' );
				$tempButton
					?.attr( 'href', connectUrl )
					?.attr( 'target', '_blank' )
					?.attr( 'rel', 'opener' )
					?.css( 'display', 'none' )
					?.appendTo( 'body' );

				$tempButton.refractionConnect( {
					success: () => {
						dispatchConnectClickEvent( 'accountConnected' );

						setTimeout( () => {
							extendedWindow.location.reload();
						}, 200 );
					},
				} );

				$tempButton[ 0 ].click();
				dispatchConnectClickEvent( 'connectAccount' );

				setTimeout( () => {
					$tempButton.remove();
				}, 1000 );
			}
		},
		[ extendedWindow ]
	);

	return isUserConnected
		? {
				title: __( 'My Refraction', 'refraction' ),
				href: extendedWindow?.refraction?.config.user.top_bar.my_refraction_url,
				icon: UserIcon,
				target: '_blank',
		  }
		: {
				title: __( 'Connect my account', 'refraction' ),
				href: extendedWindow?.refraction?.config.user.top_bar.connect_url,
				icon: UserIcon,
				target,
				onClick: handleConnectClick,
		  };
}

import BarButton from '../bar-button/bar-button';
import { useRef, useEffect } from 'react';

export default function ConnectionButton() {
	const buttonRef = useRef();
	const isUserConnected = refractionAdminTopBarConfig.is_user_connected;

	useEffect( () => {
		if ( ! buttonRef.current || isUserConnected ) {
			return;
		}

		jQuery( buttonRef.current ).refractionConnect();
	}, [] );

	let tooltipText = __( 'Connect your account to get access to Refraction\'s Template Library & more.', 'refraction' ),
		connectUrl = refractionAdminTopBarConfig.connect_url,
		buttonText = __( 'Connect Account', 'refraction' ),
		targetUrl = '_self';

	if ( isUserConnected ) {
		tooltipText = '';
		connectUrl = 'https://go.elementor.com/wp-dash-admin-bar-account/';
		buttonText = __( 'My Refraction', 'refraction' );
		targetUrl = '_blank';
	}

	return (
		<BarButton icon="eicon-user-circle-o" buttonRef={ buttonRef } dataInfo={ tooltipText } href={ connectUrl } target={ targetUrl }>{ buttonText }</BarButton>
	);
}


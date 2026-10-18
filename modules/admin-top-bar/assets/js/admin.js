import ReactUtils from 'refraction-utils/react';
import AdminTopBar from './admin-top-bar';

const AppWrapper = refractionCommon.config.isDebug ? React.StrictMode : React.Fragment;
const adminTopBarElement = document.getElementById( 'e-admin-top-bar-root' );

ReactUtils.render( (
	<AppWrapper>
		<AdminTopBar />
	</AppWrapper>
), adminTopBarElement );

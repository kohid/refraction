export default function useAction() {
	return {
		backToDashboard: () => {
			if ( window.top === window ) {
				window.top.location = refractionAppConfig.admin_url;
			} else {
				// Iframe.
				window.top.$e.run( 'app/close' );
			}
		},
		backToReferrer: () => {
			if ( window.top === window ) {
				// Directly - in case that the return_url is the login-page, the target should be the admin-page and not the login-page again.
				window.top.location = refractionAppConfig.return_url.includes( refractionAppConfig.login_url ) ? refractionAppConfig.admin_url : refractionAppConfig.return_url;
			} else {
				// Iframe.
				window.top.$e.run( 'app/close' );
			}
		},
	};
}

import WpDashboardTracking from '../wp-dashboard-tracking';

export const DashboardUtils = {
	isRefractionPage() {
		const urlParams = new URLSearchParams( window.location.search );
		const page = urlParams.get( 'page' );

		if ( page && WpDashboardTracking.refractionPages.some( ( p ) => page.includes( p ) ) ) {
			return true;
		}

		const postType = urlParams.get( 'post_type' );

		if ( WpDashboardTracking.refractionPostTypes.includes( postType ) ) {
			return true;
		}

		const body = document.body;
		const bodyClasses = body.className.split( ' ' );

		return bodyClasses.some( ( cls ) =>
			cls.includes( 'refraction' ) &&
			( cls.includes( 'page' ) || cls.includes( 'post-type' ) ),
		);
	},
};

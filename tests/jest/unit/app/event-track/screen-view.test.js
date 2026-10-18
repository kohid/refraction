import ScreenViewTracking from 'refraction-app/event-track/dashboard/screen-view';
import WpDashboardTracking from 'refraction-app/event-track/wp-dashboard-tracking';
import { DashboardUtils } from 'refraction-app/event-track/dashboard/utils';

jest.mock( 'refraction-app/event-track/wp-dashboard-tracking' );
jest.mock( 'refraction-app/event-track/dashboard/utils' );

describe( 'ScreenViewTracking', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		ScreenViewTracking.trackedScreens.clear();
	} );

	test( 'init should track initial screen view if it is a Refraction page', () => {
		DashboardUtils.isRefractionPage.mockReturnValue( true );

		// Mock getScreenData
		const screenData = { screenId: 'refraction-settings', screenType: 'top_level_page' };
		jest.spyOn( ScreenViewTracking, 'getScreenData' ).mockReturnValue( screenData );

		ScreenViewTracking.init();

		expect( WpDashboardTracking.trackScreenViewed ).toHaveBeenCalledWith(
			'refraction-settings',
			'top_level_page',
		);
	} );

	test( 'init should not track initial screen view if it is not a Refraction page', () => {
		DashboardUtils.isRefractionPage.mockReturnValue( false );

		ScreenViewTracking.init();

		expect( WpDashboardTracking.trackScreenViewed ).not.toHaveBeenCalled();
	} );
} );

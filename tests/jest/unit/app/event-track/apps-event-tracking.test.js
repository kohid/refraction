describe( 'AppsEventTracking', () => {
	afterEach( () => {
		delete window.refractionCommon;
		jest.resetModules();
	} );

	test( 'dispatchEvent does not throw when refractionCommon is missing', () => {
		delete window.refractionCommon;

		jest.isolateModules( () => {
			const { AppsEventTracking } = require( 'refraction-app/event-track/apps-event-tracking' );

			expect( () => AppsEventTracking.dispatchEvent( 'test_event', { a: 1 } ) ).not.toThrow();
			expect( AppsEventTracking.dispatchEvent( 'test_event', { a: 1 } ) ).toBeUndefined();
		} );
	} );

	test( 'dispatchEvent calls refractionCommon.eventsManager.dispatchEvent when available', () => {
		const dispatchEvent = jest.fn();

		window.refractionCommon = {
			eventsManager: {
				dispatchEvent,
			},
		};

		jest.isolateModules( () => {
			const { AppsEventTracking } = require( 'refraction-app/event-track/apps-event-tracking' );

			AppsEventTracking.dispatchEvent( 'my_event', { a: 1 } );

			expect( dispatchEvent ).toHaveBeenCalledWith( 'my_event', { a: 1 } );
		} );
	} );
} );


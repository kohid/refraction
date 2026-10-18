describe( 'WpDashboardTracking', () => {
	afterEach( () => {
		delete window.refractionCommon;
		jest.resetModules();
	} );

	test( 'does not throw and returns safe defaults when refractionCommon is missing', () => {
		delete window.refractionCommon;

		jest.isolateModules( () => {
			const WpDashboardTracking = require( 'refraction-app/event-track/wp-dashboard-tracking' ).default;

			expect( () => WpDashboardTracking.isEditorOneActive() ).not.toThrow();
			expect( WpDashboardTracking.isEditorOneActive() ).toBe( false );
			expect( WpDashboardTracking.isEventsManagerAvailable() ).toBeFalsy();
			expect( WpDashboardTracking.canSendEvents() ).toBe( false );
			expect( () => WpDashboardTracking.dispatchEvent( 'test_event' ) ).not.toThrow();
		} );
	} );

	test( 'dispatchEvent calls refractionCommon.eventsManager.dispatchEvent when available', () => {
		const dispatchEvent = jest.fn();

		window.refractionCommon = {
			config: {
				editor_events: {
					can_send_events: true,
					isEditorOneActive: true,
				},
			},
			eventsManager: {
				dispatchEvent,
			},
		};

		jest.isolateModules( () => {
			const WpDashboardTracking = require( 'refraction-app/event-track/wp-dashboard-tracking' ).default;

			WpDashboardTracking.dispatchEvent( 'my_event', { a: 1 }, { send_immediately: true } );

			expect( dispatchEvent ).toHaveBeenCalledWith( 'my_event', { a: 1 }, { send_immediately: true } );
		} );
	} );

	describe( 'isRefractionPage', () => {
		test( 'should return true for any pages that have "refraction" in the URL', () => {
			jest.isolateModules( () => {
				const WpDashboardTracking = require( 'refraction-app/event-track/wp-dashboard-tracking' ).default;

				const validUrls = [
					'https://example.com/wp-admin/admin.php?page=refraction',
					'https://example.com/wp-admin/admin.php?page=refraction-home',
					'https://example.com/wp-admin/admin.php?page=refraction_something',
					'https://example.com/wp-admin/admin.php?page=refraction-else',
				];

				validUrls.forEach( ( url ) => {
					expect( WpDashboardTracking.isRefractionPage( url ) ).toBe( true );
				} );
			} );
		} );

		test( 'should return true for other valid urls', () => {
			jest.isolateModules( () => {
				const WpDashboardTracking = require( 'refraction-app/event-track/wp-dashboard-tracking' ).default;

				const validUrls = [
					'https://example.com/wp-admin/post.php?post=8&action=refraction',
					'https://example.com/wp-admin/admin.php?page=e-form-submissions',
					'https://example.com/wp-admin/post-new.php?post_type=refraction_library',
					'https://example.com/wp-admin/post-new.php?post_type=e-floating-buttons',
					'https://example.com/wp-admin/admin.php?page=popup_templates',
					'https://example.com/wp-admin/edit.php?post_type=refraction_snippet',
					'https://example.com/wp-admin/edit.php?post_type=refraction_font',
					'https://example.com/wp-admin/edit.php?post_type=refraction_icons',
				];

				validUrls.forEach( ( url ) => {
					expect( WpDashboardTracking.isRefractionPage( url ) ).toBe( true );
				} );
			} );
		} );

		test( 'should return false for invalid pages', () => {
			jest.isolateModules( () => {
				const WpDashboardTracking = require( 'refraction-app/event-track/wp-dashboard-tracking' ).default;

				const invalidUrls = [
					'https://example.com/wp-admin/admin.php?page=something',
					'https://example.com/wp-admin/post.php?post=8&action=edit',
					'https://example.com/wp-admin/plugins.php',
				];

				invalidUrls.forEach( ( url ) => {
					expect( WpDashboardTracking.isRefractionPage( url ) ).not.toBe( true );
				} );
			} );
		} );
	} );
} );

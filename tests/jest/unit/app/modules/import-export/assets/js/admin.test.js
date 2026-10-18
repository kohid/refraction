describe( 'Import Export Admin Test', () => {
	beforeEach( () => {
		window.refractionImportExport = {
			lastImportedSession: {
				kit_title: 'Kit Title',
			},
			appUrl: 'https://example.com/kit-library',
		};
	} );

	afterEach( () => {
		// Cleanup
		delete window.refractionAppConfig;
		window.document.body.innerHTML = '';
	} );

	require( 'refraction/app/modules/import-export/assets/js/admin.js' );

	it( 'should check if "kit deleted" dialog is not shown without confirming a delete when on the admin page', () => {
		// Arrange
		window.refractionCommon = {
			dialogsManager: {
				createWidget: jest.fn( () => {
					return {
						show: jest.fn( () => {} ),
					};
				} ),
			},
		};

		// Act
		window.dispatchEvent( new Event( 'load' ) );

		// No Kit referrer dialog shown without referrer in cache
		expect( window.refractionCommon.dialogsManager.createWidget ).not.toHaveBeenCalled();
	} );

	it( 'should check if the referred "kit deleted" dialog is shown when referred from Kit library', () => {
		// Arrange
		window.refractionCommon = {
			dialogsManager: {
				createWidget: jest.fn( ( type, options ) => {
					// Auto confirm
					sessionStorage.setItem( 'refraction-kit-data', JSON.stringify( {
						referrerKitId: '123',
						activeKitName: 'Active Kit Name',
					} ) );

					// To expect
					window.refractionCommon.lastWidgetHeaderMessage = options.headerMessage;
					window.refractionCommon.lastWidgetMessage = options.message;
					return {
						show: jest.fn( () => {} ),
					};
				} ),
			},
		};
		window.document.body.innerHTML = `
			<button id="refraction-import-export__revert_kit">
			</button>
		`;

		// Act
		window.dispatchEvent( new Event( 'load' ) );

		// Set Cache
		document.getElementById( 'refraction-import-export__revert_kit' ).click();

		// Confirmation Widget
		expect( window.refractionCommon.dialogsManager.createWidget ).toHaveBeenCalledTimes( 1 );
		expect( window.refractionCommon.lastWidgetHeaderMessage ).toEqual( 'Are you sure?' );
		expect( window.refractionCommon.lastWidgetMessage ).toEqual( 'Removing Kit Title will permanently delete changes made to the Websites Template\'s content and site settings' );

		// Simulate reload
		window.dispatchEvent( new Event( 'load' ) );

		// Kit deleted dialog
		expect( window.refractionCommon.dialogsManager.createWidget ).toHaveBeenCalledTimes( 2 );
		expect( window.refractionCommon.lastWidgetHeaderMessage ).toEqual( 'Active Kit Name was successfully deleted' );
		expect( window.refractionCommon.lastWidgetMessage ).toEqual( 'You\'re ready to apply a new Kit!' );
	} );

	it( 'should check if the non-referred "kit deleted" dialog is shown when not referred from Kit library', () => {
		// Arrange
		window.refractionCommon = {
			dialogsManager: {
				createWidget: jest.fn( ( type, options ) => {
					// Auto confirm
					sessionStorage.setItem( 'refraction-kit-data', JSON.stringify( {
						referrerKitId: '', // Non referred
						activeKitName: 'Active Kit Name',
					} ) );

					// To expect
					window.refractionCommon.lastWidgetHeaderMessage = options.headerMessage;
					window.refractionCommon.lastWidgetMessage = options.message;

					return {
						show: jest.fn( () => {} ),
					};
				} ),
			},
		};
		window.document.body.innerHTML = `
			<button id="refraction-import-export__revert_kit">
			</button>
		`;

		// Act
		window.dispatchEvent( new Event( 'load' ) );

		// Set Cache
		document.getElementById( 'refraction-import-export__revert_kit' ).click();

		// Confirmation Widget
		expect( window.refractionCommon.dialogsManager.createWidget ).toHaveBeenCalledTimes( 1 );
		expect( window.refractionCommon.lastWidgetHeaderMessage ).toEqual( 'Are you sure?' );
		expect( window.refractionCommon.lastWidgetMessage ).toEqual( 'Removing Kit Title will permanently delete changes made to the Websites Template\'s content and site settings' );

		// Simulate reload
		window.dispatchEvent( new Event( 'load' ) );

		// Kit deleted dialog
		expect( window.refractionCommon.dialogsManager.createWidget ).toHaveBeenCalledTimes( 2 );
		expect( window.refractionCommon.lastWidgetHeaderMessage ).toEqual( 'Active Kit Name was successfully deleted' );
		expect( window.refractionCommon.lastWidgetMessage ).toEqual( 'Try a different Website Template or build your site from scratch.' );
	} );
} );

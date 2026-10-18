import { expect } from '@playwright/test';
import { parallelTest as test } from '../../../../../../../parallelTest';
import WpAdminPage from '../../../../../../../pages/wp-admin-page';

test.describe( `$e.run( 'editor/elements/views/widget' )`, () => {
	test( 'Check if the empty placeholder is displayed inside the Image Carousel', async ( { page, apiRequests }, testInfo ) => {
		// Arrange.
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests ),
			editor = await wpAdmin.openNewPage();

		// Act.
		await editor.addWidget( { widgetType: 'image-carousel' } );
		await page.waitForTimeout( 500 );
		await editor.getPreviewFrame().waitForSelector( '.refraction-widget-image-carousel .refraction-widget-empty-icon' );

		const emptyViewPlaceholderCount = await editor.getPreviewFrame().evaluate( () => document.querySelectorAll( '.refraction-widget-image-carousel .refraction-widget-empty-icon' ).length );

		// Assert.
		expect( emptyViewPlaceholderCount ).toBe( 1 );
	} );

	test( 'Check if the empty placeholder is displayed inside the Sidebar widget', async ( { page, apiRequests }, testInfo ) => {
		// Arrange.
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests ),
			editor = await wpAdmin.openNewPage();

		// Act.
		await editor.addWidget( { widgetType: 'sidebar' } );
		await editor.closeNavigatorIfOpen();
		await page.waitForTimeout( 500 );
		await editor.getPreviewFrame().waitForSelector( '.refraction-widget .refraction-widget-empty-icon' );

		const emptyViewPlaceholderCount = await editor.getPreviewFrame().locator( '.refraction-widget-sidebar .refraction-widget-empty-icon' ).count();

		// Assert.
		expect( emptyViewPlaceholderCount ).toBe( 1 );
	} );

	test( 'Check if the empty placeholder is displayed inside the Image Box widget', async ( { page, apiRequests }, testInfo ) => {
		// Arrange.
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests ),
			editor = await wpAdmin.openNewPage();

		// Act.
		await editor.addWidget( { widgetType: 'image-box' } );
		await page.hover( '.refraction-control-image .refraction-control-media__content' );
		await page.hover( '.refraction-control-media-area' );
		await page.click( '.refraction-control-media__remove' );
		await editor.setTextControlValue( 'title_text', '' );
		await editor.setTextareaControlValue( 'description_text', '' );
		await page.waitForTimeout( 500 );
		await editor.getPreviewFrame().waitForSelector( '.refraction-widget .refraction-widget-empty-icon' );

		const emptyViewPlaceholderCount = await editor.getPreviewFrame().locator( '.refraction-widget-image-box > .refraction-widget-empty-icon.eicon-image-box' ).count();

		// Assert.
		expect( emptyViewPlaceholderCount ).toBe( 1 );
	} );

	test( 'Check if the empty placeholder is displayed inside the Basic Gallery widget', async ( { page, apiRequests }, testInfo ) => {
		// Arrange.
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests ),
			editor = await wpAdmin.openNewPage();

		// Act.
		await editor.addWidget( { widgetType: 'image-gallery' } );
		await page.waitForTimeout( 500 );
		await editor.getPreviewFrame().waitForSelector( '.refraction-widget-image-gallery .refraction-widget-empty-icon' );

		const emptyViewPlaceholderCount = await editor.getPreviewFrame().evaluate( () => document.querySelectorAll( '.refraction-widget-image-gallery .refraction-widget-empty-icon' ).length );

		// Assert.
		expect( emptyViewPlaceholderCount ).toBe( 1 );
	} );

	test( 'Check if the empty placeholder is displayed inside the Video widget', async ( { page, apiRequests }, testInfo ) => {
		// Arrange.
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests ),
			editor = await wpAdmin.openNewPage();

		// Act.
		await editor.addWidget( { widgetType: 'video' } );
		await editor.setSelectControlValue( 'video_type', 'hosted' );
		await page.waitForTimeout( 500 );
		await editor.getPreviewFrame().waitForSelector( '.refraction-widget .refraction-widget-empty-icon' );

		const emptyViewPlaceholderCount = await editor.getPreviewFrame().locator( '.refraction-widget-video .refraction-widget-empty-icon' ).count();

		// Assert.
		expect( emptyViewPlaceholderCount ).toBe( 1 );
	} );

	test.skip( 'Check if the empty placeholder is displayed inside the Google Maps widget', async ( { page, apiRequests }, testInfo ) => {
		// Arrange.
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests ),
			editor = await wpAdmin.openNewPage();

		// Act.
		await editor.addWidget( { widgetType: 'google_maps' } );
		await editor.setTextControlValue( 'address', '' );
		await editor.page.waitForLoadState( 'domcontentloaded' );
		await page.waitForTimeout( 500 );
		await editor.getPreviewFrame().waitForSelector( '.refraction-widget .refraction-widget-empty-icon' );

		const emptyViewPlaceholderCount = await editor.getPreviewFrame().locator( '.refraction-widget-google_maps .refraction-widget-empty-icon' ).count();

		// Assert.
		expect( emptyViewPlaceholderCount ).toBe( 1 );
	} );
} );

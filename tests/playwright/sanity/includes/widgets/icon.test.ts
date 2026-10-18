import { expect } from '@playwright/test';
import { parallelTest as test } from '../../../parallelTest';
import WpAdminPage from '../../../pages/wp-admin-page';
import EditorPage from '../../../pages/editor-page';
import EditorSelectors from '../../../selectors/editor-selectors';

test.describe( 'Icon and social icon widget tests', () => {
	test.beforeAll( async ( { browser, apiRequests }, testInfo ) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests );
		await wpAdmin.enableAdvancedUploads();
	} );

	test.afterAll( async ( { browser, apiRequests }, testInfo ) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests );
		await wpAdmin.disableAdvancedUploads();
	} );

	test( 'Enable SVG fit-to-size', async ( { page, apiRequests }, testInfo ) => {
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests );
		const editor = await wpAdmin.openNewPage(),
			iconWidget = await editor.addWidget( { widgetType: 'icon' } ),
			iconSelector = '.refraction-element-' + iconWidget + ' .refraction-icon';

		await test.step( 'Fit Aspect hidden for Icons', async () => {
			await editor.openPanelTab( 'style' );
			await expect( page.locator( '.refraction-control-fit_to_size .refraction-switch-label' ) ).toBeHidden();
		} );

		await test.step( 'Act', async () => {
			await editor.openPanelTab( 'content' );
			const mediaUploadControl = page.locator( '.refraction-control-selected_icon .refraction-control-media__preview' ).first();
			await mediaUploadControl.hover();
			await mediaUploadControl.waitFor();
			await page.getByText( 'Upload SVG' ).first().click();
			await editor.uploadSVG();
			await editor.openPanelTab( 'style' );
			await page.locator( '.refraction-switch-label' ).click();
			await editor.setSliderControlValue( 'size', '300' );
		} );

		await test.step( 'Editor Fit-to-size enabled', async () => {
			await editor.togglePreviewMode();

			const iconSVG = editor.getPreviewFrame().locator( iconSelector ),
				iconDimensions = await iconSVG.boundingBox();

			expect( iconDimensions.height !== iconDimensions.width ).toBeTruthy(); // Not 1-1 proportion
			await editor.togglePreviewMode();
		} );

		await test.step( 'FrontEnd Fit-to-size enabled', async () => {
			await editor.publishAndViewPage();

			await page.waitForSelector( '.refraction-element-' + iconWidget + ' .refraction-icon' );

			const iconSVG = page.locator( iconSelector ),
				iconDimensions = await iconSVG.boundingBox();

			expect( iconDimensions.height === iconDimensions.width ).toBeFalsy(); // Not 1-1 proportion
		} );
	} );

	test( 'Social icons: upload svg', async ( { page, apiRequests }, testInfo ) => {
		// Arrange.
		const wpAdmin = new WpAdminPage( page, testInfo, apiRequests );
		const editor = new EditorPage( page, testInfo );
		await wpAdmin.openNewPage();

		// Act.
		await editor.addWidget( { widgetType: 'social-icons' } );
		await page.locator( EditorSelectors.item ).first().click();
		const mediaUploadControl = page.locator( '.refraction-control-social_icon .refraction-control-media__preview' ).first();
		await mediaUploadControl.hover();
		await mediaUploadControl.waitFor();
		await page.getByText( 'Upload SVG' ).first().click();
		await editor.uploadSVG();

		// Assert.
		await expect( editor.getPreviewFrame().locator( EditorSelectors.socialIcons.svgIcon ) ).toBeVisible();
		await editor.publishAndViewPage();
		await expect( page.locator( EditorSelectors.socialIcons.svgIcon ) ).toBeVisible();
	} );
} );

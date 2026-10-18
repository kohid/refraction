import { expect } from '@playwright/test';
import { parallelTest as test } from '../../../../../../../parallelTest';
import WpAdminPage from '../../../../../../../pages/wp-admin-page';

test( 'Image Carousel widget sanity test lazyload', async ( { page, apiRequests }, testInfo ) => {
	const wpAdmin = new WpAdminPage( page, testInfo, apiRequests ),
		editor = await wpAdmin.openNewPage();
	const images = [ 'refraction1.png', 'refraction2.png', 'refraction3.png', 'refraction4.png' ];

	await editor.addWidget( { widgetType: 'image-carousel' } );
	await editor.openPanelTab( 'content' );
	await editor.addImagesToGalleryControl( { images } );
	await editor.setSelectControlValue( 'slides_to_show', '1' );
	await editor.openSection( 'section_additional_options' );
	await editor.setSwitcherControlValue( 'lazyload', true );
	await editor.setSwitcherControlValue( 'autoplay', false );

	const widget = await editor.getPreviewFrame().waitForSelector( '.refraction-image-carousel' );
	const widgetImages = await widget.$$( '.swiper-slide >> img' );

	// The lazyload loads images from data-src into src.
	// If the src does not exist, the data-src should exist with the image src.
	for ( const image of widgetImages ) {
		const src = await image.getAttribute( 'src' );

		if ( src ) {
			expect( src ).toContain( '.png' );
		} else {
			const dataSrc = await image.getAttribute( 'data-src' );
			expect( dataSrc ).toContain( '.png' );
		}
	}
} );

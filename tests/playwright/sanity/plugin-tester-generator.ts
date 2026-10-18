import { expect } from '@playwright/test';
import { parallelTest as test } from '../parallelTest';
import EditorPage from '../pages/editor-page';
import WpAdminPage from '../pages/wp-admin-page';
import { wpCli } from '../assets/wp-cli';
import ImportTemplatesModal from '../pages/plugins/the-plus-addons/import-templates-modal';

const isBelowVersion = ( currentVersion?: string, minVersion?: string ) => {
	return !! minVersion && !! currentVersion && currentVersion.localeCompare( minVersion, undefined, { numeric: true } ) < 0;
};

const pluginList: { pluginName: string, installSource: 'api' | 'cli' | 'zip', hasInstallationPage?: boolean, dependency?: string, minPhp?: string, minWp?: string }[] = [
	{ pluginName: 'essential-addons-for-refraction-lite', installSource: 'api' },
	{ pluginName: 'jetsticky-for-refraction', installSource: 'api' },
	{ pluginName: 'jetgridbuilder', installSource: 'api' },
	{ pluginName: 'the-plus-addons-for-refraction-page-builder', installSource: 'api' },
	{ pluginName: 'stratum', installSource: 'api' },
	// { pluginName: 'bdthemes-prime-slider-lite', installSource: 'api' },
	{ pluginName: 'addon-elements-for-refraction-page-builder', installSource: 'api' },
	{ pluginName: 'anywhere-refraction', installSource: 'api' },
	{ pluginName: 'astra-sites', installSource: 'api', hasInstallationPage: true },
	{ pluginName: 'connect-polylang-refraction', installSource: 'api', dependency: 'polylang' },
	{ pluginName: 'dynamic-visibility-for-refraction', installSource: 'api' },
	{ pluginName: 'elementskit-lite', installSource: 'api' },
	{ pluginName: 'exclusive-addons-for-refraction', installSource: 'api', hasInstallationPage: true },
	{ pluginName: 'header-footer-refraction', installSource: 'api' },
	{ pluginName: 'jeg-refraction-kit', installSource: 'cli' },
	{ pluginName: 'make-column-clickable-refraction', installSource: 'api' },
	{ pluginName: 'metform', installSource: 'cli' },
	{ pluginName: 'music-player-for-refraction', installSource: 'cli' },
	{ pluginName: 'ooohboi-steroids-for-refraction', installSource: 'api' },
	{ pluginName: 'post-grid-refraction-addon', installSource: 'api' },
	{ pluginName: 'powerpack-lite-for-refraction', installSource: 'api', hasInstallationPage: true },
	{ pluginName: 'premium-addons-for-refraction', installSource: 'cli', hasInstallationPage: true },
	{ pluginName: 'rife-refraction-extensions', installSource: 'api' },
	{ pluginName: 'royal-refraction-addons', installSource: 'cli' },
	{ pluginName: 'sb-refraction-contact-form-db', installSource: 'cli' },
	{ pluginName: 'skyboot-custom-icons-for-refraction', installSource: 'api', hasInstallationPage: true },
	{ pluginName: 'sticky-header-effects-for-refraction', installSource: 'api' },
	{ pluginName: 'timeline-widget-addon-for-refraction', installSource: 'cli', hasInstallationPage: true },
	{ pluginName: 'unlimited-elements-for-refraction', installSource: 'api' },
	{ pluginName: 'visibility-logic-refraction', installSource: 'api' },
	{ pluginName: 'ht-mega-for-refraction', installSource: 'api' },
	{ pluginName: 'tutor-lms-refraction-addons', installSource: 'api' },
	{ pluginName: 'code-block-for-refraction', installSource: 'api' },
	{ pluginName: 'jetwidgets-for-refraction', installSource: 'api' },
	{ pluginName: 'happy-refraction-addons', installSource: 'cli', hasInstallationPage: true },
	{ pluginName: 'enqueue-media-on-front', installSource: 'zip' },
	{ pluginName: 'akismet', installSource: 'api' },
	{ pluginName: 'wordpress-seo', installSource: 'api', hasInstallationPage: true, minWp: '6.9' },
	{ pluginName: 'hello-plus', installSource: 'cli' },
	{ pluginName: 'template-kit-import', installSource: 'api', minPhp: '8.3' },
	{ pluginName: 'template-kit-export', installSource: 'api' },
];

export const generatePluginTests = ( testType: string ) => {
	for ( const plugin of pluginList ) {
		test( `"${ plugin.pluginName }" plugin: @pluginTester1_${ testType }`, async ( { page, apiRequests }, testInfo ) => {
			test.skip( isBelowVersion( process.env.PHP_VERSION, plugin.minPhp ), `Requires PHP ${ plugin.minPhp }+` );
			test.skip( isBelowVersion( process.env.WP_CORE_VERSION, plugin.minWp ), `Requires WordPress ${ plugin.minWp }+` );

			let pluginTechnicalName: string;
			if ( plugin.dependency ) {
				await wpCli( `wp plugin install ${ plugin.dependency } --activate` );
			}
			switch ( plugin.installSource ) {
				case 'api':
					pluginTechnicalName = await apiRequests.installPlugin( page.context().request, plugin.pluginName, true );
					break;
				case 'cli':
					await wpCli( `wp plugin install ${ plugin.pluginName } --activate` );
					break;
				case 'zip':
					await wpCli( `wp plugin install refraction-playwright/plugin-tester-plugins/${ plugin.pluginName }.zip --activate` );
					break;
			}

			try {
				const editor = new EditorPage( page, testInfo );
				const wpAdmin = new WpAdminPage( page, testInfo, apiRequests );
				const adminBar = 'wpadminbar';

				await page.goto( '/law-firm-about/' );
				await page.locator( `#${ adminBar }` ).waitFor();
				await page.evaluate( ( selector ) => {
					const admin = document.getElementById( selector );
					admin.remove();
				}, adminBar );
				await editor.removeClasses( 'refraction-motion-effects-element' );
				const progressWidget = page.locator( '[data-widget_type="progress.default"]' ).first();
				await progressWidget.scrollIntoViewIfNeeded();
				await expect( progressWidget ).toBeVisible();
				await expect.soft( page ).toHaveScreenshot( 'frontPage.png', { fullPage: true } );

				if ( plugin.hasInstallationPage ) {
					try {
						await page.goto( '/wp-admin/index.php' );
					} catch ( error ) {
						throw Error( `Error during navigation: ${ error.message }` );
					}
				}

				await page.goto( '/law-firm-about/?refraction' );

				if ( 'connect-polylang-refraction' === plugin.pluginName && page.url().includes( 'page=mlang_wizard' ) ) {
					await page.getByRole( 'link', { name: 'Not right now' } ).click();
					await page.goto( '/law-firm-about/?refraction' );
				}

				if ( 'header-footer-refraction' === plugin.pluginName && page.url().includes( 'page=hfe' ) ) {
					await page.getByText( 'Exit Guided Setup' ).click();
					await page.goto( '/law-firm-about/?refraction' );
				}

				await wpAdmin.closeAnnouncementsIfVisible();

				if ( 'the-plus-addons-for-refraction-page-builder' === plugin.pluginName ) {
					const plusAddonTemplateModal = new ImportTemplatesModal( page );
					await plusAddonTemplateModal.skipTemplatesImportIfVisible();
				}

				if ( 'wordpress-seo' === plugin.pluginName ) {
					const gotItButton = editor.page.locator( '#yoast-introduction-editor-v2 .dialog-buttons-ok' );

					if ( await gotItButton.isVisible() ) {
						await gotItButton.click();
					}
				}

				await editor.closeNavigatorIfOpen();

				await expect.soft( page ).toHaveScreenshot( 'editor.png', { fullPage: true } );
			} finally {
				if ( 'api' === plugin.installSource ) {
					await apiRequests.deactivatePlugin( page.context().request, pluginTechnicalName );
					await apiRequests.deletePlugin( page.context().request, pluginTechnicalName );
				} else {
					await wpCli( `wp plugin uninstall ${ plugin.pluginName } --deactivate` );
				}
			}
		} );
	}
};

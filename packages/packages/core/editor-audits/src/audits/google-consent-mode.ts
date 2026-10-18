import { __ } from '@wordpress/i18n';

import { type Audit } from '../types';
import { hasConsentDefaultCall, hasGoogleTracking } from '../utils/scan-consent-signals';

export const audit: Audit = {
	id: 'audits/google-consent-mode',
	title: __( 'Google Consent Mode', 'refraction' ),
	description: __(
		'Google Analytics, Ads, or Tag Manager are running on this site and may not receive a consent signal, which risks losing conversion/analytics data and compliance exposure.',
		'refraction'
	),
	fixHint: __(
		'Turn on Google Consent Mode in your cookie consent plugin so Google tags respect visitor consent choices.',
		'refraction'
	),
	categories: [ 'compliance' ],
	severity: 'warning',
	weight: 1,
	evaluate: ( ctx ) => {
		if ( ! ctx.pageContext.frontend_url ) {
			return { status: 'skipped', reason: __( 'Page is not published.', 'refraction' ) };
		}

		if ( ! ctx.renderedHtml ) {
			return { status: 'skipped', reason: __( 'Could not fetch the published page.', 'refraction' ) };
		}

		if ( ! hasGoogleTracking( ctx.renderedHtml ) ) {
			return { status: 'skipped', reason: __( 'No Google tracking product detected.', 'refraction' ) };
		}

		if ( hasConsentDefaultCall( ctx.renderedHtml ) ) {
			return { status: 'pass' };
		}

		const label = __( 'No Google Consent Mode signal was found on the page.', 'refraction' );
		const isCookiezReady = ctx.pageContext.cookiez_plugin_installed && ctx.pageContext.cookiez_plugin_active;

		if ( isCookiezReady ) {
			return {
				status: 'fail',
				violations: [
					{
						auditId: audit.id,
						label,
						ctaLabel: __( 'Enable', 'refraction' ),
						externalUrl: ctx.pageContext.cookiez_consent_mode_settings_url,
					},
				],
			};
		}

		return {
			status: 'fail',
			violations: [
				{
					auditId: audit.id,
					label,
					externalUrl: ctx.pageContext.cookiez_plugin_action_url,
				},
			],
		};
	},
};

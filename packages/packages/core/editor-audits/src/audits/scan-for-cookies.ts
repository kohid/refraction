import { __ } from '@wordpress/i18n';

import { type Audit } from '../types';

export const audit: Audit = {
	id: 'audits/scan-for-cookies',
	title: __( 'Scan for cookies', 'refraction' ),
	description: __(
		"Your site may be setting cookies you haven't disclosed. Some countries require a banner even without a full consent policy. Scan to see what needs disclosure.",
		'refraction'
	),
	fixHint: __( 'Run a Cookiez scan on this page to see which cookies need disclosure.', 'refraction' ),
	categories: [ 'compliance' ],
	severity: 'info',
	weight: 0,
	evaluate: ( ctx ) => {
		const isReady = ctx.pageContext.cookiez_plugin_installed && ctx.pageContext.cookiez_plugin_active;

		return {
			status: 'fail',
			violations: [
				{
					auditId: audit.id,
					label: __( 'This page has not been scanned for cookies yet.', 'refraction' ),
					externalUrl: isReady ? ctx.pageContext.cookiez_scan_url : ctx.pageContext.cookiez_plugin_action_url,
				},
			],
		};
	},
};

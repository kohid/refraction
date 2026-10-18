import { __ } from '@wordpress/i18n';

import { type Audit } from '../types';

export const audit: Audit = {
	id: 'audits/accessibility-statement',
	title: __( 'Create an accessibility statement', 'refraction' ),
	description: __(
		'An accessibility statement showcases your efforts to create an inclusive online space, highlighting helpful features and a commitment to accessibility.',
		'refraction'
	),
	fixHint: __( 'Use Ally to create and publish an accessibility statement for your site.', 'refraction' ),
	categories: [ 'accessibility' ],
	severity: 'info',
	weight: 1,
	evaluate: ( ctx ) => {
		const isReady = ctx.pageContext.ally_plugin_active;

		if ( isReady && ctx.pageContext.ally_accessibility_statement_created ) {
			return { status: 'pass' };
		}

		return {
			status: 'fail',
			violations: [
				{
					auditId: audit.id,
					label: __( 'No accessibility statement has been created for this site.', 'refraction' ),
					externalUrl: isReady
						? ctx.pageContext.ally_accessibility_statement_url
						: ctx.pageContext.ally_plugin_url,
					ctaLabel: __( 'Create', 'refraction' ),
					secondaryCtaLabel: __( 'Learn more', 'refraction' ),
					secondaryCtaUrl: 'https://elementor.com/help/start-using-ally/#statement',
				},
			],
		};
	},
};

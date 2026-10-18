import { __ } from '@wordpress/i18n';

import { type Audit } from '../types';
import { hasAccessibilityWidgetScript } from '../utils/scan-accessibility-widgets';

export const audit: Audit = {
	id: 'audits/accessibility-widget',
	title: __( 'Add an accessibility widget', 'refraction' ),
	description: __( 'Make your site more inclusive by adding an accessibility widget.', 'refraction' ),
	fixHint: __( 'Activate Ally’s accessibility widget to give visitors on-page accessibility tools.', 'refraction' ),
	categories: [ 'accessibility' ],
	severity: 'info',
	weight: 1,
	evaluate: ( ctx ) => {
		if ( ! ctx.pageContext.frontend_url ) {
			return { status: 'skipped', reason: __( 'Page is not published.', 'refraction' ) };
		}

		if ( ! ctx.renderedHtml ) {
			return { status: 'skipped', reason: __( 'Could not fetch the published page.', 'refraction' ) };
		}

		if ( hasAccessibilityWidgetScript( ctx.renderedHtml ) ) {
			return { status: 'pass' };
		}

		const isReady = ctx.pageContext.ally_plugin_active;

		return {
			status: 'fail',
			violations: [
				{
					auditId: audit.id,
					label: __( 'No accessibility widget is active on this site.', 'refraction' ),
					externalUrl: isReady ? ctx.pageContext.ally_widget_settings_url : ctx.pageContext.ally_plugin_url,
					ctaLabel: __( 'Activate', 'refraction' ),
				},
			],
		};
	},
};

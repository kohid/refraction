import { __ } from '@wordpress/i18n';

import { type Audit, type AuditViolation } from '../types';
import { hasAltTextImages, walkAltTextImageSources } from '../utils/alt-text-image-sources';
import { hasMeaningfulAlt, isImageSourcePresent } from '../utils/image-alt';

export const audit: Audit = {
	id: 'audits/images-alt-text',
	title: __( 'Images alt text', 'refraction' ),
	description: __( 'Every image needs a meaningful alt attribute for screen readers and image-search.', 'refraction' ),
	fixHint: __( "Open the image's settings and add an Alt Text describing the image.", 'refraction' ),
	categories: [ 'seo', 'accessibility' ],
	severity: 'error',
	weight: 10,
	evaluate: ( ctx ) => {
		if ( ! hasAltTextImages( ctx.elements.tree ) ) {
			return { status: 'skipped', reason: __( 'No images', 'refraction' ) };
		}

		const isReady = ctx.pageContext.ally_plugin_active;
		const violations: AuditViolation[] = [];
		const failedWidgetIds = new Set< string >();
		let missingAltImageCount = 0;

		walkAltTextImageSources( ctx.elements.tree, ( { node, media } ) => {
			if ( ! isImageSourcePresent( media ) || hasMeaningfulAlt( media, ctx.pageContext ) ) {
				return;
			}

			missingAltImageCount++;

			if ( ! failedWidgetIds.has( node.id ) ) {
				failedWidgetIds.add( node.id );
				violations.push( {
					auditId: audit.id,
					elementId: node.id,
					targetHint: 'element-settings',
					label: __( 'Image is missing alt text.', 'refraction' ),
					externalUrl: isReady ? ctx.pageContext.ally_scan_url : ctx.pageContext.ally_plugin_url,
					ctaLabel: __( 'Fix with Ally', 'refraction' ),
				} );
			}
		} );

		return violations.length === 0
			? { status: 'pass' }
			: { status: 'fail', violations, metadata: { missingAltImageCount } };
	},
};

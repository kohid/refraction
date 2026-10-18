import { __ } from '@wordpress/i18n';

import { type Audit } from '../types';

export const audit: Audit = {
	id: 'audits/page-featured-image',
	title: __( 'Page featured image', 'refraction' ),
	description: __( 'Featured images are used by social shares and many themes for hero visuals.', 'refraction' ),
	fixHint: __( 'Open Page Settings and set a featured image.', 'refraction' ),
	categories: [ 'seo' ],
	severity: 'info',
	weight: 5,
	evaluate: ( ctx ) => {
		if ( ctx.pageContext.featured_image_id ) {
			return { status: 'pass' };
		}

		return {
			status: 'fail',
			violations: [
				{
					auditId: audit.id,
					label: __( 'No featured image set.', 'refraction' ),
					targetHint: 'page-settings',
				},
			],
		};
	},
};

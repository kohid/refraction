import { __ } from '@wordpress/i18n';

import { type Audit } from '../types';

const MAX_TITLE_LENGTH = 60;

export const audit: Audit = {
	id: 'audits/page-title',
	title: __( 'Page title', 'refraction' ),
	description: __( 'Pages need a clear title for SEO and screen-reader navigation.', 'refraction' ),
	fixHint: __( 'Open Page Settings and add a title.', 'refraction' ),
	categories: [ 'seo' ],
	severity: 'error',
	weight: 10,
	evaluate: ( ctx ) => {
		const title = ctx.pageContext.post_title;

		if ( ! title ) {
			return {
				status: 'fail',
				violations: [
					{
						auditId: audit.id,
						label: __( 'Page has no title.', 'refraction' ),
						targetHint: 'page-settings',
						angieFix: true,
						angiePrompt: __(
							"Based on this page's contents, generate a title for this page.",
							'refraction'
						),
					},
				],
			};
		}

		if ( title.length > MAX_TITLE_LENGTH ) {
			return {
				status: 'fail',
				violations: [
					{
						auditId: audit.id,
						label: __( 'Page title is too long.', 'refraction' ),
						targetHint: 'page-settings',
						angieFix: true,
					},
				],
			};
		}

		return { status: 'pass' };
	},
};

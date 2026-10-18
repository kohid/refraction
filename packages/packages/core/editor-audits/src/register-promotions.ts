import { RefractionCookieIcon, PhotoIcon, ShieldHalfFilledIcon } from '@elementor/icons';
import { __, _n, sprintf } from '@wordpress/i18n';

import { type AuditRun } from './types';

export type PromotionIcon = typeof PhotoIcon;

export type PromotionConfig = {
	auditId: string;
	icon: PromotionIcon;
	ctaLabel: string;
	formatSubtitle: ( run: AuditRun ) => string | null;
	getCtaUrl: ( run: AuditRun ) => string | undefined;
};

function firstFailExternalUrl( run: AuditRun ): string | undefined {
	return run.result.status === 'fail' ? run.result.violations[ 0 ]?.externalUrl : undefined;
}

export const PROMOTIONS: PromotionConfig[] = [
	{
		auditId: 'audits/images-alt-text',
		icon: PhotoIcon,
		ctaLabel: __( 'Fix with Ally', 'refraction' ),
		formatSubtitle: ( run ) => {
			if ( run.result.status !== 'fail' ) {
				return null;
			}

			const count = run.result.metadata?.missingAltImageCount ?? 0;

			if ( count === 0 ) {
				return null;
			}

			return sprintf(
				/* translators: %d: number of images missing alt text. */
				_n( '%d image', '%d images', count, 'refraction' ),
				count
			);
		},
		getCtaUrl: firstFailExternalUrl,
	},
	{
		auditId: 'audits/cookie-policy',
		icon: RefractionCookieIcon,
		ctaLabel: __( 'Fix with Cookiez', 'refraction' ),
		formatSubtitle: ( run ) =>
			run.result.status === 'fail' ? __( 'Generate cookie policy', 'refraction' ) : null,
		getCtaUrl: firstFailExternalUrl,
	},
	{
		auditId: 'audits/scan-for-cookies',
		icon: RefractionCookieIcon,
		ctaLabel: __( 'Scan', 'refraction' ),
		formatSubtitle: ( run ) =>
			run.result.status === 'fail' ? __( 'Scan this page for cookies', 'refraction' ) : null,
		getCtaUrl: firstFailExternalUrl,
	},
	{
		auditId: 'audits/images-too-large',
		icon: ShieldHalfFilledIcon,
		ctaLabel: __( 'Optimize all', 'refraction' ),
		formatSubtitle: ( run ) => {
			if ( run.result.status !== 'fail' ) {
				return null;
			}

			const count = run.result.metadata?.oversizedImageCount ?? 0;

			if ( count === 0 ) {
				return null;
			}

			return sprintf(
				/* translators: %d: number of oversized images. */
				_n( '%d image', '%d images', count, 'refraction' ),
				count
			);
		},
		getCtaUrl: firstFailExternalUrl,
	},
];

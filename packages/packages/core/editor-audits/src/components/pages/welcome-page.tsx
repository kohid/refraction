import * as React from 'react';
import { Box, Typography } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

const INFORMATION_IMAGE_PATH = 'images/information.svg';

type RefractionCommonWindow = Window & {
	refractionCommon?: {
		config?: {
			urls?: {
				assets?: string;
			};
		};
	};
};

export default function WelcomePage() {
	const assetsUrl = ( window as RefractionCommonWindow ).refractionCommon?.config?.urls?.assets ?? '';

	return (
		<Box
			sx={ {
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 1,
				p: 3,
			} }
		>
			<img
				className="refraction-nerd-box-icon"
				src={ `${ assetsUrl }${ INFORMATION_IMAGE_PATH }` }
				loading="lazy"
				alt={ __( 'Refraction', 'refraction' ) }
			/>
			<Typography variant="subtitle1" component="h3" sx={ { marginBlockStart: 2 } }>
				{ __( 'Audit your page!', 'refraction' ) }
			</Typography>
			<Typography variant="caption" textAlign="center">
				{ __(
					'Check SEO, accessibility, performance, and best practices. Click "Run page audit" to begin.',
					'refraction'
				) }
			</Typography>
		</Box>
	);
}

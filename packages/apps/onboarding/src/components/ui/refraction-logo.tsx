import * as React from 'react';
import { Stack, type StackProps, useTheme } from '@elementor/ui';

import { RefractionIcon } from './refraction-icon';
import { RefractionWordmark } from './refraction-wordmark';

interface RefractionLogoProps extends Omit< StackProps, 'direction' > {
	height?: number;
}

export function RefractionLogo( { height = 20, sx, ...props }: RefractionLogoProps ) {
	const theme = useTheme();

	// Icon is square
	const iconSize = height;

	// Wordmark viewBox is 90x15, aspect ratio 6
	const wordmarkHeight = height * 0.8;
	const wordmarkWidth = wordmarkHeight * 6;

	return (
		<Stack
			direction="row"
			alignItems="center"
			spacing={ 0.5 }
			sx={ {
				color: theme.palette.text.primary,
				...sx,
			} }
			{ ...props }
		>
			<RefractionIcon sx={ { width: iconSize, height: iconSize } } />
			<RefractionWordmark sx={ { width: wordmarkWidth, height: wordmarkHeight } } />
		</Stack>
	);
}

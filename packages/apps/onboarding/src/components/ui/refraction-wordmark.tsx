import * as React from 'react';
import { SvgIcon, type SvgIconProps } from '@elementor/ui';

/**
 * Refraction wordmark: the product name set in the surrounding UI font.
 * Uses currentColor by default, so it inherits color from parent or theme.
 * @param props
 */
export function RefractionWordmark( props: SvgIconProps ) {
	return (
		<SvgIcon viewBox="0 0 90 15" { ...props }>
			<text
				x="0"
				y="12"
				fill="currentColor"
				fontFamily="inherit"
				fontSize="14"
				fontWeight="600"
				textLength="88"
				lengthAdjust="spacingAndGlyphs"
			>
				Refraction
			</text>
		</SvgIcon>
	);
}

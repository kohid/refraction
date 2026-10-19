import * as React from 'react';
import { SvgIcon, type SvgIconProps } from '@elementor/ui';

/**
 * Refraction prism mark: a beam enters a prism on the left and leaves as three rays on the right.
 * Uses currentColor, so it inherits color from the parent or theme.
 * @param props
 */
export function RefractionIcon( props: SvgIconProps ) {
	return (
		<SvgIcon viewBox="0 0 100 100" { ...props }>
			<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
				<polygon points="40,12 66,57 14,57" strokeWidth="8" />
				<line x1="4" y1="50" x2="24.6" y2="39.4" strokeWidth="6" />
				<line x1="52.1" y1="33" x2="94" y2="14" strokeWidth="6" />
				<line x1="57.6" y1="42.5" x2="96" y2="42.5" strokeWidth="6" />
				<line x1="63.1" y1="52" x2="94" y2="72" strokeWidth="6" />
			</g>
		</SvgIcon>
	);
}

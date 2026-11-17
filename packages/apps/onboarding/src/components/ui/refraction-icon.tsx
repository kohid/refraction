import * as React from 'react';
import { SvgIcon, type SvgIconProps } from '@elementor/ui';

/**
 * The Refraction logo in one color (0.117.0): the corner with its spectrum bars cut out, and the circle. Uses
 * currentColor, so it inherits color from the parent or theme. Full color: assets/images/refraction-logo.svg.
 * @param props
 */
export function RefractionIcon( props: SvgIconProps ) {
	return (
		<SvgIcon viewBox="0 0 500 500" { ...props }>
			<path fill="currentColor" fillRule="evenodd" d="M173.6 500 L0 500 L0 0 L500 0 L500 173.6 L173.6 173.6 L173.6 500ZM10 173.6 L165 219.7 L165 250 L10 250 L10 173.6ZM173.6 10 L219.7 165 L250 165 L250 10 L173.6 10ZM10 330 L10 270 L165 270 L165 330 L10 330ZM330 10 L270 10 L270 165 L330 165 L330 10ZM10 410 L10 350 L165 350 L165 410 L10 410ZM410 10 L350 10 L350 165 L410 165 L410 10ZM10 430 L10 490 L165 490 L165 430 L10 430ZM430 10 L490 10 L490 165 L430 165 L430 10ZM10 152.8 L165 198.8 L165 179.1 L10 24.1 L10 152.8ZM152.8 10 L198.8 165 L179.1 165 L24.1 10 L152.8 10Z" />
			<circle fill="currentColor" cx="412.5" cy="412.5" r="77.5" />
		</SvgIcon>
	);
}

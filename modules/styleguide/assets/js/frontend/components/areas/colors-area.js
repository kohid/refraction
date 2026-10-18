import React from 'react';
import { useActiveContext } from '../../contexts/active-context';
import Area from './area';
import Color from '../item/color';

export default function ColorsArea() {
	const { colorsAreaRef } = useActiveContext();

	const areaConfig = {
		title: __( 'Global Colors', 'refraction' ),
		type: 'colors',
		component: Color,
		sections: [
			{
				type: 'system_colors',
				title: __( 'System Colors', 'refraction' ),
				columns: {
					desktop: 4,
					mobile: 2,
				},
			},
			{
				type: 'custom_colors',
				title: __( 'Custom Colors', 'refraction' ),
				columns: {
					desktop: 6,
					mobile: 2,
				},
			},
		],
	};

	return (
		<Area ref={ colorsAreaRef } config={ areaConfig } />
	);
}

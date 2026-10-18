import React from 'react';
import { useActiveContext } from '../../contexts/active-context';
import Area from './area';
import Font from '../item/font';

export default function FontsArea() {
	const { fontsAreaRef } = useActiveContext();

	const areaConfig = {
		title: __( 'Global Fonts', 'refraction' ),
		type: 'fonts',
		component: Font,
		sections: [
			{
				type: 'system_typography',
				title: __( 'System Fonts', 'refraction' ),
				flex: 'column',
				columns: {
					desktop: 1,
					mobile: 1,
				},
			},
			{
				type: 'custom_typography',
				title: __( 'Custom Fonts', 'refraction' ),
				flex: 'column',
				columns: {
					desktop: 1,
					mobile: 1,
				},
			},
		],
	};

	return (
		<Area ref={ fontsAreaRef } config={ areaConfig } />
	);
}

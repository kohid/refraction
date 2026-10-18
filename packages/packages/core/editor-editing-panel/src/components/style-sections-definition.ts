import type * as React from 'react';
import { __ } from '@wordpress/i18n';

import { BackgroundSection } from './style-sections/background-section/background-section';
import { BorderSection } from './style-sections/border-section/border-section';
import { EffectsSection } from './style-sections/effects-section/effects-section';
import { LayoutSection } from './style-sections/layout-section/layout-section';
import { PositionSection } from './style-sections/position-section/position-section';
import { SizeSection } from './style-sections/size-section/size-section';
import { SpacingSection } from './style-sections/spacing-section/spacing-section';
import { TypographySection } from './style-sections/typography-section/typography-section';

export type StyleSectionDefinition = {
	name: string;
	title: string;
	component: () => React.JSX.Element;
	fields: string[];
};

export const STYLE_SECTIONS: StyleSectionDefinition[] = [
	{
		name: 'Layout',
		title: __( 'Layout', 'refraction' ),
		component: LayoutSection,
		fields: [
			'display',
			'flex-direction',
			'flex-wrap',
			'justify-content',
			'align-items',
			'align-content',
			'align-self',
			'gap',
			'order',
			'grid-column',
			'grid-row',
			'grid-auto-rows',
			'grid-auto-columns',
		],
	},
	{
		name: 'Spacing',
		title: __( 'Spacing', 'refraction' ),
		component: SpacingSection,
		fields: [ 'margin', 'padding' ],
	},
	{
		name: 'Size',
		title: __( 'Size', 'refraction' ),
		component: SizeSection,
		fields: [
			'width',
			'min-width',
			'max-width',
			'height',
			'min-height',
			'max-height',
			'overflow',
			'aspect-ratio',
			'object-fit',
		],
	},
	{
		name: 'Position',
		title: __( 'Position', 'refraction' ),
		component: PositionSection,
		fields: [ 'position', 'z-index', 'scroll-margin-top' ],
	},
	{
		name: 'Typography',
		title: __( 'Typography', 'refraction' ),
		component: TypographySection,
		fields: [
			'font-family',
			'font-weight',
			'font-size',
			'text-align',
			'color',
			'line-height',
			'letter-spacing',
			'word-spacing',
			'column-count',
			'text-decoration',
			'text-transform',
			'direction',
			'font-style',
			'stroke',
		],
	},
	{
		name: 'Background',
		title: __( 'Background', 'refraction' ),
		component: BackgroundSection,
		fields: [ 'background' ],
	},
	{
		name: 'Border',
		title: __( 'Border', 'refraction' ),
		component: BorderSection,
		fields: [ 'border-radius', 'border-width', 'border-color', 'border-style' ],
	},
	{
		name: 'Effects',
		title: __( 'Effects', 'refraction' ),
		component: EffectsSection,
		fields: [
			'mix-blend-mode',
			'box-shadow',
			'opacity',
			'transform',
			'filter',
			'backdrop-filter',
			'transform-origin',
			'transition',
		],
	},
];

export const STYLE_SECTION_NAMES = STYLE_SECTIONS.map( ( section ) => section.name );

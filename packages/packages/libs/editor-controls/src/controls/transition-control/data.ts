import { type KeyValuePropValue, type SizePropValue } from '@refraction/editor-props';
import { hasProInstalled, isVersionGreaterOrEqual } from '@refraction/utils';
import { __ } from '@wordpress/i18n';

export type TransitionProperty = {
	label: string;
	value: string;
	unavailable?: boolean;
	isDisabled?: boolean;
};

export type TransitionCategory = {
	label: string;
	type: 'category';
	properties: TransitionProperty[];
};

export type TransitionValue = {
	selection: KeyValuePropValue;
	size: SizePropValue;
};

export type TransitionItem = {
	$$type: 'selection-size';
	value: {
		$$type: 'key-value';
		value: TransitionValue;
	};
};

export const initialTransitionValue: TransitionValue = {
	selection: {
		$$type: 'key-value',
		value: {
			key: { value: __( 'All properties', 'refraction' ), $$type: 'string' },
			value: { value: 'all', $$type: 'string' },
		},
	},
	size: { $$type: 'size', value: { size: 200, unit: 'ms' } },
};

const MIN_PRO_VERSION = '3.35';

const getIsSiteRtl = () => {
	return !! window.refractionFrontend?.config?.is_rtl;
};

// TODO: Remove this after version 4.01 is released
const shouldShowAllTransitionProperties = (): boolean => {
	if ( ! hasProInstalled() ) {
		return true;
	}

	const proVersion = window.refractionPro?.config?.version;

	if ( ! proVersion ) {
		return false;
	}

	return isVersionGreaterOrEqual( proVersion, MIN_PRO_VERSION );
};

const createTransitionPropertiesList = (): TransitionCategory[] => {
	const isSiteRtl = getIsSiteRtl();

	const baseProperties: TransitionCategory[] = [
		{
			label: __( 'Default', 'refraction' ),
			type: 'category',
			properties: [ { label: __( 'All properties', 'refraction' ), value: 'all' } ],
		},
		{
			label: __( 'Margin', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Margin (all)', 'refraction' ), value: 'margin', isDisabled: true },
				{ label: __( 'Margin bottom', 'refraction' ), value: 'margin-block-end', isDisabled: true },
				{
					label: isSiteRtl ? __( 'Margin right', 'refraction' ) : __( 'Margin left', 'refraction' ),
					value: 'margin-inline-start',
					isDisabled: true,
				},
				{
					label: isSiteRtl ? __( 'Margin left', 'refraction' ) : __( 'Margin right', 'refraction' ),
					value: 'margin-inline-end',
					isDisabled: true,
				},
				{ label: __( 'Margin top', 'refraction' ), value: 'margin-block-start', isDisabled: true },
			],
		},
		{
			label: __( 'Padding', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Padding (all)', 'refraction' ), value: 'padding', isDisabled: true },
				{ label: __( 'Padding bottom', 'refraction' ), value: 'padding-block-end', isDisabled: true },
				{
					label: isSiteRtl ? __( 'Padding right', 'refraction' ) : __( 'Padding left', 'refraction' ),
					value: 'padding-inline-start',
					isDisabled: true,
				},
				{
					label: isSiteRtl ? __( 'Padding left', 'refraction' ) : __( 'Padding right', 'refraction' ),
					value: 'padding-inline-end',
					isDisabled: true,
				},
				{ label: __( 'Padding top', 'refraction' ), value: 'padding-block-start', isDisabled: true },
			],
		},
		{
			label: __( 'Flex', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Flex (all)', 'refraction' ), value: 'flex', isDisabled: true },
				{ label: __( 'Flex grow', 'refraction' ), value: 'flex-grow', isDisabled: true },
				{ label: __( 'Flex shrink', 'refraction' ), value: 'flex-shrink', isDisabled: true },
				{ label: __( 'Flex basis', 'refraction' ), value: 'flex-basis', isDisabled: true },
			],
		},
		{
			label: __( 'Size', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Width', 'refraction' ), value: 'width', isDisabled: true },
				{ label: __( 'Height', 'refraction' ), value: 'height', isDisabled: true },
				{ label: __( 'Max height', 'refraction' ), value: 'max-height', isDisabled: true },
				{ label: __( 'Max width', 'refraction' ), value: 'max-width', isDisabled: true },
				{ label: __( 'Min height', 'refraction' ), value: 'min-height', isDisabled: true },
				{ label: __( 'Min width', 'refraction' ), value: 'min-width', isDisabled: true },
			],
		},
		{
			label: __( 'Position', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Top', 'refraction' ), value: 'inset-block-start', isDisabled: true },
				{
					label: isSiteRtl ? __( 'Right', 'refraction' ) : __( 'Left', 'refraction' ),
					value: 'inset-inline-start',
					isDisabled: true,
				},
				{
					label: isSiteRtl ? __( 'Left', 'refraction' ) : __( 'Right', 'refraction' ),
					value: 'inset-inline-end',
					isDisabled: true,
				},
				{ label: __( 'Bottom', 'refraction' ), value: 'inset-block-end', isDisabled: true },
				{ label: __( 'Z-index', 'refraction' ), value: 'z-index', isDisabled: true },
			],
		},
		{
			label: __( 'Typography', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Font color', 'refraction' ), value: 'color', isDisabled: true },
				{ label: __( 'Font size', 'refraction' ), value: 'font-size', isDisabled: true },
				{ label: __( 'Line height', 'refraction' ), value: 'line-height', isDisabled: true },
				{ label: __( 'Letter spacing', 'refraction' ), value: 'letter-spacing', isDisabled: true },
				{ label: __( 'Word spacing', 'refraction' ), value: 'word-spacing', isDisabled: true },
				{ label: __( 'Font variations', 'refraction' ), value: 'font-variation-settings', isDisabled: true },
				{ label: __( 'Text stroke color', 'refraction' ), value: '-webkit-text-stroke-color', isDisabled: true },
			],
		},
		{
			label: __( 'Background', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Background color', 'refraction' ), value: 'background-color', isDisabled: true },
				{ label: __( 'Background position', 'refraction' ), value: 'background-position', isDisabled: true },
				{ label: __( 'Box shadow', 'refraction' ), value: 'box-shadow', isDisabled: true },
			],
		},
		{
			label: __( 'Border', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Border (all)', 'refraction' ), value: 'border', isDisabled: true },
				{ label: __( 'Border radius', 'refraction' ), value: 'border-radius', isDisabled: true },
				{ label: __( 'Border color', 'refraction' ), value: 'border-color', isDisabled: true },
				{ label: __( 'Border width', 'refraction' ), value: 'border-width', isDisabled: true },
			],
		},
		{
			label: __( 'Effects', 'refraction' ),
			type: 'category',
			properties: [
				{ label: __( 'Opacity', 'refraction' ), value: 'opacity', isDisabled: true },
				{ label: __( 'Transform (all)', 'refraction' ), value: 'transform', isDisabled: true },
				{ label: __( 'Filter (all)', 'refraction' ), value: 'filter', isDisabled: true },
			],
		},
	];

	return shouldShowAllTransitionProperties() ? baseProperties : [ baseProperties[ 0 ] ];
};

export const transitionProperties: TransitionCategory[] = createTransitionPropertiesList();

export const transitionsItemsList = transitionProperties.map( ( category ) => ( {
	label: category.label,
	items: category.properties.map( ( property ) => property.label ),
} ) );

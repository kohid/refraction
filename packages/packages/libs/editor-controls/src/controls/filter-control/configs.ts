import { __ } from '@wordpress/i18n';

export type FilterFunction =
	| 'blur'
	| 'brightness'
	| 'contrast'
	| 'hue-rotate'
	| 'saturate'
	| 'grayscale'
	| 'invert'
	| 'sepia'
	| 'drop-shadow';

export type FilterFunctionGroup = 'blur' | 'color-tone' | 'hue-rotate' | 'intensity' | 'drop-shadow';

export type FilterGroup = {
	[ filter in FilterFunction ]?: {
		name: string;
		valueName?: string;
	};
};

export const FILTERS_BY_GROUP: Record< FilterFunctionGroup, FilterGroup > = {
	blur: {
		blur: {
			name: __( 'Blur', 'refraction' ),
			valueName: __( 'Radius', 'refraction' ),
		},
	},
	intensity: {
		brightness: { name: __( 'Brightness', 'refraction' ) },
		contrast: { name: __( 'Contrast', 'refraction' ) },
		saturate: { name: __( 'Saturate', 'refraction' ) },
	},
	'hue-rotate': {
		'hue-rotate': {
			name: __( 'Hue Rotate', 'refraction' ),
			valueName: __( 'Angle', 'refraction' ),
		},
	},
	'color-tone': {
		grayscale: { name: __( 'Grayscale', 'refraction' ) },
		invert: { name: __( 'Invert', 'refraction' ) },
		sepia: { name: __( 'Sepia', 'refraction' ) },
	},
	'drop-shadow': {
		'drop-shadow': { name: __( 'Drop shadow', 'refraction' ), valueName: __( 'Drop-shadow', 'refraction' ) },
	},
};

import { type PropType } from '@refraction/editor-props';

export type ExtendedWindow = Window & {
	refraction: {
		config: {
			atomic?: {
				styles_schema: Record< string, PropType< { key?: string } > >;
			};
		};
	};
};

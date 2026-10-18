import { type V1ElementModelProps, type V1ElementSettingsProps } from '@refraction/editor-elements';

import { type StorageContent } from '../prevent-link-in-link-commands';

export type ElementModelProps = Omit< V1ElementModelProps, 'id' > & {
	custom: {
		isPreset: boolean;
		preset_settings?: V1ElementSettingsProps;
	};
};

type Channel = {
	reply: ( event: string, data: unknown ) => Channel;
	trigger: ( event: string ) => void;
};

type RefractionChannels = {
	editor: Channel;
	panelElements: Channel;
};

export type CanvasExtendedWindow = Window & {
	refraction?: {
		$preview?: [ HTMLIFrameElement ];
		channels?: RefractionChannels;
		modules?: {
			elements?: {
				models?: {
					Element?: new ( props: ElementModelProps ) => unknown;
				};
			};
		};
	};
	refractionCommon?: {
		storage?: {
			get: ( key?: string ) => StorageContent;
		};
		config?: {
			urls?: {
				assets?: string;
			};
		};
	};
};

export type ExtendedWindow = Window & {
	refractionCommon: {
		eventsManager: {
			dispatchEvent: ( name: string, data: Record< string, string > ) => void;
			config: {
				locations: Record< string, string >;
				secondaryLocations: Record< string, string >;
				triggers: Record< string, string >;
				elements: Record< string, string >;
				names: {
					topBar: Record< string, string >;
				};
			};
		};

		config: {
			library_connect: {
				is_connected: boolean;
			};
		};
	};

	refraction: {
		helpers: {
			hasPro: () => boolean;
		};
		config: {
			user: {
				top_bar: {
					my_refraction_url: string;
					connect_url: string;
				};
			};
		};
	};
	refractionPro: {
		config: {
			isActive: boolean;
		};
	};
	jQuery: {
		fn?: {
			refractionConnect?: ( selector: string ) => never;
		};
	};
};

export type { Props as ActionProps } from './components/actions/action';
export type { Props as ToggleActionProps } from './components/actions/toggle-action';
export type { Props as LinkProps } from './components/actions/link';

export type ExtendedWindow = Window & {
	$e: {
		routes: {
			isPartOf: ( route: string ) => boolean;
		};
	};
	refractionCommon?: {
		config?: {
			experimentalFeatures?: Record< string, boolean >;
		};
	};
};

import { useMemo } from 'react';

export const PLUGINS_KEYS = Object.freeze( {
	REFRACTION: 'Refraction',
	REFRACTION_PRO: 'Refraction Pro',
} );

export default function usePluginsData( plugins ) {
	const getPluginsData = () => {
		if ( ! plugins ) {
			return [];
		}

		const refractionPlugins = [],
			generalPlugins = [];

		plugins.forEach( ( plugin ) => {
			switch ( plugin.name ) {
				case PLUGINS_KEYS.REFRACTION:
					// Making sure that the core plugin is always first.
					refractionPlugins.unshift( plugin );
					break;
				case PLUGINS_KEYS.REFRACTION_PRO:
					// Making sure that the pro plugin is always second.
					refractionPlugins.push( plugin );
					break;
				default:
					generalPlugins.push( plugin );
			}
		} );

		// Making sure that the refraction plugins are always first.
		return refractionPlugins.concat( generalPlugins );
	};

	return {
		// eslint-disable-next-line react-hooks/exhaustive-deps
		pluginsData: useMemo( () => getPluginsData(), [ plugins ] ),
	};
}

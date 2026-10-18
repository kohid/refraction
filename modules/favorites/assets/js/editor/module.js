import Component from './component';
import Widgets from './types/widgets/widgets';

/**
 * @typedef {import('./favorite-type')} FavoriteType
 */
class FavoritesModule extends refractionModules.editor.utils.Module {
	types = {};

	constructor() {
		super();

		const types = [
			Widgets,
		];

		types.forEach( ( classRef ) => this.register( classRef ) );
	}

	onRefractionLoaded() {
		this.component = $e.components.register(
			new Component( { manager: this } ),
		);
	}

	/**
	 * Get registered favorites type instance.
	 *
	 * @param {string} type
	 * @return { FavoriteType } type
	 */
	typeInstance( type ) {
		if ( undefined === this.types[ type ] ) {
			throw new Error( `Type '${ type }' is not found` );
		}

		return this.types[ type ];
	}

	/**
	 * @param {*} classRef
	 */
	register( classRef ) {
		const instance = new classRef();

		this.types[ instance.getName() ] = instance;
	}
}

export default FavoritesModule;

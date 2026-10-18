import Events from 'refraction-utils/events';

refractionCommon.elements.$window.on( 'refraction:init-components', () => {
	// Put promise of loading so other modules can use/await it.
	refraction.modules.nestedElements = import( '../editor/module' );

	refraction.modules.nestedElements.then( ( module ) => {
		refraction.modules.nestedElements = new module.default;
		refraction.modules.elements.types.NestedElementBase = import( './nested-element-types-base' );

		refraction.modules.elements.types.NestedElementBase.then( ( nestedElementBaseModule ) => {
			refraction.modules.elements.types.NestedElementBase = nestedElementBaseModule.default;

			import( './views/view' )
				.then( ( View ) => {
					$e.components.get( 'nested-elements' ).exports = { NestedView: View.default };
				} )
				.then( () => {
					Events.dispatch( refractionCommon.elements.$window, 'refraction/nested-element-type-loaded' );
				} );
		} );
	} );
} );

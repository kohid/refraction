refractionCommon.elements.$window.on( 'refraction/nested-element-type-loaded', async () => {
	new ( await import( '../editor/module' ) ).default();
} );

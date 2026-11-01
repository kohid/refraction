// Group, Repeater and Steps of the Form Builder hold containers: once the nested element types exist, register them.
refractionCommon.elements.$window.on( 'refraction/nested-element-type-loaded', async () => {
	new ( await import( './module' ) ).default();
} );

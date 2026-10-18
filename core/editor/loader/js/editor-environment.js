if ( ! window.refractionV2?.env ) {
	throw new Error( 'The "@refraction/env" package was not loaded.' );
}

window.refractionV2.env.initEnv( window.refractionEditorEnv );

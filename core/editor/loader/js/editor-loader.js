window.__refractionEditorV1LoadingPromise = new Promise( ( resolve ) => {
	window.addEventListener( 'refraction/init', () => {
		resolve();
	}, { once: true } );
} );

window.refraction.start();

if ( ! window.refractionV2?.editor ) {
	throw new Error( 'The "@refraction/editor" package was not loaded.' );
}

window.refractionV2
	.editor
	.start(
		document.getElementById( 'refraction-editor-wrapper-v2' ),
	);

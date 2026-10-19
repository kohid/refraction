/**
 * Live preview of Custom CSS in the editor.
 *
 * Elements: the editor builds one stylesheet per element view; the `editor/style/styleText` filter lets us
 * append the element's custom CSS to it. Page and Site Settings: a style tag in the preview head, refreshed
 * whenever the document settings change. The server still prints the sanitised version on the front end; the
 * preview only drops markup and script URLs.
 */
const SELECTOR = /(?<![\w.#-])selector(?![\w-])/gi;
const STYLE_IDS = { page: 'refraction-custom-css-page', kit: 'refraction-custom-css-site' };

const clean = ( css ) => String( css || '' )
	.replace( /<[^>]*>?/g, '' )
	.replace( /@import\b[^;{}]*;?/gi, '' )
	.replace( /[^;{}]*(?:javascript|vbscript)\s*:[^;}]*;?/gi, '' )
	.replace( /[^;{}]*expression\s*\([^;}]*;?/gi, '' );

const scope = ( css, selector ) => clean( css ).replace( SELECTOR, selector );

refraction.hooks.addFilter( 'editor/style/styleText', ( css, context ) => {
	const model = context && context.model;

	if ( ! model || ! model.get || ! model.get( 'elType' ) ) {
		return css;
	}

	const custom = model.get( 'settings' ).get( 'custom_css' );

	if ( ! custom ) {
		return css;
	}

	return css + scope( custom, '.refraction-element.refraction-element-' + model.get( 'id' ) );
} );

function paintDocument( container ) {
	const document = container && container.document;
	const type = document && document.config && document.config.type;

	if ( ! type || ! container.settings || ! container.settings.get ) {
		return;
	}

	const isKit = 'kit' === type;
	const id = STYLE_IDS[ isKit ? 'kit' : 'page' ];
	const head = refraction.$previewContents && refraction.$previewContents.find( 'head' );

	if ( ! head || ! head.length ) {
		return;
	}

	let tag = head.find( '#' + id );

	if ( ! tag.length ) {
		tag = jQuery( '<style>' ).attr( 'id', id ).appendTo( head );
	}

	const selector = 'body.refraction-' + ( isKit ? 'kit' : 'page' ) + '-' + document.id;

	tag.text( scope( container.settings.get( 'custom_css' ), selector ) );
}

class CustomCssDocumentPreview extends $e.modules.hookUI.After {
	getCommand() {
		return 'document/elements/settings';
	}

	getId() {
		return 'refraction-custom-css-document-preview';
	}

	getContainerType() {
		return 'document';
	}

	getConditions( args ) {
		return args.settings && Object.prototype.hasOwnProperty.call( args.settings, 'custom_css' );
	}

	apply( args ) {
		const containers = args.containers || [ args.container ];

		containers.forEach( paintDocument );
	}
}

refraction.on( 'preview:loaded', () => {
	const current = refraction.documents.getCurrent();

	if ( current && current.container ) {
		paintDocument( current.container );
	}
} );

$e.hooks.registerUIAfter( new CustomCssDocumentPreview() );

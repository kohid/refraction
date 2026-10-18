class LinkInBioLibraryModule extends refractionModules.editor.utils.Module {
	onRefractionInit() {
		refraction.hooks.addFilter(
			'refraction/editor/template-library/template/promotion-link-search-params',
			( queryString, templateData ) => {
				const { subtype } = templateData;
				if ( 'Link in Bio' === subtype ) {
					try {
						const searchParams = new URLSearchParams( queryString );

						if ( searchParams.has( 'utm_source' ) ) {
							searchParams.set( 'utm_source', 'template-library-link-in-bio' );
						}

						return searchParams.toString();
					} catch ( e ) {
						return queryString;
					}
				}
				return queryString;
			}, 1000 );
	}
}

export default LinkInBioLibraryModule;

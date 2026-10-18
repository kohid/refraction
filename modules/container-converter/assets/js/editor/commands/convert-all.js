export class ConvertAll extends $e.modules.editor.document.CommandHistoryBase {
	getHistory() {
		return {
			type: __( 'Converted to Containers', 'refraction' ),
			title: __( 'All Content', 'refraction' ),
		};
	}

	apply() {
		const { children } = refraction.getPreviewContainer();

		[ ...children ].forEach( ( container ) => {
			$e.run( 'container-converter/convert', { container } );
		} );
	}
}

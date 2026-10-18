export class Empty extends $e.modules.editor.document.CommandHistoryBase {
	static restore( historyItem, isRedo ) {
		if ( isRedo ) {
			$e.run( 'document/elements/empty', { force: true } );
		} else {
			const data = historyItem.get( 'data' );

			if ( data ) {
				refraction.getPreviewView().addChildModel( data );
			}

			$e.internal( 'document/save/set-is-modified', { status: true } );
		}
	}

	getHistory( args ) {
		if ( args.force ) {
			return {
				type: 'remove',
				title: __( 'All Content', 'refraction' ),
				data: refraction.elements ? refraction.elements.toJSON() : null,
				restore: this.constructor.restore,
			};
		}

		return false;
	}

	apply( args ) {
		if ( args.force && refraction.elements ) {
			refraction.elements.reset();
			refraction.getPreviewContainer().panel.closeEditor();
			return;
		}

		refraction.getClearPageDialog().show();
	}

	isDataChanged() {
		return this.args.force;
	}
}

export default Empty;

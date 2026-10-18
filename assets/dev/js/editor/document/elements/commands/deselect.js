export class Deselect extends $e.modules.editor.CommandContainerBase {
	validateArgs( args = {} ) {
		if ( ! args.all ) {
			this.requireContainer( args );
		}
	}

	apply( args ) {
		const { containers = [ args.container ], all = false } = args;

		refraction.selection.remove( containers, all );
	}
}

export default Deselect;

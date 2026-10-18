export class Do extends $e.modules.CommandBase {
	apply( args ) {
		const { index } = args;

		return refraction.documents.getCurrent().history.doItem( index );
	}
}

export default Do;

export default class Base extends $e.modules.CommandBase {
	initialize( args ) {
		super.initialize( args );

		const { document = refraction.documents.getCurrent() } = args;

		this.document = document;
	}
}

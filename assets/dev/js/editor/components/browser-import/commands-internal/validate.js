export class Validate extends $e.modules.CommandBase {
	/**
	 * @inheritDoc
	 */
	apply( args ) {
		const { input, options = {} } = args;

		return this.component.manager
			.createSession( input, refraction.getPreviewContainer(), options )
			.then( ( session ) => session.validate() );
	}
}

export default Validate;

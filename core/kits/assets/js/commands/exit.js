export class Exit extends $e.modules.CommandBase {
	apply() {
		return $e.run( 'editor/documents/close', {
			id: refraction.config.kit_id,
			onClose: ( document ) => {
				location = document.config.urls.exit_to_dashboard;
			},
		} );
	}
}

export default Exit;

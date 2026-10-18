export class Open extends $e.modules.CommandBase {
	apply( args ) {
		if ( ! this.component.setDefaultTab( args ) ) {
			refractionDevTools.deprecation.deprecated( "model.trigger( 'request:edit' )", '2.9.0', 'editSettings.defaultEditRoute' );

			args.model.trigger( 'request:edit' );
		} else {
			$e.route( this.component.getDefaultRoute(), args );
		}

		// BC: Run hooks after the route render's the view

		const elementType = args.model.get( 'elType' ),
			widgetType = args.model.get( 'widgetType' );

		// Example: panel/open_editor/widget
		refraction.hooks.doAction( `panel/open_editor/${ elementType }`, this.component.manager, args.model, args.view );

		// Example: panel/open_editor/widget/heading
		refraction.hooks.doAction( `panel/open_editor/${ elementType }/${ widgetType }`,
			this.component.manager,
			args.model,
			args.view,
		);
	}
}

export default Open;

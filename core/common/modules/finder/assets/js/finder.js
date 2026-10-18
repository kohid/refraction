import Component from './component';

export default class extends refractionModules.Module {
	onInit() {
		// TODO: Temp fix, do not load finder in theme-builder.
		// Better to pass into '$e' constructor the app owner. ( admin, editor, preview, iframe ).
		if ( window.top !== window ) {
			return;
		}

		this.channel = Backbone.Radio.channel( 'REFRACTION:finder' );

		$e.components.register( new Component( { manager: this } ) );
	}
}

import EditorPreferences from './editor-preferences/manager';

module.exports = refractionModules.Module.extend( {
	modules: {
		base: require( 'refraction-editor/components/settings/base/manager' ),
		page: require( 'refraction-editor/components/settings/page/manager' ),
		editorPreferences: EditorPreferences,
	},

	panelPages: {
		base: require( 'refraction-editor/components/settings/base/panel' ),
	},

	onInit() {
		this.initSettings();
	},

	initSettings() {
		var self = this;

		_.each( refraction.config.settings, function( config, name ) {
			var Manager = self.modules[ name ] || self.modules.base;

			self[ name ] = new Manager( config );
		} );
	},
} );

module.exports = refractionModules.editor.views.ControlsStack.extend( {
	id() {
		return 'refraction-panel-' + this.getOption( 'name' ) + '-settings';
	},

	getTemplate() {
		return '#tmpl-refraction-panel-' + this.getOption( 'name' ) + '-settings';
	},

	childViewContainer() {
		return '#refraction-panel-' + this.getOption( 'name' ) + '-settings-controls';
	},

	childViewOptions() {
		return {
			container: this.getOption( 'editedView' ).getContainer(),
		};
	},
} );

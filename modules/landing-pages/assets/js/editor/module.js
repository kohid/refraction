import Component from './component';

class LandingPageLibraryModule extends refractionModules.editor.utils.Module {
	onRefractionLoaded() {
		this.component = $e.components.register( new Component( { manager: this } ) );
	}
}

export default LandingPageLibraryModule;

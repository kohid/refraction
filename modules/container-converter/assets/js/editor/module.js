import Component from './component';

class Module extends refractionModules.editor.utils.Module {
	onInit() {
		$e.components.register( new Component() );
	}
}

new Module();

import Component from './component';

export default class extends refractionModules.Module {
	onInit() {
		$e.components.register( new Component( { manager: this } ) );
	}
}

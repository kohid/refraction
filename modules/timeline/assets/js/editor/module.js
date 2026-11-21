import Timeline from './timeline';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new Timeline() );
	}
}

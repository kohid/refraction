import FocusStack from './focus-stack';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new FocusStack() );
	}
}

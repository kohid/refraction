import DynamicContainer from './dynamic-container';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new DynamicContainer() );
	}
}

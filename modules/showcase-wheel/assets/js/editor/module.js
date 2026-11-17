import ShowcaseWheel from './showcase-wheel';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new ShowcaseWheel() );
	}
}

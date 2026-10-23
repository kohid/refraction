import NestedCarousel from './nested-carousel';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new NestedCarousel() );
	}
}

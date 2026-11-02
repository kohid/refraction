import TimedSlides from './timed-slides';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new TimedSlides() );
	}
}

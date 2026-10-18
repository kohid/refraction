import NestedAccordion from './nested-accordion';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new NestedAccordion() );
	}
}

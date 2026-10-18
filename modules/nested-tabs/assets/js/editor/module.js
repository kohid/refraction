import NestedTabs from './nested-tabs';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new NestedTabs() );
	}
}

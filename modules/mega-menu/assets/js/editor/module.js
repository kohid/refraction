import MegaMenu from './mega-menu';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new MegaMenu() );
	}
}

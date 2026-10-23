import OffCanvas from './off-canvas';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new OffCanvas() );
	}
}

import PinBoard from './pin-board';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new PinBoard() );
	}
}

import ConnectorSteps from './connector-steps';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new ConnectorSteps() );
	}
}

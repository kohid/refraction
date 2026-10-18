import ComponentBase from 'refraction-api/modules/component-base';
import * as dataCommands from './commands-data/';

export default class Component extends ComponentBase {
	getNamespace() {
		return 'wp';
	}

	defaultData() {
		return this.importCommands( dataCommands );
	}
}

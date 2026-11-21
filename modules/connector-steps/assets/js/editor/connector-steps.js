import View from './views/view';

/**
 * Connector (steps) in the editor: four steps to start, Add Step for more. Each step is a Container with all its
 * settings, placed in its own slot, with the arrow to the next one.
 */
export class ConnectorSteps extends refraction.modules.elements.types.NestedElementBase {
	getType() {
		return 'refraction-connector-steps';
	}

	getView() {
		return View;
	}
}

export default ConnectorSteps;

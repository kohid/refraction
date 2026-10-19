/**
 * Refraction does not collect or send telemetry. A number of editor modules inherited from the
 * upstream code still call `refractionCommon.eventsManager.dispatchEvent( ... )` and read deep keys
 * of `eventsManager.config` while building the (ignored) payload. This object keeps those calls
 * harmless: every property is another null object, every call returns another null object, and nothing
 * leaves the browser.
 */
const createNull = () => {
	const target = function() {};

	return new Proxy( target, {
		get( _target, key ) {
			if ( Symbol.toPrimitive === key ) {
				return () => '';
			}

			if ( 'then' === key ) {
				return undefined;
			}

			return createNull();
		},
		// Calls return another null object (not undefined) so that chains such as
		// `config.x.y.replace( ... ).toLowerCase()`, used while building the ignored payloads, do not throw.
		apply() {
			return createNull();
		},
	} );
};

export default class NullEventsManager {
	config = createNull();

	dispatchEvent() {}

	getExperimentVariant( experimentName, fallback = 'control' ) {
		return fallback;
	}

	startExperiment() {}

	sendPageViewsWebsiteTemplates() {}
}

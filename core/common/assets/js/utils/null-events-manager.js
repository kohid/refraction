/**
 * Refraction does not collect or send telemetry. A number of editor modules inherited from the
 * upstream code still call `refractionCommon.eventsManager.dispatchEvent( ... )` and read deep keys
 * of `eventsManager.config` while building the (ignored) payload. This object keeps those calls
 * harmless: every property is another null object, every call returns `undefined`, and nothing
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
		apply() {
			return undefined;
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

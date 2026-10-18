export class StateReady extends $e.modules.CommandInternalBase {
	apply() {
		refractionCommon.elements.$body.removeClass( 'refraction-panel-loading' );

		// Cannot be hook because not sure if it affects UI or data.
		if ( ! this.component.stateReadyOnce ) {
			this.component.stateReadyOnce = true;

			$e.extras.hashCommands.runOnce();
		}
	}
}

export default StateReady;

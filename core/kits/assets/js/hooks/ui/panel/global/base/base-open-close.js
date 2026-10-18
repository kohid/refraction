export default class BaseOpenClose extends $e.modules.hookUI.After {
	initialize() {
		refraction.on( 'preview:loaded', () => {
			this.component = $e.components.get( 'panel/global' );
		} );
	}
}

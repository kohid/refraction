import Deprecation from './deprecation';
import Module from './module';

if ( ! window.refractionDevTools ) {
	window.refractionDevTools = new Module(
		new Deprecation(),
	);

	window.refractionDevTools.notifyBackendDeprecations();
}

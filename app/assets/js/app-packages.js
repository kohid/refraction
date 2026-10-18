/**
 * Temporary solution for share components.
 * TODO.
 */

// Make router available for use within packages.
import router from './router';

// Alphabetical order.
import { appUi, components, hooks } from './package';

window.refractionAppPackages = {
	appUi,
	components,
	hooks,
	router,
};

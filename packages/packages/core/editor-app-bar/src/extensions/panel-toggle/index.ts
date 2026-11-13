import { utilitiesMenu } from '../../locations';
import useActionProps from './hooks/use-action-props';

export function init() {
	utilitiesMenu.registerToggleAction( {
		id: 'toggle-panel',
		priority: 23,
		useProps: useActionProps,
	} );
}

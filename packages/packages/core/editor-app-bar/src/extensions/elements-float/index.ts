import { utilitiesMenu } from '../../locations';
import useActionProps from './hooks/use-action-props';

export function init() {
	utilitiesMenu.registerToggleAction( {
		id: 'toggle-elements-float',
		priority: 24,
		useProps: useActionProps,
	} );
}

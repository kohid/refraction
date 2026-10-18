import refractionModules from 'refraction-assets-js/modules/modules';
import ModalLayout from './views/modal/layout';
import ComponentBase from 'refraction-api/modules/component-base';
import ComponentModalBase from 'refraction-api/modules/component-modal-base';
import HookBreak from 'refraction-api/modules/hook-break';

refractionModules.common = {
	/**
	 * @deprecated since 2.9.0, use `$e.modules.ComponentBase` instead.
	 */
	get Component() {
		// `refractionCommon` isn't available during it self initialize.
		setTimeout( () => {
			refractionDevTools.deprecation.deprecated( 'refractionModules.common.Component', '2.9.0',
				'$e.modules.ComponentBase' );
		}, 2000 );
		return ComponentBase;
	},

	/**
	 * @deprecated since 2.9.0, use `$e.modules.ComponentModalBase` instead.
	 */
	get ComponentModal() {
		// `refractionCommon` isn't available during it self initialize.
		setTimeout( () => {
			refractionDevTools.deprecation.deprecated( 'refractionModules.common.ComponentModal', '2.9.0',
				'$e.modules.ComponentModalBase' );
		}, 2000 );
		return ComponentModalBase;
	},

	/**
	 * @deprecated since 2.9.0, use `$e.modules.HookBreak` instead.
	 */
	get HookBreak() {
		// `refractionCommon` isn't available during it self initialize.
		setTimeout( () => {
			refractionDevTools.deprecation.deprecated( 'refractionModules.common.HookBreak', '2.9.0',
				'$e.modules.HookBreak' );
		}, 2000 );
		return HookBreak;
	},

	views: {
		modal: {
			Layout: ModalLayout,
		},
	},
};

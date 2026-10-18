export default class extends refractionModules.Module {
	constructor() {
		super();

		refractionFrontend.elementsHandler.attachHandler( 'text-path', () => import( /* webpackChunkName: 'text-path' */ './handlers/text-path' ) );
	}
}

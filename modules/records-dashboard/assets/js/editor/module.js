import SidebarPanel from './sidebar-panel';

export default class Module {
	constructor() {
		refraction.elementsManager.registerElementType( new SidebarPanel() );
	}
}

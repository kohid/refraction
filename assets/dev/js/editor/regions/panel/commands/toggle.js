export class Toggle extends $e.modules.CommandBase {
	apply() {
		refraction.getPanelView().modeSwitcher.currentView.toggleMode();
	}
}

export default Toggle;


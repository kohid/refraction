import CommandBase from 'refraction-api/modules/command-base';

export class NavigateDown extends CommandBase {
	apply() {
		this.component.getItemsView().activateNextItem();
	}
}

export default NavigateDown;

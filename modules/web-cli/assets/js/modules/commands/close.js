import CommandBase from 'refraction-api/modules/command-base';

export class Close extends CommandBase {
	apply() {
		this.component.close();
	}
}

export default Close;

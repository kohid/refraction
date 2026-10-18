import CommandBase from 'refraction-api/modules/command-base';

export class Open extends CommandBase {
	apply() {
		$e.route( this.component.getNamespace() );
	}
}

export default Open;

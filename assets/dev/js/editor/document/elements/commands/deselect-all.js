export class DeselectAll extends $e.modules.CommandBase {
	apply() {
		refraction.selection.remove( [], true );
	}
}

export default DeselectAll;

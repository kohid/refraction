export class Open extends $e.modules.CommandBase {
	apply() {
		$e.route( this.component.getNamespace() );
	}
}

export class Close extends $e.modules.CommandBase {
	apply() {
		return this.component.close();
	}
}

export class Toggle extends $e.modules.CommandBase {
	apply() {
		$e.run( this.component.isOpen ? 'elements-float/close' : 'elements-float/open' );
	}
}

// Dock to 'left' or 'right', or float again with ''.
export class Dock extends $e.modules.CommandBase {
	validateArgs( args ) {
		this.requireArgument( 'side', args );
	}

	apply( { side } ) {
		this.component.manager.setDock( side );
	}
}

export class ChangeDeviceMode extends $e.modules.CommandBase {
	apply( args = {} ) {
		const devices = refraction.breakpoints.getActiveBreakpointsList( { largeToSmall: true, withDesktop: true } );
		let { device } = args;

		if ( ! device ) {
			const currentDeviceMode = refraction.channels.deviceMode.request( 'currentMode' );
			let modeIndex = devices.indexOf( currentDeviceMode );

			modeIndex++;

			if ( modeIndex >= devices.length ) {
				modeIndex = 0;
			}

			device = devices[ modeIndex ];
		}

		refraction.changeDeviceMode( device );
	}
}

export default ChangeDeviceMode;

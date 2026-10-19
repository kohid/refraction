import { arrayToClassName } from 'refraction-app/utils/utils.js';

import ProcessFailedDialog from '../process-failed-dialog/process-failed-dialog';
import WizardStep from '../../ui/wizard-step/wizard-step';

export default function FileProcess( props ) {
	return (
		<WizardStep
			className={ arrayToClassName( [ 'e-app-import-export-file-process', props.className ] ) }
			icon="rficon-loading rficon-animation-spin"
			// eslint-disable-next-line @wordpress/i18n-ellipsis
			heading={ __( 'Setting up your website template...', 'refraction' ) }
			description={
				<>
					{ __( 'This usually takes a few moments.', 'refraction' ) }
					<br />
					{ __( "Don't close this window until the process is finished.", 'refraction' ) }
				</>
			}
			info={ props.info }
		>
			{ ! ! props.errorType &&
				<ProcessFailedDialog
					onApprove={ props.onDialogApprove }
					onDismiss={ props.onDialogDismiss }
					errorType={ props.errorType }
				/>
			}
		</WizardStep>
	);
}

FileProcess.propTypes = {
	className: PropTypes.string,
	onDialogApprove: PropTypes.func,
	onDialogDismiss: PropTypes.func,
	errorType: PropTypes.string,
	info: PropTypes.string,
};

FileProcess.defaultProps = {
	className: '',
};

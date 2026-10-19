import { useState } from 'react';

import MessageBanner from '../../../../../ui/message-banner/message-banner';
import GoProButton from 'refraction-app/molecules/go-pro-button';
import Dialog from 'refraction-app/ui/dialog/dialog';

import './pro-banner.scss';

export default function ProBanner( { onRefresh } ) {
	const [ showInfoDialog, setShowInfoDialog ] = useState( false ),
		openGoProExternalPage = () => window.open( 'https://github.com/kohid/refraction#readme', '_blank' ),
		onDialogDismiss = () => setShowInfoDialog( false ),
		onDialogApprove = () => {
			setShowInfoDialog( false );

			onRefresh();
		},
		handleGoPro = () => {
			setShowInfoDialog( true );

			openGoProExternalPage();
		};

	return (
		<>
			<MessageBanner
				heading={ __( 'Install Refraction Pro', 'refraction' ) }
				description={ __( "Without Refraction Pro, importing components like templates, widgets and popups won't work.", 'refraction' ) }
				button={ <GoProButton onClick={ handleGoPro } /> }
			/>

			{
				showInfoDialog &&
				<Dialog
					title={ __( 'Is your Refraction Pro ready?', 'refraction' ) }
					text={ __( 'If you’ve purchased, installed & activated Refraction Pro, we can continue importing all the parts of this site.', 'refraction' ) }
					approveButtonColor="primary"
					approveButtonText={ __( 'Yes', 'refraction' ) }
					approveButtonOnClick={ onDialogApprove }
					dismissButtonText={ __( 'Not yet', 'refraction' ) }
					dismissButtonOnClick={ onDialogDismiss }
					onClose={ onDialogDismiss }
				/>
			}
		</>
	);
}

ProBanner.propTypes = {
	status: PropTypes.string,
	onRefresh: PropTypes.func,
};

ProBanner.defaultProps = {
	status: '',
};

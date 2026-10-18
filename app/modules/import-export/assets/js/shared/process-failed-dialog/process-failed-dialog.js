import { useEffect, useContext } from 'react';
import { useNavigate } from '@reach/router';

import Dialog from 'refraction-app/ui/dialog/dialog';

import useQueryParams from 'refraction-app/hooks/use-query-params';
import useAction from 'refraction-app/hooks/use-action';
import InlineLink from 'refraction-app/ui/molecules/inline-link';
import { KIT_SOURCE_MAP } from '../../hooks/use-kit';
import safeRedirect from '../utils/redirect';
import { SharedContext } from '../../context/shared-context/shared-context-provider';

const messagesContent = {
	general: {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: <>
			{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
			{ __( 'We couldn’t download the Website Template due to technical difficulties on our part. Try again and if the problem persists contact ', 'refraction' ) }
			<InlineLink url="https://my.elementor.com/support-center/">
				{ __( 'Support', 'refraction' ) }
			</InlineLink>
		</>,
	},
	'zip-archive-module-missing': {
		title: __( 'Couldn’t handle the Website Template', 'refraction' ),
		text: __( 'Seems like your server is missing the PHP zip module. Install it on your server or contact your site host for further instructions.', 'refraction' ),
	},
	'invalid-zip-file': {
		title: __( 'Couldn’t use the .zip file', 'refraction' ),
		text: <>
			{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
			{ __( 'Seems like there is a problem with the zip’s files. Try installing again and if the problem persists contact ', 'refraction' ) }
			<InlineLink url="https://my.elementor.com/support-center/">
				{ __( 'Support', 'refraction' ) }
			</InlineLink>
		</>,
	},
	timeout: {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: <>
			{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
			{ __( 'It took too much time to download your Website Template and we were unable to complete the process. If all the Website Template’s parts don’t appear in ', 'refraction' ) }
			<InlineLink url={ refractionAppConfig.pages_url } >
				{ __( 'Pages', 'refraction' ) }
			</InlineLink>
			{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
			{ __( ', try again and if the problem persists contact ', 'refraction' ) }
			<InlineLink url="https://my.elementor.com/support-center/">
				{ __( 'Support', 'refraction' ) }
			</InlineLink>
		</>,
	},
	'invalid-kit-library-zip-error': {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: <>
			{ __( 'We couldn’t download the Website Template due to technical difficulty on our part. Try again in a few minutes and if the problem persists contact', 'refraction' ) }
			<InlineLink url="https://my.elementor.com/support-center/">
				{ __( 'Support', 'refraction' ) }
			</InlineLink>
		</>,
	},
	'no-write-permissions': {
		title: __( 'Couldn’t access the file', 'refraction' ),
		text: __( 'Seems like Refraction isn’t authorized to access relevant files for installing this Website Template. Contact your site host to get permission.', 'refraction' ),
	},
	'plugin-installation-permissions-error': {
		title: __( 'Couldn’t install the Website Template', 'refraction' ),
		text: __( 'The Website Template includes plugins you don’t have permission to install. Contact your site admin to change your permissions.', 'refraction' ),
	},
	'third-party-error': {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: __( 'This is due to a conflict with one or more third-party plugins already active on your site. Try disabling them, and then give the download another go.', 'refraction' ),
	},
	'domdocument-missing': {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: __( 'This download requires the \'DOMDocument\' PHP extension, which we couldn’t detect on your server. Enable this extension, or get in touch with your hosting service for support, and then give the download another go.', 'refraction' ),
	},
	'insufficient-quota': {
		title: __( 'Couldn’t Export the Website Template', 'refraction' ),
		text: __( 'The export failed because it will pass the maximum Website Templates you can export.', 'refraction' ),
	},
	'failed-to-fetch-quota': {
		title: __( 'Couldn’t fetch quota', 'refraction' ),
		text: __( 'Failed to fetch quota.', 'refraction' ),
	},
	'insufficient-storage-quota': {
		title: __( 'Couldn’t Export the Website Template', 'refraction' ),
		text: __( 'The export failed because it will pass the maximum Website Templates storage you have available.', 'refraction' ),
	},
};

export default function ProcessFailedDialog( { errorType, onApprove, onDismiss, approveButton, dismissButton, onModalClose, onError, onLearnMore } ) {
	const action = useAction(),
		sharedContext = useContext( SharedContext ),
		{ returnTo } = sharedContext.data || {},
		navigate = useNavigate(),
		{ referrer, source } = useQueryParams().getAll(),
		error = 'string' === typeof errorType && messagesContent[ errorType ] ? errorType : 'general',
		{ title, text } = messagesContent[ error ],
		tryAgainText = __( 'Try Again', 'refraction' ),
		isTryAgainAction = 'general' === error && onApprove,
		handleOnApprove = () => {
			/*
			* When the errorType is general, there should be an option to trigger the onApprove function.
			* All other error messages should open the learn-more link.
			*/
			if ( isTryAgainAction ) {
				onApprove();
			} else {
				window.open( 'https://go.elementor.com/app-import-download-failed', '_blank' );
			}
			onLearnMore?.();
		},
		handleOnDismiss = ( event ) => {
			const isLoadingKitFromCloud = KIT_SOURCE_MAP.CLOUD === source;
			if ( returnTo && safeRedirect( returnTo ) ) {
				return;
			}
			if ( 'general' === error && onDismiss ) {
				onDismiss();
			} else if ( 'kit-library' === referrer ) {
				onModalClose?.( event );
				navigate( `/kit-library${ isLoadingKitFromCloud ? '/cloud' : '' }` );
			} else {
				action.backToDashboard();
			}
		};

	useEffect( () => {
		onError?.();
	}, [] );

	return (
		<Dialog
			title={ title }
			text={ text }
			approveButtonColor="link"
			approveButtonText={ isTryAgainAction ? tryAgainText : approveButton }
			approveButtonOnClick={ handleOnApprove }
			dismissButtonText={ dismissButton }
			dismissButtonOnClick={ ( event ) => handleOnDismiss( event ) }
			onClose={ handleOnDismiss }
		/>
	);
}

ProcessFailedDialog.propTypes = {
	onApprove: PropTypes.func,
	onDismiss: PropTypes.func,
	errorType: PropTypes.string,
	approveButton: PropTypes.string,
	dismissButton: PropTypes.string,
	onModalClose: PropTypes.func,
	onError: PropTypes.func,
	onLearnMore: PropTypes.func,
};

ProcessFailedDialog.defaultProps = {
	errorType: 'general',
	approveButton: __( 'Learn More', 'refraction' ),
	dismissButton: __( 'Close', 'refraction' ),
};

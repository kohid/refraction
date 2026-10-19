import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogHeader,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Link as RefractionUiLink,
	Typography,
} from '@elementor/ui';
import { __, sprintf } from '@wordpress/i18n';
import PropTypes from 'prop-types';

function Link( {
	href,
	children,
} ) {
	return (
		<RefractionUiLink
			href={ href }
			variant="body2"
			color="info.light"
			underline="hover"
			target="_blank"
			rel="noopener noreferrer"
		>
			{ children }
		</RefractionUiLink>
	);
}

Link.propTypes = {
	href: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
};

export const messagesContent = {
	general: {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: <>
			{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
			{ __( 'We couldn’t download the Website Template due to technical difficulties on our part. Try again and if the problem persists contact ', 'refraction' ) }
			<Link href="https://github.com/kohid/refraction/issues">
				{ __( 'Support', 'refraction' ) }
			</Link>
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
			<Link href="https://github.com/kohid/refraction/issues">
				{ __( 'Support', 'refraction' ) }
			</Link>
		</>,
	},
	timeout: {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: (
			<>
				{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
				{ __( 'It took too much time to download your Website Template and we were unable to complete the process. If all the Website Template’s parts don’t appear in ', 'refraction' ) }
				<Link href={ refractionAppConfig.pages_url } >
					{ __( 'Pages', 'refraction' ) }
				</Link>
				{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
				{ __( ', try again and if the problem persists contact ', 'refraction' ) }
				<Link href="https://github.com/kohid/refraction/issues">
					{ __( 'Support', 'refraction' ) }
				</Link>
			</>
		),
	},
	'invalid-kit-library-zip-error': {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: <>
			{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
			{ __( 'We couldn’t download the Website Template due to technical difficulty on our part. Try again in a few minutes and if the problem persists contact ', 'refraction' ) }
			<Link href="https://github.com/kohid/refraction/issues" >
				{ __( 'Support', 'refraction' ) }
			</Link>
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
		text: (
			<>
				{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
				{ __( 'The export failed because it will pass the maximum Website Templates you can export. ', 'refraction' ) }
				<Link href="https://github.com/kohid/refraction/issues" >
					{ __( 'Learn more', 'refraction' ) }
				</Link>
			</>
		),
	},
	'failed-to-fetch-quota': {
		title: __( 'Couldn’t fetch quota', 'refraction' ),
		text: (
			<>
				{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
				{ __( 'Failed to fetch quota, please try again. If the problem continues, contact ', 'refraction' ) }
				<Link href="https://github.com/kohid/refraction/issues">
					{ __( 'Support', 'refraction' ) }
				</Link>
				{ '. ' }
				<Link href="https://github.com/kohid/refraction/issues" >
					{ __( 'Learn more', 'refraction' ) }
				</Link>
			</>
		),
	},
	'cloud-upload-failed': {
		title: __( 'Couldn’t Upload to Library', 'refraction' ),
		text: (
			<>
				{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
				{ __( 'We couldn’t add your export to the library. Try again. ', 'refraction' ) }
				<Link href="https://github.com/kohid/refraction/issues" >
					{ __( 'Learn more', 'refraction' ) }
				</Link>
			</>
		),
	},
	'error-loading-resource': {
		title: __( 'Unable to download the Website Template', 'refraction' ),
		text: (
			<>
				{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
				{ __( 'We couldn’t download the Website Template due to technical difficulties on our part. Try again and if the problem persists contact ', 'refraction' ) }
				<Link href="https://github.com/kohid/refraction/issues">
					{ __( 'Support', 'refraction' ) }
				</Link>
				{ '. ' }
				<Link href="https://github.com/kohid/refraction/issues" >
					{ __( 'Learn more', 'refraction' ) }
				</Link>
			</>
		),
	},
	'media-processing-error': {
		title: __( 'Couldn’t save media files to the cloud', 'refraction' ),
		text: (
			<>
				{ /* eslint-disable-next-line @wordpress/i18n-no-flanking-whitespace */ }
				{ __( 'We ran into a problem while saving your media files to the cloud. Please try again. If the issue persists, edit the Content section and choose "Link to media" to save it as a reference. ', 'refraction' ) }
				<Link href="https://github.com/kohid/refraction/issues">
					{ __( 'Learn more', 'refraction' ) }
				</Link>
			</>
		),
	},
	'insufficient-storage-quota': {
		title: __( 'Your library is full', 'refraction' ),
		text: ( { filename = __( 'This file', 'refraction' ), maxSize = 0 } = {} ) => (
			<>
				<Typography variant="h6" sx={ { mb: 2 } }>
					{ sprintf( /* Translators: %s: File name */
						__( '%s exceeds the library size limit', 'refraction' ),
						filename,
					) }
				</Typography>
				<Typography variant="body2">
					{ sprintf( /* Translators: %s: Quota threshold in GB */
						__( 'The maximum website template library size is %s GB. To save this file, you can either export it locally as a .zip file or get more storage by', 'refraction' ),
						maxSize,
					) }{ ' ' }
					<Link href="https://github.com/kohid/refraction#readme">
						{ __( 'Upgrade now', 'refraction' ) }
					</Link>
					.
				</Typography>
			</>
		),
	},
};

export function ProcessingErrorDialog( {
	error,
	handleClose,
	handleTryAgain,
	handleExportAsZip,
} ) {
	const [ open, setOpen ] = useState( Boolean( error ) );
	const errorType = error?.code || 'general';
	const errorMessageContent = messagesContent[ errorType ] ?? messagesContent.general;

	const resolveText = () => {
		const details = error?.details || error?.message;
		const replacements = details && 'object' === typeof details ? details.replacements : null;

		const text = errorMessageContent.text;

		if ( 'function' === typeof text ) {
			return text( replacements );
		}

		return text;
	};

	const shouldRenderTryAgainButton = () => {
		return [
			'general',
			'timeout',
			'cloud-upload-failed',
			'third-party-error',
			'invalid-zip-file',
			'zip-archive-module-missing',
			'no-write-permissions',
			'plugin-installation-permissions-error',
			'failed-to-fetch-quota',
			'insufficient-quota',
			'error-loading-resource',
			'media-processing-error',
			'import-runner-error',
		].includes( errorType );
	};

	const renderButtons = () => {
		const isQuotaError = 'insufficient-storage-quota' === errorType;

		return (
			<>
				<Button
					onClick={ () => {
						if ( handleClose ) {
							handleClose();
						}
						setOpen( false );
					} }
					color="secondary"
				>
					{ __( 'Cancel', 'refraction' ) }
				</Button>
				{ isQuotaError && handleExportAsZip && (
					<Button
						onClick={ () => {
							handleExportAsZip();
							setOpen( false );
						} }
						variant="contained"
						color="primary"
					>
						{ __( 'Export as .zip', 'refraction' ) }
					</Button>
				) }
				{ shouldRenderTryAgainButton( errorType ) && ! isQuotaError && (
					<Button
						data-testid="try-again-button"
						onClick={ () => {
							if ( handleTryAgain ) {
								handleTryAgain();
							}
						} }
						variant="contained"
						color="primary"
					>
						{ __( 'Try Again', 'refraction' ) }
					</Button>
				) }
			</>
		);
	};

	useEffect( () => {
		setOpen( Boolean( error ) );
	}, [ error ] );

	if ( ! error ) {
		return null;
	}

	return (
		<Dialog
			data-testid="error-dialog"
			open={ open }
			onClose={ () => {
				if ( handleClose ) {
					handleClose();
				}
				setOpen( false );
			} }
			maxWidth="sm"
		>
			<DialogHeader onClose={ handleClose }>
				<DialogTitle>
					{ errorMessageContent.title }
				</DialogTitle>
			</DialogHeader>

			<DialogContent dividers sx={ { p: 3 } }>
				{ resolveText() }
			</DialogContent>

			<DialogActions>
				{ renderButtons() }
			</DialogActions>
		</Dialog>
	);
}

ProcessingErrorDialog.propTypes = {
	error: PropTypes.any,
	handleClose: PropTypes.func,
	handleTryAgain: PropTypes.func,
	handleExportAsZip: PropTypes.func,
};

import * as React from 'react';
import { useEffect, useState } from 'react';
import {
	installAngiePlugin,
	isAngieAvailable,
	redirectToAppAdmin,
	redirectToInstallation,
	saveAngieConsent,
	sendPromptToAngie,
} from '@refraction/editor-mcp';
import { ThemeProvider } from '@refraction/editor-ui';
import { trackEvent } from '@refraction/events';
import { XIcon } from '@elementor/icons';
import {
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogContent,
	FormControlLabel,
	IconButton,
	Image,
	Stack,
	Typography,
} from '@elementor/ui';
import { __, sprintf } from '@wordpress/i18n';

import { interpolateLinks } from '../interpolate-links';

type ShowModalEventDetail = {
	prompt?: string;
	entry_point: string;
};

type InstallState = 'idle' | 'installing' | 'error';

type CreateWidgetModalProps = {
	prompt?: string;
	entryPoint: string;
	onClose: () => void;
};

const CREATE_WIDGET_EVENT = 'refraction/editor/create-widget';
const ANGIE_MODAL_PROMOTION_IMAGE_URL =
	'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E';
const ANGIE_CTA_CLICKED_EVENT = 'ai_widget_cta_clicked' as const;
const ANGIE_INSTALL_STARTED_EVENT = 'angie_install_started' as const;
const ANGIE_INSTALL_COMPLETED_EVENT = 'angie_install_completed' as const;
const ANGIE_INSTALL_ABANDONED_EVENT = 'angie_install_abandoned' as const;

function CreateWidgetModal( { prompt, entryPoint, onClose }: CreateWidgetModalProps ) {
	const [ installState, setInstallState ] = useState< InstallState >( 'idle' );
	const [ agreedToTerms, setAgreedToTerms ] = useState( false );

	const handleClose = () => {
		if ( installState === 'installing' ) {
			return;
		}

		trackEvent( {
			eventName: ANGIE_INSTALL_ABANDONED_EVENT,
			abandon_step: installState === 'error' ? 'install_error' : 'install_modal',
			trigger_source: entryPoint,
		} );

		onClose();
	};

	const handleInstall = async () => {
		setInstallState( 'installing' );

		trackEvent( {
			eventName: ANGIE_INSTALL_STARTED_EVENT,
			trigger_source: entryPoint,
		} );

		const [ result ] = await Promise.all( [ installAngiePlugin(), saveAngieConsent() ] );

		if ( ! result.success ) {
			setInstallState( 'error' );

			return;
		}

		trackEvent( {
			eventName: ANGIE_INSTALL_COMPLETED_EVENT,
			trigger_source: entryPoint,
		} );

		redirectToAppAdmin( prompt );
	};

	const handleFallbackInstall = () => {
		redirectToInstallation( prompt );
	};

	return (
		<ThemeProvider>
			<Dialog fullWidth maxWidth="md" open onClose={ handleClose }>
				<IconButton
					aria-label={ __( 'Close', 'refraction' ) }
					onClick={ handleClose }
					sx={ {
						position: 'absolute',
						right: 8,
						top: 8,
						zIndex: 1,
					} }
				>
					<XIcon />
				</IconButton>
				<DialogContent sx={ { p: 0, overflow: 'hidden' } }>
					<Stack direction="row" sx={ { height: 400 } }>
						<Image
							sx={ {
								height: '100%',
								aspectRatio: '1 / 1',
								objectFit: 'cover',
								objectPosition: 'right center',
							} }
							src={ ANGIE_MODAL_PROMOTION_IMAGE_URL }
						/>
						<Stack justifyContent="space-between" p={ 4 }>
							<Stack gap={ 2.5 } justifyContent="center" sx={ { flex: 1, paddingInlineEnd: 2.5 } }>
								<Typography variant="h4" fontWeight={ 600 } color="text.secondary">
									{ installState === 'error' ? (
										__( 'Installation failed', 'refraction' )
									) : (
										<>
											{ __( 'Pages, layouts,', 'refraction' ) }
											<br />
											{ __( 'widgets and more', 'refraction' ) }
										</>
									) }
								</Typography>
								<Typography variant="body2" fontWeight={ 500 }>
									{ installState === 'error'
										? __(
												"We couldn't install Angie automatically. Click below to install it manually.",
												'refraction'
										  )
										: __(
												'Ask Angie to build you full pages, custom widgets, snippets, and code directly in Refraction. Install and activate Angie once on this site to start building.',
												'refraction'
										  ) }
								</Typography>
								{ installState !== 'error' && (
									<FormControlLabel
										control={
											<Checkbox
												size="small"
												checked={ agreedToTerms }
												onChange={ (
													_e: React.ChangeEvent< HTMLInputElement >,
													checked: boolean
												) => setAgreedToTerms( checked ) }
											/>
										}
										label={
											<Typography variant="body2" color="text.secondary">
												{ interpolateLinks(
													sprintf(
														// translators: %1$s is the Terms link, %2$s is the Privacy Policy link.
														__(
															'By installing, you agree to our %1$s & %2$s.',
															'refraction'
														),
														'{{terms}}',
														'{{privacy}}'
													),
													{
														terms: {
															label: __( 'Terms', 'refraction' ),
															href: 'https://github.com/kohid/refraction#readme',
														},
														privacy: {
															label: __( 'Privacy Policy', 'refraction' ),
															href: 'https://github.com/kohid/refraction#readme',
														},
													}
												) }
											</Typography>
										}
									/>
								) }
							</Stack>
							<Stack direction="row" justifyContent="flex-end">
								{ installState === 'error' ? (
									<Button variant="contained" color="accent" onClick={ handleFallbackInstall }>
										{ __( 'Install Manually', 'refraction' ) }
									</Button>
								) : (
									<Button
										variant="contained"
										color="accent"
										onClick={ handleInstall }
										disabled={ installState === 'installing' || ! agreedToTerms }
										startIcon={
											installState === 'installing' ? (
												<CircularProgress size={ 18 } color="inherit" />
											) : undefined
										}
									>
										{ installState === 'installing'
											? __( 'Installing…', 'refraction' )
											: __( 'Install and activate', 'refraction' ) }
									</Button>
								) }
							</Stack>
						</Stack>
					</Stack>
				</DialogContent>
			</Dialog>
		</ThemeProvider>
	);
}

export function CreateWidget() {
	const [ modalData, setModalData ] = useState< ShowModalEventDetail | null >( null );

	useEffect( () => {
		const handleShow = ( event: Event ) => {
			const customEvent = event as CustomEvent< ShowModalEventDetail >;
			const hasAngieInstalled = isAngieAvailable();

			trackEvent( {
				eventName: ANGIE_CTA_CLICKED_EVENT,
				entry_point: customEvent.detail.entry_point,
				has_angie_installed: hasAngieInstalled,
			} );

			if ( hasAngieInstalled ) {
				sendPromptToAngie( customEvent.detail?.prompt );

				return;
			}

			setModalData( customEvent.detail );
		};

		window.addEventListener( CREATE_WIDGET_EVENT, handleShow );

		return () => {
			window.removeEventListener( CREATE_WIDGET_EVENT, handleShow );
		};
	}, [] );

	if ( ! modalData ) {
		return null;
	}

	return (
		<CreateWidgetModal
			prompt={ modalData.prompt }
			entryPoint={ modalData.entry_point }
			onClose={ () => setModalData( null ) }
		/>
	);
}

import { Button, Card, CardActions, CardContent, CardMedia, Typography } from '@elementor/ui';
import { __ } from '@wordpress/i18n';
import useAjax from 'refraction-app/hooks/use-ajax';
import { useEffect } from 'react';
import { addMixpanelTrackingChecklistSteps } from '../../utils/functions';
import { MIXPANEL_CHECKLIST_STEPS } from '../../utils/consts';

const { ACTION, WELL_DONE } = MIXPANEL_CHECKLIST_STEPS;

const SuccessMessage = () => {
	const { ajaxState, setAjax } = useAjax();

	const hideChecklist = () => {
		addMixpanelTrackingChecklistSteps( WELL_DONE, ACTION );

		setAjax( {
			data: {
				action: 'refraction_ajax',
				actions: JSON.stringify( {
					save_editorPreferences_settings: {
						action: 'save_editorPreferences_settings',
						data: {
							data: {
								show_launchpad_checklist: '',
							},
						},
					},
				} ),
			},
		} );
	};

	useEffect( () => {
		switch ( ajaxState.status ) {
			case 'success':
				setTimeout( () => {
					$e.commands.run( 'checklist/toggle-icon', false );
				}, 0 );
				break;
			case 'error':
				break;
		}
	}, [ ajaxState ] );

	return (
		<Card elevation={ 0 } square={ true } className="e-checklist-done">
			<CardMedia
				image="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 160 100%27%3E%3Crect width=%27160%27 height=%27100%27 fill=%27%23f1f3f5%27/%3E%3Cpath d=%27M80 22l22 40H58z%27 fill=%27none%27 stroke=%27%23495057%27 stroke-width=%273%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E"
				sx={ { height: 180 } }
			/>
			<CardContent sx={ { textAlign: 'center' } }>
				<Typography variant="h6" color="text.primary">{ __( 'You\'re on your way!', 'refraction' ) }</Typography>
				<Typography variant="body2" color="text.secondary" component="p">
					{ __( 'With these steps, you\'ve got a great base for a robust website. Enjoy your web creation journey!', 'refraction' ) }
				</Typography>
			</CardContent>
			<CardActions sx={ { justifyContent: 'center' } }>
				<Button
					color="primary"
					size="small"
					variant="contained"
					onClick={ hideChecklist }
				>
					{ __( 'Got it', 'refraction' ) }
				</Button>
			</CardActions>
		</Card>
	);
};

export default SuccessMessage;

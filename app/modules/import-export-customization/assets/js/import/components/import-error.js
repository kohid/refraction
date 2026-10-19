import { XIcon } from '@elementor/icons';
import { Box, Typography, Stack, Button } from '@elementor/ui';
import PropTypes from 'prop-types';
import { useImportContext } from '../context/import-context';

const HELP_URL = 'https://github.com/kohid/refraction/issues';

export default function ImportError( { statusText } ) {
	const { dispatch } = useImportContext();
	const handleTryAgain = () => {
		dispatch( { type: 'RESET_STATE' } );
		window.location.href = refractionAppConfig.base_url + '#/import-customization/';
	};

	const handleLearnMore = () => {
		window.open( HELP_URL, '_blank' );
	};

	return (
		<>
			<Box sx={ {
				width: 60,
				height: 60,
				borderRadius: '50%',
				backgroundColor: 'error.main',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: 'white',
			} }>
				<XIcon sx={ { fontSize: '24px' } } />
			</Box>

			<Typography variant="h5" component="h2" data-testid="import-error" >
				{ statusText }
			</Typography>

			<Stack direction="row" spacing={ 2 }>
				<Button variant="contained" onClick={ handleTryAgain } data-testid="import-error-try-again-button">
					{ __( 'Try Again', 'refraction' ) }
				</Button>
				<Button variant="outlined" onClick={ handleLearnMore } data-testid="import-error-learn-more-button">
					{ __( 'Learn More', 'refraction' ) }
				</Button>
			</Stack>
		</>
	);
}

ImportError.propTypes = {
	statusText: PropTypes.string.isRequired,
};

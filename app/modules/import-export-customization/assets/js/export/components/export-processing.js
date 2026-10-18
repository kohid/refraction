import PropTypes from 'prop-types';
import { Typography, CircularProgress } from '@elementor/ui';

export default function ExportProcessing( { statusText } ) {
	return (
		<>
			<CircularProgress size={ 20 } />
			<Typography variant="h5" color={ 'text.primary' } component="h2">
				{ statusText }
			</Typography>
			<Typography variant="body1" color="text.secondary">
				{ __( 'This usually takes a few moments.', 'refraction' ) }
				<br />
				{ __( 'Don\'t close this window until the process is finished.', 'refraction' ) }
			</Typography>
		</>
	);
}

ExportProcessing.propTypes = {
	statusText: PropTypes.string.isRequired,
};

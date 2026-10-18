import { useContext } from 'react';

import { ImportContext } from '../../../../../context/import-context/import-context-provider';

import ActionsFooter from '../../../../../shared/actions-footer/actions-footer';
import Button from 'refraction-app/ui/molecules/button';

import useImportActions from '../../../hooks/use-import-actions';

export default function ImportPluginsFooter( props ) {
	const importContext = useContext( ImportContext ),
		{ navigateToMainScreen } = useImportActions();

	return (
		<ActionsFooter>
			<Button
				text={ __( 'Previous', 'refraction' ) }
				variant="contained"
				onClick={ () => {
					importContext.dispatch( { type: 'SET_FILE', payload: null } );

					props.onPreviousClick?.();
					navigateToMainScreen();
				} }
			/>

			<Button
				variant="contained"
				text={ __( 'Next', 'refraction' ) }
				color="primary"
				url="/import/content"
				onClick={ () => {
					props.onNextClick?.();
				} }
			/>
		</ActionsFooter>
	);
}

ImportPluginsFooter.propTypes = {
	onPreviousClick: PropTypes.func,
	onNextClick: PropTypes.func,
};

import { useContext, useState } from 'react';

import { ExportContext } from '../../../../../../../context/export-context/export-context-provider';

import TextField from 'refraction-app/ui/atoms/text-field';
import Grid from 'refraction-app/ui/grid/grid';
import Text from 'refraction-app/ui/atoms/text';

export default function KitName() {
	const exportContext = useContext( ExportContext );
	const [ error, setError ] = useState( null );

	const validateKitName = ( value ) => {
		if ( ! value || 0 === value.trim().length ) {
			return __( 'Must add a name', 'refraction' );
		}

		return null;
	};

	const handleChange = ( event ) => {
		const value = event.target.value;
		exportContext.dispatch( { type: 'SET_KIT_TITLE', payload: value } );
		validateAndShowError( value );
	};

	const validateAndShowError = ( value ) => {
		const validationError = validateKitName( value );
		setError( validationError );
		return validationError;
	};

	return (
		<Grid container direction="column">
			<Text tag="span" variant="xs">{ __( 'Name', 'refraction' ) }</Text>
			<TextField
				placeholder={ __( 'Type name here...', 'refraction' ) }
				onChange={ handleChange }
				onBlur={ handleChange }
				className={ error ? 'e-app-export-kit-information__field--error' : '' }
				title={ error || '' }
				value={ exportContext.data.kitInfo?.title || '' }
				// eslint-disable-next-line jsx-a11y/no-autofocus
				autoFocus
			/>
			<div className="e-app-export-kit-information__error-container">
				{ error && (
					<Text variant="xs" className="e-app-export-kit-information__validation-error">
						{ error }
					</Text>
				) }
			</div>
		</Grid>
	);
}

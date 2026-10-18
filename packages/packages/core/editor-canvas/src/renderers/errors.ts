import { type StyleDefinitionState } from '@refraction/editor-styles';
import { createError } from '@refraction/utils';

export const UnknownStyleTypeError = createError< { type: string } >( {
	code: 'unknown_style_type',
	message: 'Unknown style type',
} );

export const UnknownStyleStateError = createError< { state: StyleDefinitionState } >( {
	code: 'unknown_style_state',
	message: 'Unknown style state',
} );

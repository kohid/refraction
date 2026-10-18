import * as React from 'react';
import { type ControlActionsItems, ControlActionsProvider, type PropProviderProps } from '@refraction/editor-controls';
import { type PropKey, type PropType, type PropValue } from '@refraction/editor-props';
import { getStylesSchema } from '@refraction/editor-styles';

import { renderWithTheme } from './render-with-theme';

type RenderControlProps = Partial< PropProviderProps< PropValue, PropType > > & {
	bind?: PropKey;
	controlActions?: ControlActionsItems;
	propTypes: Record< string, PropType >;
};

jest.mock( '@refraction/editor-styles', () => ( {
	...jest.requireActual( '@refraction/editor-styles' ),
	getStylesSchema: jest.fn(),
} ) );

export const renderField = ( ui: React.ReactElement, props: RenderControlProps ) => {
	const { propTypes = {}, controlActions = [] } = props;

	jest.mocked( getStylesSchema ).mockReturnValue( propTypes );

	return renderWithTheme( <ControlActionsProvider items={ controlActions }>{ ui }</ControlActionsProvider> );
};

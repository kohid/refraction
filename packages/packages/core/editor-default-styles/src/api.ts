import { type StyleDefinition, type StyleDefinitionID } from '@refraction/editor-styles';
import { type HttpResponse, httpService } from '@refraction/http-client';

import { type AllowedHtmlTag } from './allowed-tags';

const RESOURCE_URL = '/default-styles';
const BASE_URL = 'refraction/v1';

export type DefaultStylesMap = Record< StyleDefinitionID, StyleDefinition >;

type DefaultStylesHttpResponse = HttpResponse< DefaultStylesMap >;

export const apiClient = {
	all: () => httpService().get< DefaultStylesHttpResponse >( `${ BASE_URL }${ RESOURCE_URL }` ),

	put: ( tag: AllowedHtmlTag, variants: StyleDefinition[ 'variants' ] ) =>
		httpService().put( `${ BASE_URL }${ RESOURCE_URL }/${ tag }`, {
			type: 'class',
			variants,
		} ),

	delete: ( tag: AllowedHtmlTag ) => httpService().delete( `${ BASE_URL }${ RESOURCE_URL }/${ tag }` ),
};

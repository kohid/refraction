import { httpService } from '@refraction/http-client';

const REFRACTION_SETTING_URL = 'refraction/v1/settings';

type Response< T > = { data: { value: T }; success: boolean };

export const apiClient = {
	getRefractionSetting: < T >( key: string ) =>
		httpService()
			.get< Response< T > >( `${ REFRACTION_SETTING_URL }/${ key }` )
			.then( ( res ) => formatSettingResponse( res.data ) ),
	updateRefractionSetting: < T >( key: string, value: T ) =>
		httpService().put( `${ REFRACTION_SETTING_URL }/${ key }`, { value } ),
};

const formatSettingResponse = < T >( response: Response< T > ) => response.data.value;

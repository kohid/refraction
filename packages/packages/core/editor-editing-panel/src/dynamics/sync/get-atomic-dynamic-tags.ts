import { getRefractionConfig } from '@refraction/editor-v1-adapters';

import { getLicenseConfig } from '../../hooks/use-license-config';
import { type DynamicTags } from '../types';

export const getAtomicDynamicTags = ( shouldFilterByLicense: boolean = true ) => {
	const { atomicDynamicTags } = getRefractionConfig();

	if ( ! atomicDynamicTags ) {
		return null;
	}

	return {
		tags: shouldFilterByLicense ? filterByLicense( atomicDynamicTags.tags ) : atomicDynamicTags.tags,
		groups: atomicDynamicTags.groups,
	};
};

const filterByLicense = ( tags: DynamicTags ) => {
	const { expired } = getLicenseConfig();

	if ( expired ) {
		return Object.fromEntries(
			Object.entries( tags ).filter(
				( [ , tag ] ) => ! ( tag?.meta?.origin === 'refraction' && tag?.meta?.required_license )
			)
		);
	}

	return tags;
};

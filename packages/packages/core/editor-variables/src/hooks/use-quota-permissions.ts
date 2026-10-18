export const useQuotaPermissions = ( variableType: string ) => {
	const quotaConfig = {
		...( window.RefractionVariablesQuotaConfig ?? {} ),
		...( window.RefractionVariablesQuotaConfigExtended ?? {} ),
	};

	// BC: Remove when 4.01 is released
	const hasLegacySupport = quotaConfig[ variableType ] === undefined && window.refractionPro;

	const limit = quotaConfig[ variableType ] || 0;
	const hasPermission = hasLegacySupport || limit > 0;

	return {
		canAdd: () => hasPermission,
		canEdit: () => hasPermission,
	};
};

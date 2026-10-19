import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTabFocus } from './use-tab-focus';

const DEFAULT_CLASSES_LIMIT = 100;
const DEFAULT_VARIABLES_LIMIT = 100;

function getLimitsFromConfig() {
	const config = window.refractionAppConfig?.[ 'import-export-customization' ];

	return {
		classes: config?.limits?.classes ?? DEFAULT_CLASSES_LIMIT,
		variables: config?.limits?.variables ?? DEFAULT_VARIABLES_LIMIT,
	};
}

export function useClassesVariablesLimits( { open, isImport } ) {
	const [ existingClassesCount, setExistingClassesCount ] = useState( 0 );
	const [ existingVariablesCount, setExistingVariablesCount ] = useState( 0 );
	const [ isLoading, setIsLoading ] = useState( false );
	const [ error, setError ] = useState( null );

	const limits = useMemo( () => getLimitsFromConfig(), [] );

	// Global classes and variables belonged to the removed Atomic editor and their REST routes no longer exist,
	// so there is nothing to count: the existing counts stay at zero and no request is made.
	const fetchCounts = useCallback( async () => {
		if ( ! open || ! isImport ) {
			return;
		}

		setError( null );
		setIsLoading( false );
		setExistingClassesCount( 0 );
		setExistingVariablesCount( 0 );
	}, [ open, isImport ] );

	useEffect( () => {
		fetchCounts();
	}, [ fetchCounts ] );

	useTabFocus( fetchCounts );

	const calculateLimitInfo = useCallback( ( existingCount, importedCount, limit ) => {
		const totalAfterImport = existingCount + importedCount;
		const isExceeded = totalAfterImport > limit;
		const overLimitCount = isExceeded ? totalAfterImport - limit : 0;

		return {
			isExceeded,
			overLimitCount,
			totalAfterImport,
		};
	}, [] );

	return {
		existingClassesCount,
		existingVariablesCount,
		classesLimit: limits.classes,
		variablesLimit: limits.variables,
		isLoading,
		error,
		calculateLimitInfo,
		refetch: fetchCounts,
	};
}

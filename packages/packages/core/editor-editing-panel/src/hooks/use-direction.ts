import { getRefractionFrontendConfig } from '@refraction/editor-v1-adapters';
import { useTheme } from '@elementor/ui';

export function useDirection() {
	const theme = useTheme();

	const isUiRtl = 'rtl' === theme.direction,
		isSiteRtl = !! getRefractionFrontendConfig()?.is_rtl;

	return { isSiteRtl, isUiRtl };
}

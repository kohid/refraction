import { isProActive, isProAtLeast } from '@refraction/utils';

const MIN_PRO_VERSION_FOR_SELF_HANDLED_STYLES = '4.1';

export const isHandlingTemplateStyles = () =>
	isProActive() && ! isProAtLeast( MIN_PRO_VERSION_FOR_SELF_HANDLED_STYLES );

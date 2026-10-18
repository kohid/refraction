import { type InteractionsConfig } from '../types';

export function getInteractionsConfig(): InteractionsConfig {
	return window.RefractionInteractionsConfig ?? ( {} as InteractionsConfig );
}

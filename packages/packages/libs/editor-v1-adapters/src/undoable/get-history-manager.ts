import { createError } from '@refraction/utils';

export type HistoryItem = {
	title: string;
	subTitle: string;
	type: string;
	restore: ( item: HistoryItem, isRedo: boolean ) => void;
};

type AddHistoryItem = ( item: HistoryItem ) => void;

export type WindowWithHistoryManager = Window & {
	refraction?: {
		documents?: {
			getCurrent?: () => {
				history?: {
					addItem: AddHistoryItem;
				};
			};
		};
	};
};

const HistoryManagerNotAvailable = createError( {
	code: 'history_manager_not_available',
	message: 'Cannot access History manager.',
} );

export function getHistoryManager() {
	const extendedWindow = window as unknown as WindowWithHistoryManager;

	const historyManger = extendedWindow.refraction?.documents?.getCurrent?.()?.history;

	if ( ! historyManger ) {
		throw new HistoryManagerNotAvailable();
	}

	return historyManger;
}

import type { HistoryItem, WindowWithHistoryManager } from '@refraction/editor-v1-adapters';

export function mockHistoryManager() {
	const history = createFakeHistory();

	return {
		instance: history,

		beforeEach: () => {
			const extendedWindow = window as unknown as Window & WindowWithHistoryManager;

			extendedWindow.refraction = {
				...extendedWindow.refraction,
				documents: {
					...extendedWindow.refraction?.documents,
					getCurrent: () => ( { history } ),
				},
			};
		},

		afterEach: () => {
			history.clear();
		},
	};
}

function createFakeHistory() {
	let item: HistoryItem | null = null;

	return {
		undo: () => {
			item?.restore( item, false );
		},
		redo: () => {
			item?.restore( item, true );
		},
		clear: () => {
			item = null;
		},
		get: () => {
			return item;
		},
		addItem: ( i: HistoryItem ) => {
			item = i;
		},
	};
}

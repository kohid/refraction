export type ToolParams = {
	[ key: string ]: unknown;
	action: string;
};

export type McpToolResult = {
	content: Array< {
		type: 'text';
		text: string;
	} >;
};

export interface RefractionContainer {
	id: string;
	label?: string;
	type?: string;
	model: {
		id: string;
		attributes?: Record< string, unknown >;
		editor_settings?: { title?: string };
		get?: ( key: string ) => unknown;
		widgetType?: string;
	};
	settings: {
		attributes?: Record< string, unknown >;
		controls?: Record< string, unknown >;
		get: ( key: string ) => unknown;
	};
	children?: RefractionContainer[];
	view?: {
		el: HTMLElement;
	};
	parent?: RefractionContainer;
}

export interface RefractionControls {
	[ key: string ]: {
		type: string;
		default?: unknown;
		options?: Record< string, string >;
		fields?: RefractionControls;
	};
}

export type RefractionControlsMapped = {
	[ key: string ]: {
		default: unknown;
		options?: string[];
		onValue?: string;
		size_units?: string[];
		range?: { min: number; max: number };
		type: string;
		fields?: RefractionControlsMapped;
	};
};

export interface RefractionDocument {
	id: string;
	container: RefractionContainer & { children: RefractionContainer[] };
	config: {
		type: string;
		settings: Record< string, unknown > & {
			controls?: RefractionControls;
			settings?: Record< string, unknown >;
		};
	};
}

export interface RefractionInstance {
	documents: {
		getCurrent: () => RefractionDocument | null;
		get: ( id: string ) => {
			config?: {
				settings: {
					controls: RefractionControls;
					settings: Record< string, unknown >;
				};
			};
		} | null;
	};
	getContainer: ( id: string ) => RefractionContainer | null;
	getCurrentElement: () => { model: { id: string } } | null;
	selection: {
		elements: Record< string, unknown >;
	};
	widgetsCache: Record< string, { controls: RefractionControls } >;
	config: {
		controls: Record< string, unknown >;
	};
	dynamicTags?: {
		getConfig: ( key: string ) => Record< string, { categories: string[] } >;
		tagDataToTagText: ( id: string, name: string, settings: Record< string, unknown > ) => string;
	};
}

export interface RefractionCommandsInstance {
	run: ( command: string, args?: Record< string, unknown > ) => Promise< unknown >;
	data: {
		get: ( key: string ) => Promise< { data: Record< string, { value: unknown } > } >;
	};
	routes: {
		getAll: () => string[];
		getComponent: ( route: string ) => { getNamespace: () => string };
		saveState: ( namespace: string ) => void;
		to: ( route: string, args: Record< string, unknown > ) => void;
		back: ( namespace: string ) => void;
	};
	components: {
		getAll: () => string[];
		get: ( name: string ) => {
			getCommands: () => {
				open?: { registerConfig: { command: string } };
				close?: { registerConfig: { command: string } };
			};
		};
	};
}

export interface RefractionCommonInstance {
	helpers?: {
		getUniqueId?: () => number | string;
	};
}

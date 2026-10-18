import { __privateSetReady } from '@refraction/editor-v1-adapters';

export function dispatchCommandBefore( command: string, args: Record< string, unknown > = {} ) {
	window.dispatchEvent(
		new CustomEvent( 'refraction/commands/run/before', {
			detail: {
				command,
				args,
			},
		} )
	);
}

export function dispatchCommandAfter( command: string, args: Record< string, unknown > = {} ) {
	window.dispatchEvent(
		new CustomEvent( 'refraction/commands/run/after', {
			detail: {
				command,
				args,
			},
		} )
	);
}

export function dispatchDependencyCommand( command: string, args: Record< string, unknown > = {} ) {
	window.dispatchEvent(
		new CustomEvent( 'refraction/commands/dependency', {
			detail: {
				command,
				args,
			},
		} )
	);
}

export function dispatchRouteOpen( route: string ) {
	window.dispatchEvent(
		new CustomEvent( 'refraction/routes/open', {
			detail: {
				route,
			},
		} )
	);
}

export function dispatchRouteClose( route: string ) {
	window.dispatchEvent(
		new CustomEvent( 'refraction/routes/close', {
			detail: {
				route,
			},
		} )
	);
}

export function dispatchEditModeChange() {
	window.dispatchEvent( new CustomEvent( 'refraction/edit-mode/change' ) );
}

export function dispatchV1ReadyEvent() {
	__privateSetReady( true );
	dispatchWindowEvent( 'refraction/initialized' );
}

export function dispatchElementEvent( event: string, elementId: string ) {
	window.dispatchEvent(
		new CustomEvent( event, {
			detail: {
				elementId,
			},
		} )
	);
}

export function dispatchWindowEvent( event: string ) {
	window.dispatchEvent( new CustomEvent( event ) );
}

export function mockDataHooksRegistry() {
	let hooks: MockDataHookClass[] = [];

	class MockDataHookClass {
		register() {
			hooks.push( this as never );
		}
	}

	type WindowWithDataHooks = Window & {
		$e: {
			modules?: {
				hookData?: {
					[ key: string ]: new () => MockDataHookClass;
				};
			};
		};
	};

	const eWindow = window as unknown as WindowWithDataHooks;

	const registry = {
		getAll: () => hooks,

		reset: () => {
			hooks = [];
		},

		createClass: () => {
			return MockDataHookClass;
		},
	};

	eWindow.$e = {
		modules: {
			hookData: {
				Dependency: registry.createClass(),
				After: registry.createClass(),
				Before: registry.createClass(),
			},
		},
	};
}

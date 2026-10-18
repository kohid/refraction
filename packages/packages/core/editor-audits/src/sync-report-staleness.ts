import { __privateListenTo as listenTo, commandEndEvent, type CommandEvent } from '@refraction/editor-v1-adapters';
import { __dispatch as dispatch } from '@refraction/store';

import { slice } from './store/slice';

export function syncReportStaleness() {
	listenTo( commandEndEvent( 'document/save/set-is-modified' ), ( e ) => {
		const event = e as CommandEvent< { status: boolean } >;

		if ( event.args?.status ) {
			dispatch( slice.actions.reportStale() );
		}
	} );
}

import * as React from 'react';
import { injectIntoTop } from '@refraction/editor';
import { __privateListenTo as listenTo, v1ReadyEvent } from '@refraction/editor-v1-adapters';

import { NoticePortal } from './components/notice-portal';
import { createNoticeView } from './utils/create-notice-view';

export function register( Component: React.ComponentType ) {
	injectIntoTop( {
		id: 'editor-elements-panel-notice',
		component: () => <NoticePortal component={ Component } />,
	} );

	listenTo( v1ReadyEvent(), () => {
		window.refraction?.hooks?.addFilter(
			'panel/elements/regionViews',
			( regionViews, { notice }: Record< string, unknown > ) => {
				regionViews.notice = {
					region: notice,
					view: createNoticeView(),
				};

				return regionViews;
			}
		);
	} );
}

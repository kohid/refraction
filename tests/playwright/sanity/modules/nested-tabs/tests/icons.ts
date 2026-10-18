import { expect } from '@playwright/test';
import EditorPage from '../../../../pages/editor-page';

export async function testIconCount( editor: EditorPage ) {
	// Act.
	const iconCountForTabs = await editor.getPreviewFrame().locator( '.e-n-tabs-content .e-con.e-active .refraction-add-new-section i' ).count(),
		iconCountForMainContainer = await editor.getPreviewFrame().locator( '#refraction-add-new-section .refraction-add-new-section i' ).count();

	// Assert.
	// Check if the tabs has 1 icon in the Add Section element and the main container 2 icons.
	expect.soft( iconCountForTabs ).toBe( 1 );
	expect.soft( iconCountForMainContainer ).toEqual( 3 );
}

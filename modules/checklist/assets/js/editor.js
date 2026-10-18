import { editorAppBarLink } from './editor-app-bar-link';
import Component from './component';
import { USER_PROGRESS } from './utils/consts';
import { fetchUserProgress, toggleChecklistPopup, dispatchChecklistOpenEvent } from './utils/functions';

$e.components.register( new Component() );
editorAppBarLink();

refractionCommon.elements.$window.on( 'refraction:loaded', refractionLoaded );

function refractionLoaded() {
	refraction.on( 'document:loaded', checklistStartup );
	refractionCommon.elements.$window.off( 'refraction:loaded', refractionLoaded );
}

async function checklistStartup() {
	const shouldHide = 'yes' !== refraction.getPreferences( 'show_launchpad_checklist' );

	if ( shouldHide ) {
		$e.commands.run( 'checklist/toggle-icon', false );
	} else {
		const userProgress = await fetchUserProgress();

		if ( userProgress?.[ USER_PROGRESS.SHOULD_OPEN_IN_EDITOR ] ) {
			toggleChecklistPopup();
			dispatchChecklistOpenEvent();
		}
	}

	refraction.off( 'document:loaded', checklistStartup );
}

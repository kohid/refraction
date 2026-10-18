import BaseAddSectionView from './base';
import { EditorOneEventManager } from 'refraction-editor-utils/editor-one-events';

export default class AddSectionView extends BaseAddSectionView {
	get id() {
		return 'refraction-add-new-section';
	}

	onCloseButtonClick() {
		EditorOneEventManager.sendCanvasEmptyBoxAction( {
			targetName: 'close',
			containerCreated: false,
		} );
		this.closeSelectPresets();
	}
}

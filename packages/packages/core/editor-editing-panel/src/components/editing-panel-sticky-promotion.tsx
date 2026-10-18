import * as React from 'react';

function getStickyPromotion() {
	return window.refraction?.config?.editingPanelStickyPromotion;
}

export const EditingPanelStickyPromotion = () => {
	const promotion = getStickyPromotion();

	if ( ! promotion ) {
		return null;
	}

	return (
		<div className="refraction-panel-editor-sticky-promotion">
			<div className="refraction-get-pro-sticky-message">
				{ promotion.message }{ ' ' }
				<a target="_blank" rel="noreferrer" href={ promotion.url }>
					{ promotion.button_text }
				</a>
			</div>
		</div>
	);
};

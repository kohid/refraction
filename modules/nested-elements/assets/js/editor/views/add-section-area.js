/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useEffect, useRef } from 'react';

export default function AddSectionArea( props ) {
	const addAreaElementRef = useRef(),
		containerHelper = refraction.helpers.container;

	useEffect( () => {
		const $addAreaElementRef = jQuery( addAreaElementRef.current ),
			defaultDroppableOptions = props.container.view.getDroppableOptions();

		defaultDroppableOptions.placeholder = false;
		defaultDroppableOptions.items = '> .refraction-add-section-inner';
		defaultDroppableOptions.hasDraggingOnChildClass = 'refraction-dragging-on-child';

		$addAreaElementRef.html5Droppable( defaultDroppableOptions );

		return () => {
			$addAreaElementRef.html5Droppable( 'destroy' );
		};
	}, [] );

	const handleAddContainerClick = () => {
		props.setIsRenderPresets( true );
	};

	return (
		<div
			className="refraction-add-section"
			onClick={ () => containerHelper.openEditMode( props.container ) }
			ref={ addAreaElementRef }
			role="button"
			tabIndex="0"
		>
			<div className="refraction-add-section-inner">
				<div className="e-view refraction-add-new-section">
					<button
						type="button"
						className="refraction-add-section-area-button refraction-add-section-button"
						aria-label={ __( 'Add new container', 'refraction' ) }
						onClick={ handleAddContainerClick }
					>
						<i className="rficon-plus" aria-hidden="true" />
					</button>
					<div className="refraction-add-section-drag-title">
						{ __( 'Drag widget here', 'refraction' ) }
					</div>
				</div>
			</div>
		</div>
	);
}

AddSectionArea.propTypes = {
	container: PropTypes.object.isRequired,
	setIsRenderPresets: PropTypes.func.isRequired,
};

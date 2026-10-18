<?php
namespace Refraction\Testing;

use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Document_Types extends Refraction_Test_Base {

	/**
	 * @todo section should have "custom_css_pro"
	 */
	public function test_getInstance() {
		$document_types = $this->refraction()->documents->get_document_types();
		$missing_custom_css = [];
		$exclude = [ 'container', 'section', 'not-supported', 'test-document', 'cloud-template-preview', 'e-div-block', 'e-flexbox', 'e-grid', 'e-form', 'refraction_component' ];
		foreach ( $document_types as $type => $class_name ) {
			$document = $this->refraction()->documents->create( $type );
			// TODO                                           remove this ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ when section will have "custom_css_pro"
			if ( ! isset( $document->get_controls()['custom_css_pro'] ) && ! in_array( $type, $exclude ) ) {
				array_push( $missing_custom_css, $type );
			}
		}
		$missing_custom_css = implode( ' | ', $missing_custom_css );
		$this->assertEmpty( $missing_custom_css, "in the documents [ $missing_custom_css ] custom_css_pro is missing" );
	}
}

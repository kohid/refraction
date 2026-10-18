<?php
namespace Refraction;

use Refraction\Core\Base\Document;
use Refraction\TemplateLibrary\Forms\New_Template_Form;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
$new_template_control_form = new New_Template_Form( [ 'id' => 'form' ] );
$document_types = Plugin::$instance->documents->get_document_types();

$types = [];
$lock_configs = [];

$selected = get_query_var( 'refraction_library_type' );

foreach ( $document_types as $document_type ) {
	if ( $document_type::get_property( 'show_in_library' ) ) {
		/**
		 * @var Document $instance
		 */
		$instance = new $document_type();
		$lock_behavior = $document_type::get_lock_behavior_v2();

		$types[ $instance->get_name() ] = $document_type::get_title();
		$lock_configs[ $instance->get_name() ] = empty( $lock_behavior )
			? (object) []
			: $lock_behavior->get_config();
	}
}

/**
 * Create new template library dialog types.
 *
 * Filters the dialog types when printing new template dialog.
 *
 * @since 2.0.0
 *
 * @param array    $types          Types data.
 * @param Document $document_types Document types.
 */
$types = apply_filters( 'refraction/template-library/create_new_dialog_types', $types, $document_types );
ksort( $types );

?>
<script type="text/template" id="tmpl-refraction-new-template">
	<div id="refraction-new-template__description">
		<div id="refraction-new-template__description__title"><?php
			printf(
				/* translators: %1$s Span open tag, %2$s: Span close tag. */
				esc_html__( 'Templates Help You %1$sWork Efficiently%2$s', 'refraction' ),
				'<span>',
				'</span>'
			);
			?></div>
		<div id="refraction-new-template__description__content"><?php echo esc_html__( 'Use templates to create the different pieces of your site, and reuse them with one click whenever needed.', 'refraction' ); ?></div>
	</div>
	<form id="refraction-new-template__form" action="<?php esc_url( admin_url( '/edit.php' ) ); ?>">
		<input type="hidden" name="post_type" value="refraction_library">
		<input type="hidden" name="action" value="refraction_new_post">
		<?php // PHPCS - a nonce doesn't have to be escaped. ?>
		<input type="hidden" name="_wpnonce" value="<?php echo wp_create_nonce( 'refraction_action_new_post' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>">
		<div id="refraction-new-template__form__title"><?php echo esc_html__( 'Choose Template Type', 'refraction' ); ?></div>
		<div id="refraction-new-template__form__template-type__wrapper" class="refraction-form-field">
			<label for="refraction-new-template__form__template-type" class="refraction-form-field__label"><?php echo esc_html__( 'Select the type of template you want to work on', 'refraction' ); ?></label>
			<div class="refraction-form-field__select__wrapper">
				<?php // Badge will be filled from js. ?>
				<span id="refraction-new-template__form__template-type-badge" class="e-hidden">
					<i id="refraction-new-template__form__template-type-badge__icon"></i>
					<span id="refraction-new-template__form__template-type-badge__text"></span>
				</span>

				<select id="refraction-new-template__form__template-type" class="refraction-form-field__select" name="template_type" required>
					<option value=""><?php echo esc_html__( 'Select', 'refraction' ); ?>...</option>
					<?php
					foreach ( $types as $value => $type_title ) {
						printf(
							'<option value="%1$s" data-lock=\'%2$s\' %3$s>%4$s</option>',
							esc_attr( $value ),
							wp_json_encode( $lock_configs[ $value ] ?? (object) [] ),
							selected( $selected, $value, false ),
							esc_html( $type_title )
						);
					}
					?>
				</select>
			</div>
		</div>
		<?php
		/**
		 * Template library dialog fields.
		 *
		 * Fires after Refraction template library dialog fields are displayed.
		 *
		 * @since 2.0.0
		 */
		do_action( 'refraction/template-library/create_new_dialog_fields', $new_template_control_form );

		$additional_controls = $new_template_control_form->get_controls();
		if ( $additional_controls ) {
			wp_add_inline_script( 'refraction-admin', 'const refraction_new_template_form_controls = ' . wp_json_encode( $additional_controls ) . ';' );
			$new_template_control_form->render();
		}
		?>

		<div id="refraction-new-template__form__post-title__wrapper" class="refraction-form-field">
			<label for="refraction-new-template__form__post-title" class="refraction-form-field__label">
				<?php echo esc_html__( 'Name your template', 'refraction' ); ?>
			</label>
			<div class="refraction-form-field__text__wrapper">
				<input type="text" placeholder="<?php echo esc_attr__( 'Enter template name (optional)', 'refraction' ); ?>" id="refraction-new-template__form__post-title" class="refraction-form-field__text" name="post_data[post_title]">
			</div>
		</div>
		<button id="refraction-new-template__form__submit" class="refraction-button e-primary"><?php echo esc_html__( 'Create Template', 'refraction' ); ?></button>
		<a id="refraction-new-template__form__lock_button" class="refraction-button e-accent e-hidden" target="_blank"><?php // Will be filled from js. ?></a>
	</form>
</script>

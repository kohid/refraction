<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Controls_Manager;
use Refraction\Icons_Manager;
use Refraction\Plugin;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Text that changes with the answers (0.125.0). On a Form page a Heading, Text Editor, Button, Alert, Icon Box, Image
 * Box, Icon List, Image or Icon can show other words (or another picture or icon) depending on a field's answer: "when
 * vehicle_option is Minibus Tours, the heading reads Max 8 Seats/£65 per hour". The first row that matches wins; no
 * match keeps the widget's own content.
 *
 * The rows ride with the widget's content as a <template data-rfb-swap> (in the editor's preview too, where "Show in
 * the editor" picks a row), and the form's script (applyConditions) swaps the parts as the visitor answers.
 */
class Answer_Text {

	const ROWS = 'rfb_swap_rows';
	const PREVIEW = 'rfb_swap_preview';

	/**
	 * Widget => [ its first Content section, the parts that can change: name => [ label, control type, selector ] ].
	 * A selector is read inside the widget; '' is the widget's own content box.
	 */
	public static function widgets(): array {
		$text = esc_html__( 'Text', 'refraction' );
		$title = esc_html__( 'Title', 'refraction' );
		$description = esc_html__( 'Description', 'refraction' );

		return [
			'heading' => [ 'section_title', [ 'text' => [ $title, Controls_Manager::TEXTAREA, '.refraction-heading-title' ] ] ],
			'text-editor' => [ 'section_editor', [ 'text' => [ $text, Controls_Manager::WYSIWYG, '.refraction-text-editor' ] ] ],
			'button' => [ 'section_button', [ 'text' => [ $text, Controls_Manager::TEXT, '.refraction-button-text' ] ] ],
			'alert' => [ 'section_alert', [ 'text' => [ $title, Controls_Manager::TEXT, '.refraction-alert-title' ], 'text2' => [ $description, Controls_Manager::TEXTAREA, '.refraction-alert-description' ] ] ],
			'icon-box' => [ 'section_icon', [ 'text' => [ $title, Controls_Manager::TEXT, '.refraction-icon-box-title' ], 'text2' => [ $description, Controls_Manager::TEXTAREA, '.refraction-icon-box-description' ] ] ],
			'image-box' => [ 'section_image', [ 'text' => [ $title, Controls_Manager::TEXT, '.refraction-image-box-title' ], 'text2' => [ $description, Controls_Manager::TEXTAREA, '.refraction-image-box-description' ] ] ],
			'icon-list' => [ 'section_icon', [ 'item' => [ esc_html__( 'Item number', 'refraction' ), Controls_Manager::NUMBER, '' ], 'text' => [ $text, Controls_Manager::TEXT, '.refraction-icon-list-text' ] ] ],
			'image' => [ 'section_image', [ 'image' => [ esc_html__( 'Picture', 'refraction' ), Controls_Manager::MEDIA, 'img' ] ] ],
			'icon' => [ 'section_icon', [ 'icon' => [ esc_html__( 'Icon', 'refraction' ), Controls_Manager::ICONS, '.refraction-icon' ] ] ],
		];
	}

	public static function boot(): void {
		add_action( 'refraction/element/after_section_end', [ self::class, 'register' ], 20, 2 );
		add_filter( 'refraction/widget/render_content', [ self::class, 'carry' ], 20, 2 );
	}

	/** Content > Changes with the answers, right after the widget's first Content section. */
	public static function register( $element, $section_id ): void {
		$spec = self::widgets()[ $element->get_name() ] ?? null;

		if ( ! $spec || $spec[0] !== $section_id || $element->get_controls( self::ROWS ) ) {
			return;
		}

		$row = new Repeater();
		$row->add_control( 'field', [
			'label' => esc_html__( 'When field', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'Choose a field', 'refraction' ) ],
			'label_block' => true,
			'description' => esc_html__( 'A field of this form (the list follows the fields on the page).', 'refraction' ),
		] );
		$row->add_control( 'op', [ 'label' => esc_html__( 'Answer', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators() ] );
		$row->add_control( 'value', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'Minibus Tours', 'refraction' ), 'description' => esc_html__( 'The answer, or a choice\'s value or name.', 'refraction' ), 'condition' => [ 'op!' => [ 'empty', 'not_empty' ] ] ] );

		foreach ( $spec[1] as $name => [ $label, $type ] ) {
			$args = [ 'label' => esc_html__( 'Then show', 'refraction' ) . ': ' . $label, 'type' => $type, 'label_block' => Controls_Manager::NUMBER !== $type, 'separator' => 'text' === $name || 'image' === $name || 'icon' === $name ? 'before' : 'default' ];

			if ( Controls_Manager::NUMBER === $type ) {
				$args += [ 'min' => 1, 'default' => 1, 'label' => $label ];
			} elseif ( Controls_Manager::ICONS === $type ) {
				$args += [ 'skin' => 'inline', 'label_block' => false ];
			} elseif ( Controls_Manager::TEXTAREA === $type ) {
				$args += [ 'rows' => 3 ];
			}

			if ( in_array( $type, [ Controls_Manager::TEXT, Controls_Manager::TEXTAREA, Controls_Manager::WYSIWYG, Controls_Manager::MEDIA ], true ) ) {
				$args['dynamic'] = [ 'active' => true ];
			}

			$row->add_control( $name, $args );
		}

		$element->start_controls_section( 'section_rfb_swap', [ 'label' => esc_html__( 'Changes with the answers', 'refraction' ), 'tab' => Controls_Manager::TAB_CONTENT ] );
		$element->add_control( self::ROWS, [
			'label' => esc_html__( 'Other content for other answers', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $row->get_controls(),
			'default' => [],
			'prevent_empty' => false,
			'title_field' => '{{{ field ? field + " " + op.replace( /_/g, " " ) + ( value ? " " + value : "" ) : "' . esc_js( __( 'Choose a field', 'refraction' ) ) . '" }}}',
			'description' => esc_html__( 'Form pages: the first row whose answer matches replaces this widget\'s content; no match keeps it as set above.', 'refraction' ),
		] );
		$element->add_control( self::PREVIEW, [
			'label' => esc_html__( 'Show in the editor', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'default' => 0,
			'description' => esc_html__( 'Editor only: 0 shows the content as set above, 1 the first row, 2 the second...', 'refraction' ),
		] );
		$element->end_controls_section();
	}

	/** The rows a widget carries for the form's script, or null when it has none. */
	public static function rules( $widget ): ?array {
		$spec = self::widgets()[ $widget->get_name() ] ?? null;
		$settings = $spec ? (array) $widget->get_settings_for_display() : [];
		$rows = [];

		foreach ( (array) ( $settings[ self::ROWS ] ?? [] ) as $row ) {
			$field = Schema::key( (string) ( $row['field'] ?? '' ) );

			if ( ! is_array( $row ) || '' === $field ) {
				continue;
			}

			$rule = [ 'field' => $field, 'op' => in_array( $row['op'] ?? '', Conditions::OPERATORS, true ) ? $row['op'] : 'equals', 'value' => (string) ( $row['value'] ?? '' ), 'set' => [] ];

			foreach ( $spec[1] as $name => [ , $type, $selector ] ) {
				$value = $row[ $name ] ?? null;

				if ( 'item' === $name ) {
					$rule['item'] = max( 1, (int) $value );
				} elseif ( Controls_Manager::MEDIA === $type ) {
					$id = is_array( $value ) ? (int) ( $value['id'] ?? 0 ) : 0;
					$url = $id ? (string) wp_get_attachment_image_url( $id, 'full' ) : ( is_array( $value ) ? esc_url_raw( (string) ( $value['url'] ?? '' ) ) : '' );

					if ( '' !== $url ) {
						$rule['set'][] = [ 'sel' => $selector, 'src' => $url, 'srcset' => $id ? (string) wp_get_attachment_image_srcset( $id, 'full' ) : '', 'alt' => $id ? (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) : '' ];
					}
				} elseif ( Controls_Manager::ICONS === $type ) {
					$html = is_array( $value ) && ! empty( $value['value'] ) ? (string) Icons_Manager::try_get_icon_html( $value, [ 'aria-hidden' => 'true' ] ) : '';

					if ( '' !== $html ) {
						$rule['set'][] = [ 'sel' => $selector, 'html' => $html ];
					}
				} elseif ( '' !== trim( (string) $value ) ) {
					$rule['set'][] = [ 'sel' => $selector, 'html' => wp_kses_post( Controls_Manager::WYSIWYG === $type ? wpautop( (string) $value ) : nl2br( (string) $value ) ) ];
				}
			}

			if ( $rule['set'] ) {
				$rows[] = $rule;
			}
		}

		return $rows ? $rows : null;
	}

	/** Puts the rows after the widget's content (the editor's preview gets the row it should show). */
	public static function carry( $content, $widget ) {
		if ( ! isset( self::widgets()[ $widget->get_name() ] ) ) {
			return $content;
		}

		$rows = self::rules( $widget );

		if ( ! $rows ) {
			return $content;
		}

		$data = [ 'rows' => $rows ];

		if ( Plugin::$instance->editor->is_edit_mode() ) {
			$data['preview'] = max( 0, (int) $widget->get_settings( self::PREVIEW ) );
		}

		return $content . '<template data-rfb-swap="' . esc_attr( (string) wp_json_encode( $data ) ) . '"></template>';
	}
}

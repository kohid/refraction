<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Controls_Manager;
use Refraction\Icons_Manager;
use Refraction\Modules\FormBuilder\Controls;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Content that changes with the answers (0.125.0; AND / OR, Icon List items with icons, Price and Amount in 0.126.0).
 * On a Form page a Heading, Text Editor, Button, Alert, Icon Box, Image Box, Icon List, Image, Icon, Price or Amount
 * shows other content depending on the answers: "when vehicle_option is Minibus Tours (and passengers is greater than
 * 4), the heading reads Max 8 Seats/£65 per hour". The first row that matches wins; no match keeps the widget's own.
 * An Icon List's rows with Item number 0 build a new list (each row an item with its icon) from every row that matches.
 *
 * The rows ride with the widget's content as a <template data-rfb-swap> and the form's script (applyConditions) swaps
 * the parts as the visitor answers. In the editor "Show in the editor" previews a row (frontend.js previewSwaps()).
 */
class Answer_Text {

	const ROWS = 'rfb_swap_rows';
	const PREVIEW = 'rfb_swap_preview';

	/**
	 * Widget => [ its first Content section, the parts that can change: name => [ label, control type, selector ] ].
	 * A selector is read inside the widget (an Icon List item for item parts).
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
			'icon-list' => [ 'section_icon', [ 'mode' => [ esc_html__( 'Then show', 'refraction' ), Controls_Manager::SELECT, '' ], 'items' => [ esc_html__( 'Items', 'refraction' ), Controls\Control_List_Items::TYPE, '' ], 'item' => [ esc_html__( 'Item number', 'refraction' ), Controls_Manager::NUMBER, '' ], 'text' => [ $text, Controls_Manager::TEXT, '.refraction-icon-list-text' ], 'icon' => [ esc_html__( 'Icon', 'refraction' ), Controls_Manager::ICONS, '.refraction-icon-list-icon' ] ] ],
			'image' => [ 'section_image', [ 'image' => [ esc_html__( 'Picture', 'refraction' ), Controls_Manager::MEDIA, 'img' ] ] ],
			'icon' => [ 'section_icon', [ 'icon' => [ esc_html__( 'Icon', 'refraction' ), Controls_Manager::ICONS, '.refraction-icon' ] ] ],
			'rfb-price' => [ 'section_price', [ 'price' => [ esc_html__( 'Price', 'refraction' ), Controls_Manager::NUMBER, '.rfb-price-amount' ] ] ],
			'rfb-field-currency' => [ 'section_field', [ 'amount' => [ esc_html__( 'Amount in the box', 'refraction' ), Controls_Manager::NUMBER, 'input[data-rfb-amount]' ] ] ],
		];
	}

	public static function boot(): void {
		add_action( 'refraction/element/after_section_end', [ self::class, 'register' ], 20, 2 );
		add_filter( 'refraction/widget/render_content', [ self::class, 'carry' ], 20, 2 );
	}

	/**
	 * The condition of a row: a field's answer, and (AND / OR) another one. Shared with the Choice fields' own
	 * Changes with the answers (Base\Field_Widget).
	 */
	public static function condition_controls( Repeater $row ): void {
		$field = [
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'Choose a field', 'refraction' ) ],
			'label_block' => true,
		];
		$row->add_control( 'field', $field + [ 'label' => esc_html__( 'When field', 'refraction' ), 'description' => esc_html__( 'A field of this form (the list follows the fields on the page).', 'refraction' ) ] );
		$row->add_control( 'op', [ 'label' => esc_html__( 'Answer', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators() ] );
		$row->add_control( 'value', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'Minibus Tours', 'refraction' ), 'description' => esc_html__( 'The answer, or a choice\'s value or name.', 'refraction' ), 'condition' => [ 'op!' => [ 'empty', 'not_empty' ] ] ] );
		$row->add_control( 'logic', [
			'label' => esc_html__( 'And another field', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'No', 'refraction' ), 'and' => esc_html__( 'AND: both must match', 'refraction' ), 'or' => esc_html__( 'OR: either one is enough', 'refraction' ) ],
		] );
		$row->add_control( 'field2', $field + [ 'label' => esc_html__( 'Field', 'refraction' ), 'condition' => [ 'logic!' => '' ] ] );
		$row->add_control( 'op2', [ 'label' => esc_html__( 'Answer', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators(), 'condition' => [ 'logic!' => '' ] ] );
		$row->add_control( 'value2', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'logic!' => '', 'op2!' => [ 'empty', 'not_empty' ] ] ] );
	}

	/** The row title: its conditions in words ("vehicle_option equals Minibus Tours AND passengers greater 4"). */
	public static function title_field( string $empty ): string {
		return '{{{ field ? field + " " + op.replace( /_/g, " " ) + ( value ? " " + value : "" ) + ( logic && field2 ? " " + logic.toUpperCase() + " " + field2 + " " + op2.replace( /_/g, " " ) + ( value2 ? " " + value2 : "" ) : "" ) : "' . esc_js( $empty ) . '" }}}';
	}

	/** A row's condition, cleaned: [ match all | any, rules ], or null when it names no field. */
	public static function condition_of( array $row ): ?array {
		$rules = [];

		foreach ( [ '', '2' ] as $n ) {
			if ( '2' === $n && ! in_array( $row['logic'] ?? '', [ 'and', 'or' ], true ) ) {
				break;
			}

			$field = Schema::key( (string) ( $row[ 'field' . $n ] ?? '' ) );

			if ( '' !== $field ) {
				$op = (string) ( $row[ 'op' . $n ] ?? 'equals' );
				$rules[] = [ 'field' => $field, 'op' => in_array( $op, Conditions::OPERATORS, true ) ? $op : 'equals', 'value' => (string) ( $row[ 'value' . $n ] ?? '' ) ];
			}
		}

		return $rules ? [ 'match' => 'or' === ( $row['logic'] ?? '' ) ? 'any' : 'all', 'rules' => $rules ] : null;
	}

	/** Content > Changes with the answers, right after the widget's first Content section. */
	public static function register( $element, $section_id ): void {
		$spec = self::widgets()[ $element->get_name() ] ?? null;

		if ( ! $spec || $spec[0] !== $section_id || $element->get_controls( self::ROWS ) ) {
			return;
		}

		$row = new Repeater();
		self::condition_controls( $row );
		$list = 'icon-list' === $element->get_name();

		foreach ( $spec[1] as $name => [ $label, $type ] ) {
			$args = [ 'label' => esc_html__( 'Then show', 'refraction' ) . ': ' . $label, 'type' => $type, 'label_block' => ! in_array( $type, [ Controls_Manager::NUMBER, Controls_Manager::ICONS ], true ) ];
			// An Icon List row is a whole new list (its Items), or a change to one item of the list (0.127.0).
			$one = [ 'mode' => 'item' ];

			if ( 'mode' === $name ) {
				$args = [
					'label' => $label,
					'type' => $type,
					'default' => '',
					'separator' => 'before',
					'options' => [ '' => esc_html__( 'A new list', 'refraction' ), 'item' => esc_html__( 'A change to one item', 'refraction' ) ],
				];
			} elseif ( 'items' === $name ) {
				$args = [
					'label' => $label,
					'type' => $type,
					'description' => esc_html__( 'The list for these answers, in order, each item with its icon (empty: the list\'s own). **Words** in stars are bold.', 'refraction' ),
					'condition' => [ 'mode' => '' ],
				];
			} elseif ( 'item' === $name ) {
				$args = [
					'label' => esc_html__( 'Item to change', 'refraction' ),
					'type' => $type,
					'min' => 1,
					'default' => 1,
					'description' => esc_html__( '1 is the first item of the list.', 'refraction' ),
					'condition' => $one,
				];
			} elseif ( $list ) {
				$args['condition'] = $one;

				if ( Controls_Manager::ICONS === $type ) {
					$args += [ 'skin' => 'inline', 'description' => esc_html__( 'Empty: the item\'s own icon.', 'refraction' ) ];
				}
			} elseif ( Controls_Manager::NUMBER === $type ) {
				$args += [ 'step' => 0.01, 'separator' => 'before' ];
			} elseif ( Controls_Manager::ICONS === $type ) {
				$args += [ 'skin' => 'inline' ];
			} elseif ( Controls_Manager::TEXTAREA === $type ) {
				$args += [ 'rows' => 3 ];
			}

			if ( ! $list && 'text' === $name || 'image' === $name ) {
				$args['separator'] = 'before';
			}

			if ( in_array( $type, [ Controls_Manager::TEXT, Controls_Manager::TEXTAREA, Controls_Manager::WYSIWYG, Controls_Manager::MEDIA, Controls_Manager::NUMBER ], true ) && ! in_array( $name, [ 'item', 'mode', 'items' ], true ) ) {
				$args['dynamic'] = [ 'active' => true ];
			}

			$row->add_control( $name, $args );
		}

		$element->start_controls_section( 'section_rfb_swap', [ 'label' => esc_html__( 'Changes with the answers', 'refraction' ), 'tab' => Controls_Manager::TAB_CONTENT ] );
		$element->add_control( self::ROWS, [
			'label' => $list ? esc_html__( 'Other items for other answers', 'refraction' ) : esc_html__( 'Other content for other answers', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $row->get_controls(),
			'default' => [],
			'prevent_empty' => false,
			'title_field' => self::title_field( __( 'Choose a field', 'refraction' ) ),
			'description' => $list
				? esc_html__( 'Form pages: each row is a list for its answers (one item, or two and more). The rows that match make the list instead of the items above, in order; no match keeps the list as set. A row can also change one item.', 'refraction' )
				: esc_html__( 'Form pages: the first row whose answer matches replaces this widget\'s content; no match keeps it as set above.', 'refraction' ),
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

	/** The form's money format where this widget prints (for a Price or an Amount). */
	private static function money(): array {
		$state = Editor_Forms::rendering();
		$document = Form_Document::current();

		return Money::config( $state ? (array) ( $state['ctx']['money'] ?? [] ) : ( $document ? $document->form_settings()['settings'] : [] ) );
	}

	/** The rows a widget carries for the form's script, or null when it has none. */
	public static function rules( $widget ): ?array {
		$spec = self::widgets()[ $widget->get_name() ] ?? null;
		$settings = $spec ? (array) $widget->get_settings_for_display() : [];
		$rows = [];

		foreach ( (array) ( $settings[ self::ROWS ] ?? [] ) as $row ) {
			$condition = is_array( $row ) ? self::condition_of( $row ) : null;

			if ( ! $condition ) {
				continue;
			}

			$rule = $condition + [ 'set' => [] ];

			foreach ( $spec[1] as $name => [ , $type, $selector ] ) {
				$value = $row[ $name ] ?? null;

				if ( 'mode' === $name ) {
					continue;
				} elseif ( 'item' === $name ) {
					$rule['item'] = 'item' === ( $row['mode'] ?? '' ) ? max( 1, (int) $value ) : 0;
				} elseif ( 'items' === $name ) {
					if ( 'item' !== ( $row['mode'] ?? '' ) ) {
						$rule['items'] = self::list_items( (array) $value );
					}
				} elseif ( Controls_Manager::MEDIA === $type ) {
					$id = is_array( $value ) ? (int) ( $value['id'] ?? 0 ) : 0;
					$url = $id ? (string) wp_get_attachment_image_url( $id, 'full' ) : ( is_array( $value ) ? esc_url_raw( (string) ( $value['url'] ?? '' ) ) : '' );

					if ( '' !== $url ) {
						$rule['set'][] = [ 'sel' => $selector, 'src' => $url, 'srcset' => $id ? (string) wp_get_attachment_image_srcset( $id, 'full' ) : '', 'alt' => $id ? (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) : '' ];
					}
				} elseif ( Controls_Manager::ICONS === $type ) {
					$html = is_array( $value ) && ! empty( $value['value'] ) ? (string) Icons_Manager::try_get_icon_html( $value, [ 'aria-hidden' => 'true' ] ) : '';

					if ( '' !== $html ) {
						$rule['set'][] = [ 'sel' => $selector, 'html' => $html, 'part' => 'icon' ];
					}
				} elseif ( Controls_Manager::NUMBER === $type ) {
					if ( is_numeric( $value ) ) {
						// A Price shows the amount in the form's currency; an Amount puts the number in its box.
						$rule['set'][] = 'amount' === $name
							? [ 'sel' => $selector, 'value' => Money::format( (float) $value, self::money() ) ]
							: [ 'sel' => $selector, 'html' => esc_html( Money::display( (float) $value, self::money() ) ) ];
					}
				} elseif ( '' !== trim( (string) $value ) ) {
					$rule['set'][] = [ 'sel' => $selector, 'html' => self::text_html( (string) $value, $type ), 'part' => $name ];
				}
			}

			if ( $rule['set'] || ! empty( $rule['items'] ) ) {
				$rows[] = $rule;
			}
		}

		return $rows ? $rows : null;
	}

	/** A text as HTML: the editor's text kept (no scripts), line breaks kept, **words** in stars bold. */
	private static function text_html( string $text, string $type = Controls_Manager::TEXT ): string {
		if ( Controls_Manager::WYSIWYG === $type ) {
			return wp_kses_post( wpautop( $text ) );
		}

		return wp_kses_post( nl2br( (string) preg_replace( '/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $text ) ) );
	}

	/** An Icon List row's Items for the script: each item's text as HTML and its icon (none: the list's own). */
	private static function list_items( array $items ): array {
		$out = [];

		foreach ( array_slice( $items, 0, 50 ) as $item ) {
			$text = trim( (string) ( is_array( $item ) ? ( $item['text'] ?? '' ) : '' ) );

			if ( '' === $text ) {
				continue;
			}

			$icon = is_array( $item['icon'] ?? null ) && ! empty( $item['icon']['value'] ) ? (string) Icons_Manager::try_get_icon_html( $item['icon'], [ 'aria-hidden' => 'true' ] ) : '';
			$out[] = [ 'html' => self::text_html( $text ), 'icon' => $icon ];
		}

		return $out;
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

		$data = [ 'type' => $widget->get_name(), 'rows' => $rows ];

		if ( Plugin::$instance->editor->is_edit_mode() ) {
			$data['preview'] = max( 0, (int) $widget->get_settings( self::PREVIEW ) );
		}

		return $content . '<template data-rfb-swap="' . esc_attr( (string) wp_json_encode( $data ) ) . '"></template>';
	}
}

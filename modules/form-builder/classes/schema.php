<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The shape of a Form Builder collection (Booking, Listing, Transaction...) and the rules for its records.
 * Pure logic: no WordPress storage, so it is tested on its own (scripts/test-form-builder.php).
 *
 * A collection definition is:
 *   slug, label, singular, description, icon, title_field, default_status, public_form, public_list, success_message,
 *   fields:   [ { key, label, type, required, options[{value,label}], placeholder, help, width, in_table, filter, public, default, min, max } ]
 *   statuses: [ { key, label, color } ]
 */
class Schema {

	const MAX_FIELDS = 60;
	const MAX_OPTIONS = 100;
	const MAX_STATUSES = 12;
	const COLORS = [ 'primary', 'success', 'danger', 'warning', 'info', 'dark', 'secondary' ];
	/** Field and column widths: key => share of the row in percent. */
	const WIDTH_PERCENT = [
		'full' => 100, 'w90' => 90, 'w80' => 80, 'w75' => 75, 'w70' => 70, 'w66' => 66.667, 'w60' => 60, 'half' => 50,
		'w40' => 40, 'third' => 33.333, 'w30' => 30, 'w25' => 25, 'w20' => 20, 'w10' => 10,
	];
	const WIDTHS = [ 'full', 'w90', 'w80', 'w75', 'w70', 'w66', 'w60', 'half', 'w40', 'third', 'w30', 'w25', 'w20', 'w10' ];
	const MAX_ICON_ITEMS = 30;
	const MARKER_POSITIONS = [ 'left', 'right', 'top-left', 'top-right', 'hidden' ];
	const MARKER_LOOKS = [ 'radio', 'tick', 'none' ];
	/** Fields that can show an icon at the left of their box (0.93.0). */
	const ICON_TYPES = [ 'text', 'textarea', 'email', 'phone', 'url', 'number', 'date', 'time', 'datetime', 'select', 'country', 'currency', 'name' ];
	/** Phone formats (0.93.0): as typed, or a pattern applied while typing (# is a digit). */
	const PHONE_FORMATS = [ '', 'national', 'international' ];
	const PHONE_PATTERNS = [ 'national' => '(###) ###-####', 'international' => '+## ### ### ####' ];

	/** How a Choice field shows its options (0.92.0): a list, a segmented bar, a filled pill switch, icon tiles, cards or image cards. */
	const CHOICE_LOOKS = [ 'list', 'segmented', 'pill', 'tiles', 'cards', 'images' ];

	/** @return array<string,string> field type => label */
	public static function types(): array {
		$types = [];

		foreach ( self::palette() as $group ) {
			$types += $group['types'];
		}

		// A panel only exists inside an Accordion or Tabs; it is not offered in the palette.
		$types['panel'] = self::t( 'Panel' );

		return $types;
	}

	/** The builder palette: groups of field types, in the order the panel shows them. */
	public static function palette(): array {
		return [
			'layout' => [
				'label' => self::t( 'Layout' ),
				'types' => [
					'step' => self::t( 'Step' ),
					'group' => self::t( 'Group' ),
					'repeater' => self::t( 'Repeater' ),
					'columns' => self::t( 'Columns' ),
					'accordion' => self::t( 'Accordion' ),
					'tabs' => self::t( 'Tabs' ),
					'divider' => self::t( 'Divider' ),
				],
			],
			'content' => [
				'label' => self::t( 'Content' ),
				'types' => [
					'heading' => self::t( 'Heading' ),
					'paragraph' => self::t( 'Paragraph' ),
					'image' => self::t( 'Image' ),
					'icon_list' => self::t( 'Icon List' ),
					'badge' => self::t( 'Badge' ),
					'price' => self::t( 'Price' ),
					'summary' => self::t( 'Summary' ),
					'html' => self::t( 'Custom HTML' ),
				],
			],
			'basic' => [
				'label' => self::t( 'Basic fields' ),
				'types' => [
					'text' => self::t( 'Text' ),
					'textarea' => self::t( 'Long text' ),
					'name' => self::t( 'Name' ),
					'number' => self::t( 'Number' ),
					'currency' => self::t( 'Amount' ),
					'email' => self::t( 'Email' ),
					'phone' => self::t( 'Phone' ),
					'url' => self::t( 'Website' ),
					'country' => self::t( 'Country' ),
					'date' => self::t( 'Date' ),
					'time' => self::t( 'Time' ),
					'datetime' => self::t( 'Date and time' ),
				],
			],
			'choice' => [
				'label' => self::t( 'Choices' ),
				'types' => [
					'select' => self::t( 'Dropdown' ),
					'radio' => self::t( 'Choice (one)' ),
					'checkbox' => self::t( 'Choices (many)' ),
					'choice_set' => self::t( 'Choice cards' ),
					'toggle' => self::t( 'Yes / No' ),
					'rating' => self::t( 'Rating' ),
				],
			],
			'advanced' => [
				'label' => self::t( 'Advanced' ),
				'types' => [
					'file' => self::t( 'File upload' ),
					'signature' => self::t( 'Signature' ),
					'hidden' => self::t( 'Hidden field' ),
					'total' => self::t( 'Total' ),
				],
			],
		];
	}

	/** Share of a row (percent) a width key takes. */
	public static function width_percent( string $width ): float {
		return (float) ( self::WIDTH_PERCENT[ $width ] ?? 100 );
	}

	/** Widths for the designer's select: key => label. */
	public static function width_choices(): array {
		return [
			'full' => self::t( 'Full width' ), 'w90' => '90%', 'w80' => '80%', 'w75' => '3/4 (75%)', 'w70' => '70%', 'w66' => '2/3 (66%)', 'w60' => '60%',
			'half' => '1/2 (50%)', 'w40' => '40%', 'third' => '1/3 (33%)', 'w30' => '30%', 'w25' => '1/4 (25%)', 'w20' => '1/5 (20%)', 'w10' => '10%',
		];
	}

	/** Icons offered for the Icon List (only those bundled with the plugin are shown). */
	public static function list_icons(): array {
		return [
			'check', 'check-circle', 'done-all', 'star', 'favorite', 'verified', 'thumb-up', 'thumb-down', 'bolt', 'arrow-forward', 'circle',
			'radio-button-unchecked', 'remove', 'add', 'close', 'cancel', 'block', 'info', 'warning', 'error', 'lock', 'shield', 'key', 'person',
			'group', 'home', 'mail', 'call', 'location-on', 'schedule', 'event', 'language', 'link', 'local-offer', 'sell', 'redeem',
			'workspace-premium', 'diamond', 'rocket-launch', 'pets', 'spa', 'content-cut', 'pill', 'support-agent', 'local-shipping',
			'credit-card', 'shopping-bag', 'payments', 'palette', 'settings',
		];
	}

	/** Material icon (assets/icons/material) of every type, for the palette tiles. */
	public static function icons(): array {
		return [
			'step' => 'linear-scale', 'group' => 'dashboard', 'repeater' => 'repeat', 'accordion' => 'table-rows', 'tabs' => 'tablet', 'columns' => 'view-column', 'icon_list' => 'checklist', 'badge' => 'label', 'price' => 'sell', 'choice_set' => 'layers', 'panel' => 'table-rows', 'divider' => 'horizontal-rule',
			'heading' => 'title', 'paragraph' => 'subject', 'image' => 'image', 'html' => 'code',
			'text' => 'text-fields', 'textarea' => 'notes', 'name' => 'badge', 'number' => 'pin', 'currency' => 'payments', 'email' => 'mail',
			'phone' => 'call', 'url' => 'link', 'country' => 'public', 'date' => 'calendar-month', 'time' => 'schedule', 'datetime' => 'event',
			'select' => 'arrow-drop-down-circle', 'radio' => 'radio-button-checked', 'checkbox' => 'check-box', 'toggle' => 'toggle-on', 'rating' => 'star',
			'file' => 'upload-file', 'signature' => 'draw', 'hidden' => 'visibility-off', 'summary' => 'checklist', 'total' => 'payments',
		];
	}

	/** Types that only decorate the form and never hold a value. */
	public static function is_layout( string $type ): bool {
		return in_array( $type, [ 'heading', 'paragraph', 'html', 'divider', 'image', 'icon_list', 'badge', 'price', 'summary' ], true );
	}

	public static function is_step( string $type ): bool {
		return 'step' === $type;
	}

	/** Groups and repeaters: containers whose children are stored inside the container's own value. */
	public static function is_container( string $type ): bool {
		return in_array( $type, [ 'group', 'repeater' ], true );
	}

	/** Accordion and Tabs: they hold panels and have no value of their own. */
	public static function is_host( string $type ): bool {
		return in_array( $type, [ 'accordion', 'tabs', 'columns' ], true );
	}

	/** Accordion, Tabs, Columns and their panels (a column is a panel): layout only, the fields inside store their values as if the layout was not there. */
	public static function is_transparent( string $type ): bool {
		return self::is_host( $type ) || 'panel' === $type;
	}

	/** A set of choice cards: its children are Group or Repeater cards and its value is the picked card(s). */
	public static function is_choice_set( string $type ): bool {
		return 'choice_set' === $type;
	}

	/** True for every type that can have children. */
	public static function has_children( string $type ): bool {
		return self::is_container( $type ) || self::is_transparent( $type ) || self::is_choice_set( $type );
	}

	/** True for every type that has a stored value (containers hold their children's values). */
	public static function has_value( string $type ): bool {
		return ! self::is_layout( $type ) && ! self::is_step( $type ) && ! self::is_transparent( $type );
	}

	/**
	 * May a field of this type sit inside a parent?
	 *
	 * @param string $type   The field's type.
	 * @param string $parent '' (top level), a host type, "panel" (a panel of an Accordion or Tabs), "colpanel" (a column), a container
	 *                       type, "card" (a Group or Repeater that is a choice card) or "choice_set".
	 * @param string $root   The nearest value container around: '' (none), "group", "repeater" or "card". Groups, repeaters, choice
	 *                       sets, steps, accordions and tabs never nest inside a value container; uploads are refused in repeaters and
	 *                       cards, signatures in cards.
	 */
	public static function allowed_in( string $type, string $parent, string $root = '' ): bool {
		if ( '' === $parent ) {
			return 'panel' !== $type;
		}

		if ( self::is_host( $parent ) ) {
			return 'panel' === $type;
		}

		if ( 'choice_set' === $parent ) {
			return self::is_container( $type );
		}

		if ( self::is_step( $type ) || 'panel' === $type ) {
			return false;
		}

		$inside_host = in_array( $parent, [ 'panel', 'colpanel' ], true );

		if ( in_array( $type, [ 'accordion', 'tabs' ], true ) ) {
			return in_array( $root, [ '', 'card' ], true ) && ! $inside_host;
		}

		if ( 'columns' === $type ) {
			return true;
		}

		if ( self::is_container( $type ) || self::is_choice_set( $type ) ) {
			return '' === $root;
		}

		if ( 'file' === $type ) {
			return ! in_array( $root, [ 'repeater', 'card' ], true );
		}

		return ! ( 'signature' === $type && 'card' === $root );
	}

	/** True for a value that fits in a table cell and can be sorted or filtered. */
	public static function is_scalar_type( string $type ): bool {
		return self::has_value( $type ) && ! self::is_container( $type ) && ! self::is_choice_set( $type ) && ! in_array( $type, [ 'file', 'checkbox', 'name', 'signature' ], true );
	}

	public static function has_options( string $type ): bool {
		return in_array( $type, [ 'select', 'radio', 'checkbox' ], true );
	}

	public static function is_numeric_type( string $type ): bool {
		return in_array( $type, [ 'number', 'currency', 'rating' ], true );
	}

	public static function t( string $text ): string {
		return function_exists( '__' ) ? __( $text, 'refraction' ) : $text; // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
	}

	/** A key is lowercase letters, digits and underscores, starting with a letter. */
	public static function key( $value, int $max = 40 ): string {
		$key = strtolower( trim( (string) $value ) );
		$key = preg_replace( '/[^a-z0-9_]+/', '_', $key );
		$key = trim( (string) $key, '_' );

		if ( '' !== $key && ! ctype_alpha( $key[0] ) ) {
			$key = 'f_' . $key;
		}

		return substr( $key, 0, $max );
	}

	/** A slug is lowercase letters, digits and dashes. */
	public static function slug( $value ): string {
		$slug = strtolower( trim( (string) $value ) );
		$slug = trim( (string) preg_replace( '/[^a-z0-9]+/', '-', $slug ), '-' );

		return substr( $slug, 0, 40 );
	}

	public static function text( $value, int $max = 255 ): string {
		$value = is_scalar( $value ) ? (string) $value : '';
		$value = strip_tags( $value );
		$value = preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value );
		$value = trim( (string) preg_replace( '/[ \t]+/', ' ', $value ) );

		return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
	}

	public static function color( $value ): string {
		return in_array( $value, self::COLORS, true ) ? $value : 'secondary';
	}

	/**
	 * "value|Label" or just "Label" per line (or an array of the same / of {value,label}) into option objects.
	 *
	 * @param string|array $raw
	 */
	public static function options( $raw ): array {
		$lines = is_array( $raw ) ? $raw : preg_split( '/\r\n|\r|\n/', (string) $raw );
		$options = [];
		$seen = [];

		foreach ( (array) $lines as $line ) {
			$number = null;

			if ( is_array( $line ) ) {
				$value = (string) ( $line['value'] ?? '' );
				$label = (string) ( $line['label'] ?? $value );
				$number = $line['number'] ?? null;
			} else {
				// value|Label|number: the number is what a Total counts for this choice (0.90.0).
				$parts = explode( '|', (string) $line, 3 );
				$label = isset( $parts[1] ) ? $parts[1] : $parts[0];
				$value = $parts[0];
				$number = $parts[2] ?? null;
			}

			$number = is_numeric( is_string( $number ) ? trim( $number ) : $number ) ? (float) $number : null;

			$label = self::text( $label, 120 );
			$value = self::text( $value, 120 );

			if ( '' === $label ) {
				continue;
			}

			if ( '' === $value ) {
				$value = $label;
			}

			if ( isset( $seen[ $value ] ) ) {
				continue;
			}

			$seen[ $value ] = true;
			$options[] = [ 'value' => $value, 'label' => $label, 'number' => $number ];

			if ( count( $options ) >= self::MAX_OPTIONS ) {
				break;
			}
		}

		return $options;
	}

	public static function options_to_text( array $options ): string {
		return implode(
			"\n",
			array_map(
				static function ( $option ) {
					$number = isset( $option['number'] ) && null !== $option['number'] ? '|' . self::number_text( (float) $option['number'] ) : '';

					return $option['value'] === $option['label'] && '' === $number ? $option['label'] : $option['value'] . '|' . $option['label'] . $number;
				},
				$options
			)
		);
	}

	/** Allowed upload extensions (a field picks a subset). */
	const FILE_TYPES = [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'zip', 'mp3', 'mp4' ];
	const LABEL_TAGS = [ 'div', 'p', 'h2', 'h3', 'h4', 'h5', 'h6' ];
	const NAME_PARTS = [ 'prefix', 'first', 'middle', 'last' ];
	const IMAGE_SIZES = [ 'thumbnail', 'medium', 'large', 'full' ];
	const HIDDEN_SOURCES = [ 'static', 'query', 'page_url', 'referrer', 'user_id', 'user_email', 'date' ];

	/** Content that may appear in a Custom HTML block: post-level HTML, no scripts or event handlers. */
	public static function html( $value ): string {
		$value = is_scalar( $value ) ? (string) $value : '';
		$value = substr( $value, 0, 20000 );

		if ( function_exists( 'wp_kses_post' ) ) {
			return trim( wp_kses_post( $value ) );
		}

		// Fallback for tests outside WordPress: drop script and style blocks, then keep a few tags without attributes.
		$value = preg_replace( '~<(script|style)\b.*?</\1\s*>~is', '', $value );
		$value = strip_tags( (string) $value, '<p><br><a><strong><em><b><i><ul><ol><li><h2><h3><h4><span><div><hr>' );

		return trim( (string) preg_replace( '~<(\w+)\s+[^>]*>~', '<$1>', $value ) );
	}

	/** Cleans one field. Containers clean their children; use clean_tree() for a whole list. */
	public static function clean_field( $raw, string $parent = '', string $root = '' ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}

		$type = isset( $raw['type'] ) && isset( self::types()[ $raw['type'] ] ) ? $raw['type'] : 'text';

		if ( ! self::allowed_in( $type, $parent, $root ) ) {
			return null;
		}

		$label = self::text( $raw['label'] ?? '', 80 );
		$has_value = self::has_value( $type );
		$is_card = 'choice_set' === $parent && self::is_container( $type );
		$col_widths = array_merge( [ 'auto' ], self::WIDTHS );

		if ( '' === $label && $has_value ) {
			return null;
		}

		$key = self::key( '' !== (string) ( $raw['key'] ?? '' ) ? $raw['key'] : ( $has_value ? $label : $type ) );

		if ( '' === $key ) {
			return null;
		}

		$accept = $raw['accept'] ?? [ 'jpg', 'jpeg', 'png', 'pdf' ];
		$accept = array_values( array_intersect( self::FILE_TYPES, array_map( 'strtolower', array_map( 'trim', is_array( $accept ) ? $accept : explode( ',', (string) $accept ) ) ) ) );
		$classes = array_slice( array_filter( preg_split( '/\s+/', (string) ( $raw['css_class'] ?? '' ) ), static function ( $c ) {
			return 1 === preg_match( '/^[A-Za-z][A-Za-z0-9_-]{0,39}$/', $c );
		} ), 0, 3 );
		$source = in_array( $raw['source'] ?? '', self::HIDDEN_SOURCES, true ) ? $raw['source'] : 'static';
		$parts = $raw['parts'] ?? [ 'first', 'last' ];
		$parts = array_values( array_intersect( self::NAME_PARTS, array_map( 'trim', array_map( 'strval', is_array( $parts ) ? $parts : explode( ',', (string) $parts ) ) ) ) );
		$tag_default = 'step' === $type ? 'h3' : 'div';
		$options = self::has_options( $type ) ? self::options( $raw['options'] ?? [] ) : [];
		$layout_text = 'html' === $type ? self::html( $raw['content'] ?? '' ) : ( 'paragraph' === $type ? self::textarea( $raw['content'] ?? '', 2000 ) : self::text( $raw['content'] ?? '', 300 ) );

		return [
			'key' => $key,
			'label' => '' !== $label ? $label : ( self::types()[ $type ] ?? '' ),
			'type' => $type,
			'required' => $has_value && ! self::is_container( $type ) && ! in_array( $type, [ 'hidden', 'total' ], true ) && 'card' !== $root && ! $is_card && ! empty( $raw['required'] ),
			'options' => $options,
			'option_extras' => in_array( $type, [ 'radio', 'checkbox' ], true ) ? self::option_extras( $raw['option_extras'] ?? [], $options ) : [],
			'placeholder' => self::text( $raw['placeholder'] ?? '', 120 ) ?: ( 'signature' === $type ? self::t( 'Sign here' ) : '' ),
			'help' => self::text( $raw['help'] ?? '', 200 ),
			'width' => in_array( $raw['width'] ?? '', self::WIDTHS, true ) ? $raw['width'] : 'full',
			'in_table' => ( self::is_scalar_type( $type ) || 'name' === $type ) && 'hidden' !== $type && ! empty( $raw['in_table'] ),
			'filter' => ! empty( $raw['filter'] ) && self::has_options( $type ) && 'checkbox' !== $type,
			'public' => ! empty( $raw['public'] ) && ( self::is_scalar_type( $type ) || 'name' === $type ) && 'hidden' !== $type,
			'default' => self::text( $raw['default'] ?? '', 255 ),
			'min' => self::number_or_null( $raw['min'] ?? null ),
			'max' => self::number_or_null( $raw['max'] ?? null ),
			'content' => $layout_text,
			'level' => max( 2, min( 6, (int) ( $raw['level'] ?? 3 ) ) ),
			'conditions' => Conditions::clean( $raw['conditions'] ?? [] ),
			'css_class' => implode( ' ', $classes ),
			'hide_label' => ! empty( $raw['hide_label'] ),
			'accept' => $accept ?: [ 'jpg', 'jpeg', 'png', 'pdf' ],
			'max_size' => (float) max( 0.1, min( 64.0, is_numeric( $raw['max_size'] ?? null ) ? (float) $raw['max_size'] : 5.0 ) ),
			'max_files' => max( 1, min( 10, (int) ( $raw['max_files'] ?? 1 ) ) ),
			'children' => [],
			'min_rows' => max( 0, min( 20, (int) ( $raw['min_rows'] ?? 0 ) ) ),
			'max_rows' => max( 1, min( 50, (int) ( $raw['max_rows'] ?? 10 ) ) ),
			'add_label' => self::text( $raw['add_label'] ?? '', 40 ) ?: self::t( 'Add row' ),
			'source' => 'hidden' === $type ? $source : 'static',
			'description' => self::text( $raw['description'] ?? '', 300 ),
			'label_tag' => in_array( $raw['label_tag'] ?? '', self::LABEL_TAGS, true ) ? $raw['label_tag'] : $tag_default,
			'parts' => 'name' === $type ? ( $parts ?: [ 'first', 'last' ] ) : [ 'first', 'last' ],
			'image_id' => max( 0, (int) ( $raw['image_id'] ?? 0 ) ),
			'image_size' => in_array( $raw['image_size'] ?? '', self::IMAGE_SIZES, true ) ? $raw['image_size'] : 'medium',
			'image_width' => max( 5, min( 100, (int) ( $raw['image_width'] ?? 100 ) ) ),
			'image_align' => in_array( $raw['image_align'] ?? '', [ 'left', 'center', 'right' ], true ) ? $raw['image_align'] : 'left',
			'image_alt' => self::text( $raw['image_alt'] ?? '', 160 ),
			'image_link' => Settings::url( $raw['image_link'] ?? '' ),
			'sig_height' => max( 100, min( 400, (int) ( $raw['sig_height'] ?? 180 ) ) ),
			'style' => Field_Style::clean( $raw['style'] ?? [] ),
			'multiple' => ( self::is_choice_set( $type ) || 'accordion' === $type ) && ! empty( $raw['multiple'] ),
			'open' => 'panel' === $type && ! empty( $raw['open'] ),
			'tab_look' => in_array( $raw['tab_look'] ?? '', [ 'line', 'pills' ], true ) ? $raw['tab_look'] : 'line',
			'per' => in_array( $type, [ 'currency', 'group', 'repeater', 'price' ], true ) && isset( Money::periods()[ $raw['per'] ?? '' ] ) ? (string) ( $raw['per'] ?? '' ) : '',
			'per_label' => self::text( $raw['per_label'] ?? '', 20 ),
			'card_badge' => $is_card ? self::text( $raw['card_badge'] ?? '', 30 ) : '',
			'card_subtitle' => $is_card ? self::text( $raw['card_subtitle'] ?? '', 160 ) : '',
			'card_price' => $is_card ? self::number_or_null( $raw['card_price'] ?? null ) : null,
			'card_note' => $is_card ? self::text( $raw['card_note'] ?? '', 60 ) : '',
			'card_details' => $is_card ? ( self::text( $raw['card_details'] ?? '', 40 ) ?: self::t( "What's included" ) ) : '',
			'card_details_open' => $is_card && ! empty( $raw['card_details_open'] ),
			'card_inline' => $is_card && ! empty( $raw['card_inline'] ),
			'card_mode' => $is_card && 'free' === ( $raw['card_mode'] ?? '' ) ? 'free' : 'standard',
			'marker_pos' => self::marker( $raw['marker_pos'] ?? '', self::MARKER_POSITIONS, 'choice_set' === $type ? 'left' : '', 'choice_set' === $type || $is_card ),
			'marker_look' => self::marker( $raw['marker_look'] ?? '', self::MARKER_LOOKS, 'choice_set' === $type ? 'radio' : '', 'choice_set' === $type || $is_card ),
			'price_card' => 'price' === $type && ( ! array_key_exists( 'price_card', $raw ) || ! empty( $raw['price_card'] ) ),
			'price_amount' => 'price' === $type ? self::number_or_null( $raw['price_amount'] ?? null ) : null,
			'from_card' => 'heading' === $type && ! empty( $raw['from_card'] ),
			'card_width' => $is_card && in_array( $raw['card_width'] ?? '', $col_widths, true ) ? $raw['card_width'] : 'auto',
			'card_columns' => 'choice_set' === $type ? max( 1, min( 6, (int) ( $raw['card_columns'] ?? 1 ) ) ) : 1,
			'card_gap' => 'choice_set' === $type ? max( 0, min( 60, is_numeric( $raw['card_gap'] ?? null ) ? (int) $raw['card_gap'] : 10 ) ) : 10,
			'col_gap' => 'columns' === $type ? max( 0, min( 80, is_numeric( $raw['col_gap'] ?? null ) ? (int) $raw['col_gap'] : 24 ) ) : 24,
			'list_layout' => 'icon_list' === $type && 'horizontal' === ( $raw['list_layout'] ?? '' ) ? 'horizontal' : 'vertical',
			'items' => 'icon_list' === $type ? self::icon_items( $raw['items'] ?? [] ) : [],
			// Booking fields (0.90.0): totals, date and time limits, a number stepper and typing suggestions.
			'formula' => 'total' === $type ? self::text( $raw['formula'] ?? '', Formula::MAX_LENGTH ) : '',
			'rules' => 'total' === $type ? self::total_rules( $raw['rules'] ?? [] ) : [],
			'no_price' => 'total' === $type ? self::text( $raw['no_price'] ?? '', 120 ) : '',
			'notice_hours' => in_array( $type, [ 'date', 'datetime' ], true ) ? max( 0, min( 8760, (int) ( $raw['notice_hours'] ?? 0 ) ) ) : 0,
			'max_days' => in_array( $type, [ 'date', 'datetime' ], true ) ? max( 0, min( 1095, (int) ( $raw['max_days'] ?? 0 ) ) ) : 0,
			'closed_days' => in_array( $type, [ 'date', 'datetime' ], true ) ? self::weekdays( $raw['closed_days'] ?? [] ) : [],
			'time_min' => in_array( $type, [ 'time', 'datetime' ], true ) ? self::clock( $raw['time_min'] ?? '' ) : '',
			'time_max' => in_array( $type, [ 'time', 'datetime' ], true ) ? self::clock( $raw['time_max'] ?? '' ) : '',
			'time_step' => in_array( $type, [ 'time', 'datetime' ], true ) ? max( 0, min( 240, (int) ( $raw['time_step'] ?? 0 ) ) ) : 0,
			'stepper' => 'number' === $type && ! empty( $raw['stepper'] ),
			'suggestions' => 'text' === $type ? self::suggestions( $raw['suggestions'] ?? [] ) : [],
			// Field extras (0.93.0): an icon in the box, a growing long text, a phone pattern, the country's flag.
			'icon' => in_array( $type, self::ICON_TYPES, true ) ? self::option_icon( $raw['icon'] ?? null ) : null,
			'icon_last' => 'name' === $type ? self::option_icon( $raw['icon_last'] ?? null ) : null,
			// An amount shows the form's currency symbol beside its box only when asked (0.94.0); an icon can take its place.
			'currency_symbol' => 'currency' === $type && ! empty( $raw['currency_symbol'] ),
			'autogrow' => 'textarea' === $type && ! empty( $raw['autogrow'] ),
			'phone_format' => 'phone' === $type && in_array( $raw['phone_format'] ?? '', self::PHONE_FORMATS, true ) ? (string) ( $raw['phone_format'] ?? '' ) : '',
			'phone_pattern' => 'phone' === $type ? self::phone_pattern( (string) ( $raw['phone_format'] ?? '' ), (string) ( $raw['phone_pattern'] ?? '' ) ) : '',
			'country_flag' => 'country' === $type && ( ! array_key_exists( 'country_flag', $raw ) || ! empty( $raw['country_flag'] ) ),
			// Dates and times open the form's own calendar and clock unless switched off (0.95.0).
			'picker' => in_array( $type, [ 'date', 'time', 'datetime' ], true ) && ( ! array_key_exists( 'picker', $raw ) || ! empty( $raw['picker'] ) ),
			// Choice looks (0.92.0).
			'choice_look' => in_array( $type, [ 'radio', 'checkbox' ], true ) && in_array( $raw['choice_look'] ?? '', self::CHOICE_LOOKS, true ) ? $raw['choice_look'] : 'list',
			'choice_full' => in_array( $type, [ 'radio', 'checkbox' ], true ) && ! empty( $raw['choice_full'] ),
			'choice_columns' => in_array( $type, [ 'radio', 'checkbox' ], true ) ? max( 0, min( 6, (int) ( $raw['choice_columns'] ?? 0 ) ) ) : 0,
		];
	}

	/** Total rules: [ { conditions, formula } ], the first that matches gives the formula. */
	private static function total_rules( $raw ): array {
		$rules = [];

		foreach ( is_array( $raw ) ? $raw : [] as $rule ) {
			if ( ! is_array( $rule ) || count( $rules ) >= 20 ) {
				continue;
			}

			$conditions = Conditions::clean( [ 'enabled' => true, 'action' => 'show' ] + (array) ( $rule['conditions'] ?? [] ) );

			if ( ! $conditions['enabled'] ) {
				continue;
			}

			$rules[] = [ 'conditions' => $conditions, 'formula' => self::text( $rule['formula'] ?? '', Formula::MAX_LENGTH ) ];
		}

		return $rules;
	}

	/** Weekdays as numbers, 0 (Sunday) to 6 (Saturday). */
	private static function weekdays( $raw ): array {
		$days = array_map( 'intval', array_filter( is_array( $raw ) ? $raw : explode( ',', (string) $raw ), 'is_numeric' ) );

		return array_values( array_unique( array_filter( $days, static function ( $day ) {
			return $day >= 0 && $day <= 6;
		} ) ) );
	}

	/** "HH:MM" or an empty string. */
	private static function clock( $raw ): string {
		$value = is_scalar( $raw ) ? trim( (string) $raw ) : '';

		return 1 === preg_match( '/^([01]\d|2[0-3]):[0-5]\d$/', $value ) ? $value : '';
	}

	/** Typing suggestions of a text field: one per line, up to 200. */
	private static function suggestions( $raw ): array {
		$lines = is_array( $raw ) ? $raw : preg_split( '/\r\n|\r|\n/', (string) $raw );
		$out = [];

		foreach ( (array) $lines as $line ) {
			$line = self::text( $line, 160 );

			if ( '' !== $line && ! in_array( $line, $out, true ) && count( $out ) < 200 ) {
				$out[] = $line;
			}
		}

		return $out;
	}

	/** A whitelisted choice, or the fallback; a card or set that does not set one inherits ('' is allowed when $inherit). */
	private static function marker( $value, array $allowed, string $fallback, bool $applies ): string {
		return $applies && in_array( $value, $allowed, true ) ? (string) $value : $fallback;
	}

	/** @return array<int,array{text:string,icon:string,link:string}> */
	public static function icon_items( $raw ): array {
		$items = [];

		foreach ( is_array( $raw ) ? $raw : [] as $item ) {
			if ( ! is_array( $item ) || count( $items ) >= self::MAX_ICON_ITEMS ) {
				continue;
			}

			$text = self::text( $item['text'] ?? '', 160 );

			if ( '' === $text ) {
				continue;
			}

			$icon = (string) ( $item['icon'] ?? '' );
			$items[] = [
				'text' => $text,
				'icon' => preg_match( '/^[a-z0-9][a-z0-9-]{0,40}$/', $icon ) ? $icon : 'check',
				'link' => Settings::url( $item['link'] ?? '' ),
			];
		}

		return $items;
	}

	/**
	 * What a Choice field shows with its options (0.92.0): an icon, a line of text, a badge and a picture (a media library
	 * attachment id, shown by Image cards), keyed by the option's value.
	 * Each row names its option by value or label ("choice"); rows for options that do not exist are dropped.
	 *
	 * @param array $raw     [ { choice, icon: { value, library }, text, badge, image: { id } } ] (or already keyed by value).
	 * @param array $options The field's cleaned options.
	 *
	 * @return array<string,array{icon:array|null,text:string,badge:string,image:int}>
	 */
	public static function option_extras( $raw, array $options ): array {
		$by_name = [];

		foreach ( $options as $option ) {
			$by_name[ strtolower( $option['label'] ) ] = $option['value'];
			$by_name[ strtolower( $option['value'] ) ] = $option['value'];
		}

		$extras = [];
		$position = -1;

		foreach ( is_array( $raw ) ? $raw : [] as $key => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			++$position;
			$name = strtolower( self::text( (string) ( $row['choice'] ?? ( is_string( $key ) ? $key : '' ) ), 120 ) );
			// A row names its choice by label or value; otherwise (empty or not found) it is the choice in the same place.
			$value = $by_name[ $name ] ?? ( $options[ $position ]['value'] ?? null );

			if ( null === $value || isset( $extras[ $value ] ) ) {
				continue;
			}

			$image = $row['image'] ?? 0;
			$extra = [
				'icon' => self::option_icon( $row['icon'] ?? null ),
				'text' => self::text( $row['text'] ?? '', 160 ),
				'badge' => self::text( $row['badge'] ?? '', 30 ),
				'image' => max( 0, (int) ( is_array( $image ) ? ( $image['id'] ?? 0 ) : $image ) ),
			];

			if ( $extra['icon'] || '' !== $extra['text'] || '' !== $extra['badge'] || $extra['image'] ) {
				$extras[ $value ] = $extra;
			}
		}

		return $extras;
	}

	/**
	 * The pattern a formatted phone box writes while typing: # is a digit, spaces, brackets, dashes, dots and a leading + are
	 * added for the visitor. Empty when the field keeps what is typed; the format's own pattern when none (or junk) is given.
	 */
	public static function phone_pattern( string $format, string $pattern ): string {
		if ( ! isset( self::PHONE_PATTERNS[ $format ] ) ) {
			return '';
		}

		$pattern = trim( $pattern );

		return 1 === preg_match( '/^\+?[#()\-. ]{4,30}$/', $pattern ) && substr_count( $pattern, '#' ) >= 4 ? $pattern : self::PHONE_PATTERNS[ $format ];
	}

	/** An icon from the icon libraries ({ value, library }): class names and a library name only, nothing else. */
	private static function option_icon( $icon ): ?array {
		if ( ! is_array( $icon ) ) {
			return null;
		}

		$value = trim( (string) ( $icon['value'] ?? '' ) );
		$library = (string) ( $icon['library'] ?? '' );

		if ( ! preg_match( '/^[a-z0-9][a-z0-9 _-]{1,80}$/i', $value ) || ! preg_match( '/^[a-z0-9][a-z0-9-]{1,40}$/', $library ) || 'svg' === $library ) {
			return null;
		}

		return [ 'value' => $value, 'library' => $library ];
	}

	private static function number_or_null( $value ): ?float {
		return is_numeric( $value ) ? (float) $value : null;
	}

	/**
	 * Cleans a list of fields (and the children of containers), dropping junk and duplicate keys.
	 *
	 * @param array  $raw    Raw fields.
	 * @param array  $used   Keys already taken anywhere in the form (by reference).
	 * @param int    $budget Fields left before the form-wide cap (by reference).
	 */
	public static function clean_tree( $raw, array &$used, int &$budget, string $parent = '', string $root = '' ): array {
		$fields = [];

		foreach ( (array) $raw as $item ) {
			if ( $budget <= 0 ) {
				break;
			}

			$field = self::clean_field( $item, $parent, $root );

			if ( ! $field ) {
				continue;
			}

			// A field without its own key gets a free one (Heading, Heading 2...); a clash on a value field is dropped.
			$explicit = '' !== (string) ( $item['key'] ?? '' );
			$base = $field['key'];

			if ( isset( $used[ $base ] ) ) {
				if ( self::has_value( $field['type'] ) && $explicit ) {
					continue;
				}

				for ( $i = 2; isset( $used[ $base . '_' . $i ] ); $i++ ) {
					continue;
				}

				$field['key'] = substr( $base, 0, 36 ) . '_' . $i;
			}

			$used[ $field['key'] ] = true;
			$budget--;

			if ( self::has_children( $field['type'] ) ) {
				$type = $field['type'];
				$is_card = self::is_container( $type ) && 'choice_set' === $parent;

				if ( $is_card ) {
					$as = 'card';
					$inner = 'card';
				} elseif ( 'panel' === $type ) {
					$as = 'columns' === $parent ? 'colpanel' : 'panel';
					$inner = $root;
				} else {
					$as = $type;
					$inner = self::is_container( $type ) ? $type : $root;
				}

				$field['children'] = self::clean_tree( $item['children'] ?? [], $used, $budget, $as, $inner );
			}

			$fields[] = $field;
		}

		return $fields;
	}

	/** Every field of the form, containers followed by their children, in order. */
	public static function walk( array $fields ): array {
		$all = [];

		foreach ( $fields as $field ) {
			$all[] = $field;

			if ( $field['children'] ) {
				$all = array_merge( $all, self::walk( $field['children'] ) );
			}
		}

		return $all;
	}

	/** The fields as they store values: Accordion, Tabs and panels are replaced by the fields inside them. */
	public static function flat( array $fields ): array {
		$out = [];

		foreach ( $fields as $field ) {
			if ( self::is_transparent( $field['type'] ) ) {
				$out = array_merge( $out, self::flat( $field['children'] ) );
			} else {
				$out[] = $field;
			}
		}

		return $out;
	}

	/** Top-level fields that store a value (including groups and repeaters), also those inside an Accordion or Tabs. */
	public static function value_fields( array $definition ): array {
		return array_values( array_filter( self::flat( $definition['fields'] ), static function ( $field ) {
			return self::has_value( $field['type'] );
		} ) );
	}

	/** The cards of a choice set that are picked by default. */
	public static function card( array $set, string $key ): ?array {
		foreach ( $set['children'] as $card ) {
			if ( $card['key'] === $key ) {
				return $card;
			}
		}

		return null;
	}

	/** The form split into steps: a list of field lists. One step when the form has no Step field. */
	public static function steps( array $definition ): array {
		$steps = [ [ 'title' => '', 'fields' => [], 'step' => null ] ];

		foreach ( $definition['fields'] as $field ) {
			if ( self::is_step( $field['type'] ) ) {
				if ( $steps[0]['fields'] || count( $steps ) > 1 ) {
					$steps[] = [ 'title' => $field['label'], 'fields' => [], 'step' => $field ];
				} else {
					$steps[0]['title'] = $field['label'];
					$steps[0]['step'] = $field;
				}

				continue;
			}

			$steps[ count( $steps ) - 1 ]['fields'][] = $field;
		}

		return $steps;
	}

	/** @return array{key:string,label:string,color:string}[] */
	public static function clean_statuses( $raw ): array {
		$statuses = [];
		$seen = [];

		foreach ( (array) $raw as $status ) {
			if ( ! is_array( $status ) ) {
				continue;
			}

			$label = self::text( $status['label'] ?? '', 40 );
			$key = self::key( '' !== (string) ( $status['key'] ?? '' ) ? $status['key'] : $label, 30 );

			if ( '' === $label || '' === $key || isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;
			$statuses[] = [ 'key' => $key, 'label' => $label, 'color' => self::color( $status['color'] ?? '' ) ];

			if ( count( $statuses ) >= self::MAX_STATUSES ) {
				break;
			}
		}

		return $statuses;
	}

	/** Cleans a whole collection definition; unknown keys are dropped and every value is forced into range. */
	public static function definition( $raw ): array {
		$raw = is_array( $raw ) ? $raw : [];
		$label = self::text( $raw['label'] ?? '', 60 );
		$slug = self::slug( '' !== (string) ( $raw['slug'] ?? '' ) ? $raw['slug'] : $label );
		$used = [];
		$budget = self::MAX_FIELDS;
		$fields = self::clean_tree( $raw['fields'] ?? [], $used, $budget );

		$statuses = self::clean_statuses( $raw['statuses'] ?? [] );

		if ( ! $statuses ) {
			$statuses = [ [ 'key' => 'new', 'label' => self::t( 'New' ), 'color' => 'primary' ] ];
		}

		$status_keys = array_column( $statuses, 'key' );
		$default_status = in_array( $raw['default_status'] ?? '', $status_keys, true ) ? $raw['default_status'] : $status_keys[0];
		$titles = array_values( array_filter( self::flat( $fields ), static function ( $field ) {
			return ( self::is_scalar_type( $field['type'] ) || 'name' === $field['type'] ) && 'hidden' !== $field['type'];
		} ) );
		$title_keys = array_column( $titles, 'key' );
		$title_field = in_array( $raw['title_field'] ?? '', $title_keys, true ) ? $raw['title_field'] : ( $title_keys[0] ?? '' );

		return [
			'slug' => $slug,
			'label' => $label,
			'singular' => self::text( $raw['singular'] ?? '', 60 ) ?: $label,
			'description' => self::text( $raw['description'] ?? '', 200 ),
			'icon' => self::icon( $raw['icon'] ?? '' ),
			'title_field' => $title_field,
			'default_status' => $default_status,
			'public_form' => ! empty( $raw['public_form'] ),
			'public_list' => ! empty( $raw['public_list'] ),
			'success_message' => self::text( $raw['success_message'] ?? '', 300 ) ?: self::t( 'Thank you. We received your submission.' ),
			'fields' => $fields,
			'statuses' => $statuses,
			'style' => Style::clean( $raw['style'] ?? [] ),
			'type_styles' => Field_Style::clean_types( $raw['type_styles'] ?? [] ),
			'settings' => Settings::clean( $raw['settings'] ?? [] ),
		];
	}

	/** Only icons bundled with the plugin are accepted; the admin falls back to a default when it is missing. */
	public static function icon( $value ): string {
		return preg_match( '/^[a-z0-9][a-z0-9-]*$/', (string) $value ) ? (string) $value : 'grid-view';
	}

	public static function field( array $definition, string $key ): ?array {
		foreach ( self::walk( $definition['fields'] ) as $field ) {
			if ( $field['key'] === $key ) {
				return $field;
			}
		}

		return null;
	}

	public static function status( array $definition, string $key ): ?array {
		foreach ( $definition['statuses'] as $status ) {
			if ( $status['key'] === $key ) {
				return $status;
			}
		}

		return null;
	}

	/**
	 * Validate and normalise the submitted values of one record.
	 *
	 * Fields hidden by their visibility rules are skipped: never required, never stored. Group values are keyed by
	 * their children, repeater values are a list of rows, and file values come from $files (already checked and stored
	 * by Uploads; the form post never supplies them).
	 *
	 * @param array $definition A cleaned definition.
	 * @param array $input      Raw values keyed by field key (typically unslashed $_POST data).
	 * @param array $only       When set, only these top-level field keys are read.
	 * @param array $files      Accepted file descriptors, keyed by field path ("photo", "group.photo").
	 *
	 * @return array{values:array,errors:array<string,string>} Errors are keyed by field path ("key", "group.child", "rows.0.child").
	 */
	public static function validate( array $definition, array $input, array $only = [], array $files = [] ): array {
		self::$money = Money::config( $definition['settings'] ?? [] );
		$values = [];
		$errors = [];
		$hidden = [];

		self::validate_scope( $definition['fields'], $input, $input, '', $only, $files, $values, $errors, $hidden );
		self::totals( $definition, $values, $hidden );

		return [ 'values' => $values, 'errors' => $errors ];
	}

	/** Value of a field as the visibility rules see it: hidden fields count as empty. */
	private static function seen( array $scope, array $root, array $hidden, string $key ) {
		if ( isset( $hidden[ $key ] ) ) {
			return '';
		}

		$value = $scope[ $key ] ?? ( $root[ $key ] ?? '' );

		return is_array( $value ) ? array_values( array_map( 'strval', array_filter( $value, 'is_scalar' ) ) ) : ( is_scalar( $value ) ? (string) $value : '' );
	}

	/** The money format of the form being validated, so amounts typed with its separators are understood. */
	private static $money = null;

	private static function validate_scope( array $fields, array $scope, array $root, string $path, array $only, array $files, array &$values, array &$errors, array &$hidden ): void {
		foreach ( $fields as $field ) {
			$key = $field['key'];

			// Accordion, Tabs and panels only arrange fields: the fields inside are read as if they sat in this scope.
			if ( self::is_transparent( $field['type'] ) ) {
				$see = static function ( string $name ) use ( $scope, $root, &$hidden ) {
					return self::seen( $scope, $root, $hidden, $name );
				};

				if ( Conditions::is_visible( $field['conditions'], $see ) ) {
					self::validate_scope( $field['children'], $scope, $root, $path, $only, $files, $values, $errors, $hidden );
				} else {
					foreach ( self::walk( $field['children'] ) as $inner ) {
						$hidden[ $inner['key'] ] = true;
					}
				}

				continue;
			}

			if ( ! self::has_value( $field['type'] ) || ( '' === $path && $only && ! in_array( $key, $only, true ) ) ) {
				continue;
			}

			$lookup = static function ( string $name ) use ( $scope, $root, &$hidden ) {
				return self::seen( $scope, $root, $hidden, $name );
			};

			if ( ! Conditions::is_visible( $field['conditions'], $lookup ) ) {
				$hidden[ $key ] = true;
				continue;
			}

			$here = '' === $path ? $key : $path . '.' . $key;
			$raw = $scope[ $key ] ?? null;

			if ( 'choice_set' === $field['type'] ) {
				$result = self::validate_cards( $field, $raw, $scope, $root, $hidden );
				$values[ $key ] = $result['value'];

				if ( null !== $result['error'] ) {
					$errors[ $here ] = $result['error'];
				}

				continue;
			}

			if ( 'group' === $field['type'] ) {
				$child_values = [];
				self::validate_scope( $field['children'], is_array( $raw ) ? $raw : [], $root, $here, [], $files, $child_values, $errors, $hidden );
				$values[ $key ] = $child_values;
				continue;
			}

			if ( 'repeater' === $field['type'] ) {
				$values[ $key ] = self::validate_rows( $field, is_array( $raw ) ? $raw : [], $root, $here, $files, $errors, $hidden );
				continue;
			}

			if ( 'name' === $field['type'] ) {
				$result = self::validate_name( $field, is_array( $raw ) ? $raw : [] );
				$values[ $key ] = $result['value'];

				if ( null !== $result['error'] ) {
					$errors[ $here ] = $result['error'];
				}

				continue;
			}

			if ( 'file' === $field['type'] || 'signature' === $field['type'] ) {
				$list = isset( $files[ $here ] ) && is_array( $files[ $here ] ) ? array_values( $files[ $here ] ) : [];
				$values[ $key ] = $list;

				if ( ! $list && $field['required'] ) {
					$errors[ $here ] = 'signature' === $field['type'] ? self::t( 'Please sign above.' ) : self::t( 'Please choose a file.' );
				}

				continue;
			}

			if ( 'hidden' === $field['type'] ) {
				$values[ $key ] = self::text( $raw ?? $field['default'], 255 );
				continue;
			}

			// A total is never read from the post: the server works it out once every answer is known (totals()).
			if ( 'total' === $field['type'] ) {
				$values[ $key ] = '';
				continue;
			}

			$result = self::clean_value( $field, $raw ?? ( 'toggle' === $field['type'] ? '0' : '' ) );

			if ( null === $result['error'] && $result['empty'] && $field['required'] ) {
				$result['error'] = self::t( 'This field is required.' );
			}

			if ( null !== $result['error'] ) {
				$errors[ $here ] = $result['error'];
			}

			$values[ $key ] = $result['value'];
		}
	}

	/**
	 * The picked cards of a choice set. Only cards that exist (and are visible) can be picked, and what is stored comes
	 * from the definition (title, price), never from the post, so a visitor can not change a price.
	 *
	 * @return array{value:array<int,array<string,mixed>>,error:?string}
	 */
	private static function validate_cards( array $set, $raw, array $scope, array $root, array $hidden ): array {
		$posted = array_values( array_unique( array_map( 'strval', array_filter( (array) $raw, 'is_scalar' ) ) ) );
		$picked = [];

		foreach ( $set['children'] as $card ) {
			$see = static function ( string $name ) use ( $scope, $root, &$hidden ) {
				return self::seen( $scope, $root, $hidden, $name );
			};

			if ( ! in_array( $card['key'], $posted, true ) || ! Conditions::is_visible( $card['conditions'], $see ) ) {
				continue;
			}

			$picked[] = [ 'key' => $card['key'], 'title' => $card['label'], 'price' => $card['card_price'], 'per' => $card['per'] ];

			if ( ! $set['multiple'] ) {
				break;
			}
		}

		if ( $posted && ! $picked ) {
			return [ 'value' => [], 'error' => self::t( 'Choose one of the listed options.' ) ];
		}

		return [ 'value' => $picked, 'error' => ! $picked && $set['required'] ? self::t( 'This field is required.' ) : null ];
	}

	/** @return array{value:array<string,string>,error:?string} */
	private static function validate_name( array $field, array $raw ): array {
		$value = [];
		$missing = false;

		foreach ( self::NAME_PARTS as $part ) {
			if ( ! in_array( $part, $field['parts'], true ) ) {
				continue;
			}

			$value[ $part ] = self::text( $raw[ $part ] ?? '', 80 );

			// A required name needs a first and a last name (when it has them); prefix and middle name stay optional.
			if ( $field['required'] && '' === $value[ $part ] && in_array( $part, [ 'first', 'last' ], true ) ) {
				$missing = true;
			}
		}

		return [ 'value' => $value, 'error' => $missing ? self::t( 'This field is required.' ) : null ];
	}

	private static function validate_rows( array $field, array $rows, array $root, string $path, array $files, array &$errors, array &$hidden ): array {
		$clean = [];

		foreach ( array_values( $rows ) as $row ) {
			if ( ! is_array( $row ) || count( $clean ) >= $field['max_rows'] ) {
				continue;
			}

			$index = count( $clean );
			$row_values = [];
			$row_errors = [];
			$row_hidden = [];
			self::validate_scope( $field['children'], $row, $root, $path . '.' . $index, [], $files, $row_values, $row_errors, $row_hidden );

			// A row nobody touched (every answer empty) is dropped instead of reported.
			$filled = array_filter( $row_values, static function ( $value ) {
				return is_array( $value ) ? (bool) array_filter( $value ) : ( '' !== $value && '0' !== $value );
			} );

			if ( ! $filled ) {
				continue;
			}

			$errors += $row_errors;
			$clean[] = $row_values;
		}

		$minimum = max( $field['min_rows'], $field['required'] ? 1 : 0 );

		if ( count( $clean ) < $minimum ) {
			$errors[ $path ] = sprintf( self::t( 'Add at least %d.' ), $minimum );
		}

		return $clean;
	}

	/** @return array{value:string|array,empty:bool,error:?string} */
	private static function clean_value( array $field, $raw ): array {
		$type = $field['type'];
		$out = static function ( $value, bool $empty, ?string $error = null ): array {
			return [ 'value' => $value, 'empty' => $empty, 'error' => $error ];
		};

		if ( 'checkbox' === $type ) {
			$allowed = array_column( $field['options'], 'value' );
			$picked = array_values( array_intersect( $allowed, array_map( 'strval', (array) $raw ) ) );

			return $out( $picked, ! $picked );
		}

		if ( is_array( $raw ) ) {
			return $out( '', true, self::t( 'This value is not valid.' ) );
		}

		$value = 'textarea' === $type ? self::textarea( $raw ) : self::text( $raw );

		if ( 'toggle' === $type ) {
			$on = in_array( (string) $raw, [ '1', 'on', 'yes', 'true' ], true );

			return $out( $on ? '1' : '0', ! $on );
		}

		if ( '' === $value ) {
			return $out( '', true );
		}

		switch ( $type ) {
			case 'number':
			case 'currency':
			case 'rating':
				$normalised = 'currency' === $type ? Money::parse( $value, self::$money ?? Money::config( [] ) ) : str_replace( ',', '', $value );

				if ( null === $normalised || ! is_numeric( $normalised ) ) {
					return $out( $value, false, self::t( 'Enter a number.' ) );
				}

				$number = (float) $normalised;
				$min = 'rating' === $type ? 1.0 : $field['min'];
				$max = 'rating' === $type ? 5.0 : $field['max'];

				if ( null !== $min && $number < $min ) {
					return $out( $value, false, sprintf( self::t( 'The lowest allowed value is %s.' ), self::number_text( $min ) ) );
				}

				if ( null !== $max && $number > $max ) {
					return $out( $value, false, sprintf( self::t( 'The highest allowed value is %s.' ), self::number_text( $max ) ) );
				}

				if ( 'rating' === $type ) {
					return $out( (string) (int) round( $number ), false );
				}

				return $out( 'currency' === $type ? number_format( $number, 2, '.', '' ) : self::number_text( $number ), false );

			case 'email':
				return false === filter_var( $value, FILTER_VALIDATE_EMAIL )
					? $out( $value, false, self::t( 'Enter a valid email address.' ) )
					: $out( $value, false );

			case 'phone':
				return 1 === preg_match( '/^[0-9+()\-.\s]{5,30}$/', $value )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Enter a valid phone number.' ) );

			case 'url':
				$scheme = strtolower( (string) parse_url( $value, PHP_URL_SCHEME ) );

				return false !== filter_var( $value, FILTER_VALIDATE_URL ) && in_array( $scheme, [ 'http', 'https' ], true )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Enter a link that starts with http:// or https://.' ) );

			case 'date':
				return self::valid_date( 'Y-m-d', $value )
					? $out( $value, false, self::when_problem( $field, $value, '' ) )
					: $out( $value, false, self::t( 'Enter a valid date.' ) );

			case 'time':
				return self::valid_date( 'H:i', $value )
					? $out( $value, false, self::when_problem( $field, '', $value ) )
					: $out( $value, false, self::t( 'Enter a valid time.' ) );

			case 'datetime':
				$value = str_replace( ' ', 'T', $value );

				return self::valid_date( 'Y-m-d\TH:i', $value )
					? $out( $value, false, self::when_problem( $field, substr( $value, 0, 10 ), substr( $value, 11, 5 ) ) )
					: $out( $value, false, self::t( 'Enter a valid date and time.' ) );

			case 'country':
				$code = strtoupper( $value );

				return Countries::valid( $code )
					? $out( $code, false )
					: $out( $value, false, self::t( 'Choose a country from the list.' ) );

			case 'select':
			case 'radio':
				return in_array( $value, array_column( $field['options'], 'value' ), true )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Choose one of the listed options.' ) );
		}

		return $out( $value, false );
	}

	/** "Now" in the site's time zone; tests set it. */
	public static $now = null;

	public static function now(): \DateTimeImmutable {
		if ( self::$now instanceof \DateTimeImmutable ) {
			return self::$now;
		}

		return new \DateTimeImmutable( 'now', function_exists( 'wp_timezone' ) ? wp_timezone() : null );
	}

	/** The first date and time a booking may take (now plus the notice), and the last date, as the browser needs them. */
	public static function when_limits( array $field ): array {
		$now = self::now();
		$earliest = $field['notice_hours'] > 0 ? $now->modify( '+' . $field['notice_hours'] . ' hours' ) : $now;

		// The browser counts the minute steps from the earliest time, so it starts on a step (19:37 with 15 minutes: 19:45).
		if ( $field['time_step'] > 0 ) {
			$minutes = (int) $earliest->format( 'H' ) * 60 + (int) $earliest->format( 'i' );
			$up = (int) ( ceil( $minutes / $field['time_step'] ) * $field['time_step'] ) - $minutes;
			$earliest = $earliest->modify( '+' . $up . ' minutes' );
		}

		return [
			'min_date' => $earliest->format( 'Y-m-d' ),
			'min_datetime' => $earliest->format( 'Y-m-d\TH:i' ),
			'max_date' => $field['max_days'] > 0 ? $now->modify( '+' . $field['max_days'] . ' days' )->format( 'Y-m-d' ) : '',
			'past' => $field['notice_hours'] > 0 || ! empty( $field['no_past'] ),
		];
	}

	/**
	 * Why a date and/or time can not be taken (closed day, too soon, too far ahead, outside the hours), or null.
	 *
	 * @param string $date "Y-m-d" or "".
	 * @param string $time "H:i" or "".
	 */
	public static function when_problem( array $field, string $date, string $time ): ?string {
		if ( '' !== $time && ( '' !== $field['time_min'] || '' !== $field['time_max'] ) ) {
			$from = '' !== $field['time_min'] ? $field['time_min'] : '00:00';
			$to = '' !== $field['time_max'] ? $field['time_max'] : '23:59';

			if ( $time < $from || $time > $to ) {
				return sprintf( self::t( 'Choose a time between %1$s and %2$s.' ), $from, $to );
			}
		}

		if ( '' === $date ) {
			return null;
		}

		$day = (int) gmdate( 'w', (int) strtotime( $date . ' 12:00:00 UTC' ) );

		if ( in_array( $day, $field['closed_days'], true ) ) {
			return self::t( 'That day is not available. Please choose another date.' );
		}

		$limits = self::when_limits( $field );

		if ( $field['notice_hours'] > 0 ) {
			if ( '' !== $time && 'datetime' === $field['type'] && $date . 'T' . $time < $limits['min_datetime'] ) {
				return sprintf( self::t( 'Please choose %s or later.' ), str_replace( 'T', ' ', $limits['min_datetime'] ) );
			}

			if ( $date < $limits['min_date'] ) {
				return sprintf( self::t( 'Please choose %s or later.' ), $limits['min_date'] );
			}
		}

		if ( '' !== $limits['max_date'] && $date > $limits['max_date'] ) {
			return sprintf( self::t( 'Please choose a date up to %s.' ), $limits['max_date'] );
		}

		return null;
	}

	/**
	 * The number a field adds to a Total: an amount or number as it is, a choice's own number (value|Label|number), the
	 * sum of picked choices or cards, 1 for a switched-on Yes / No; 0 otherwise.
	 */
	public static function number_of( ?array $field, $value ): float {
		if ( ! $field ) {
			return 0.0;
		}

		switch ( $field['type'] ) {
			case 'select':
			case 'radio':
			case 'checkbox':
				$sum = 0.0;

				foreach ( $field['options'] as $option ) {
					if ( in_array( $option['value'], array_map( 'strval', (array) $value ), true ) ) {
						$sum += null !== ( $option['number'] ?? null ) ? (float) $option['number'] : ( is_numeric( $option['value'] ) ? (float) $option['value'] : 0.0 );
					}
				}

				return $sum;
			case 'choice_set':
				return array_sum( array_map( static function ( $pick ) {
					return is_array( $pick ) && is_numeric( $pick['price'] ?? null ) ? (float) $pick['price'] : 0.0;
				}, (array) $value ) );
			case 'toggle':
				return '1' === (string) $value ? 1.0 : 0.0;
		}

		return is_scalar( $value ) && is_numeric( $value ) ? (float) $value : 0.0;
	}

	/**
	 * Works out the Total fields of the top level (and of Accordion, Tabs and Columns there) from the stored values:
	 * the formula of the first rule that matches, else the main formula. A total no formula gives is left empty.
	 */
	private static function totals( array $definition, array &$values, array $hidden ): void {
		$by_key = [];

		foreach ( self::walk( $definition['fields'] ) as $field ) {
			$by_key[ $field['key'] ] = $field;
		}

		$lookup = static function ( string $key ) use ( &$values, $by_key ) {
			$value = $values[ $key ] ?? '';

			if ( 'choice_set' === ( $by_key[ $key ]['type'] ?? '' ) ) {
				return array_map( static function ( $pick ) {
					return (string) ( $pick['key'] ?? '' );
				}, (array) $value );
			}

			return is_array( $value ) ? array_values( array_map( 'strval', array_filter( $value, 'is_scalar' ) ) ) : (string) $value;
		};
		$number = static function ( string $key ) use ( &$values, $by_key ): float {
			return self::number_of( $by_key[ $key ] ?? null, $values[ $key ] ?? '' );
		};

		foreach ( self::flat( $definition['fields'] ) as $field ) {
			if ( 'total' !== $field['type'] || isset( $hidden[ $field['key'] ] ) ) {
				continue;
			}

			$formula = $field['formula'];

			foreach ( $field['rules'] as $rule ) {
				if ( Conditions::is_visible( $rule['conditions'], $lookup ) ) {
					$formula = $rule['formula'];
					break;
				}
			}

			$result = Formula::evaluate( $formula, $number );
			$values[ $field['key'] ] = null === $result ? '' : number_format( $result, 2, '.', '' );
		}
	}

	/** Multi-line plain text (an email message), cleaned like a long answer. */
	public static function textarea_text( $raw, int $max = 5000 ): string {
		return self::textarea( $raw, $max );
	}

	private static function textarea( $raw, int $max = 5000 ): string {
		$value = is_scalar( $raw ) ? (string) $raw : '';
		$value = strip_tags( str_replace( "\r\n", "\n", $value ) );
		$value = preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value );

		return trim( function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max ) );
	}

	private static function number_text( float $number ): string {
		return rtrim( rtrim( number_format( $number, 6, '.', '' ), '0' ), '.' );
	}

	private static function valid_date( string $format, string $value ): bool {
		$date = \DateTime::createFromFormat( '!' . $format, $value );

		return $date && $date->format( $format ) === $value;
	}

	/** Plain-text version of a stored value, for the CSV export, the search text and aria labels. */
	public static function display( array $field, $value ): string {
		if ( 'name' === $field['type'] ) {
			$words = [];

			foreach ( self::NAME_PARTS as $part ) {
				$word = is_array( $value ) ? trim( (string) ( $value[ $part ] ?? '' ) ) : '';

				if ( '' !== $word ) {
					$words[] = $word;
				}
			}

			return implode( ' ', $words );
		}

		if ( 'country' === $field['type'] ) {
			return '' === (string) $value ? '' : ( Countries::name( (string) $value ) ?: (string) $value );
		}

		if ( 'signature' === $field['type'] ) {
			return $value ? self::t( 'Signed' ) : '';
		}

		if ( 'file' === $field['type'] ) {
			return implode( ', ', array_filter( array_map( static function ( $file ) {
				return is_array( $file ) ? (string) ( $file['name'] ?? '' ) : '';
			}, (array) $value ) ) );
		}

		if ( 'choice_set' === $field['type'] ) {
			return implode( ', ', array_filter( array_map( static function ( $pick ) {
				return is_array( $pick ) ? (string) ( $pick['title'] ?? '' ) : (string) $pick;
			}, is_array( $value ) ? $value : [] ) ) );
		}

		if ( 'group' === $field['type'] ) {
			return self::summary( $field['children'], is_array( $value ) ? $value : [], '; ', true );
		}

		if ( 'repeater' === $field['type'] ) {
			$rows = array_map( function ( $row ) use ( $field ) {
				return self::summary( $field['children'], is_array( $row ) ? $row : [], ', ', false );
			}, is_array( $value ) ? $value : [] );

			return implode( ' | ', array_filter( $rows ) );
		}

		if ( is_array( $value ) ) {
			$labels = [];

			foreach ( $value as $item ) {
				$labels[] = self::option_label( $field, (string) $item );
			}

			return implode( ', ', $labels );
		}

		$value = (string) $value;

		if ( 'toggle' === $field['type'] ) {
			return '1' === $value ? self::t( 'Yes' ) : self::t( 'No' );
		}

		if ( in_array( $field['type'], [ 'select', 'radio' ], true ) ) {
			return self::option_label( $field, $value );
		}

		if ( 'rating' === $field['type'] && '' !== $value ) {
			return $value . ' / 5';
		}

		return $value;
	}

	private static function summary( array $children, array $values, string $glue, bool $labelled ): string {
		$parts = [];

		foreach ( self::flat( $children ) as $child ) {
			if ( ! self::has_value( $child['type'] ) || 'hidden' === $child['type'] ) {
				continue;
			}

			$text = self::display( $child, $values[ $child['key'] ] ?? '' );

			if ( '' !== $text && ! ( 'toggle' === $child['type'] && '0' === (string) ( $values[ $child['key'] ] ?? '' ) ) ) {
				$parts[] = $labelled ? $child['label'] . ': ' . $text : $text;
			}
		}

		return implode( $glue, $parts );
	}

	private static function option_label( array $field, string $value ): string {
		foreach ( $field['options'] as $option ) {
			if ( $option['value'] === $value ) {
				return $option['label'];
			}
		}

		return $value;
	}

	/** The words the list search looks through. */
	public static function search_text( array $definition, array $values ): string {
		$parts = [];

		foreach ( self::value_fields( $definition ) as $field ) {
			$text = self::display( $field, $values[ $field['key'] ] ?? '' );

			if ( '' !== $text && 'toggle' !== $field['type'] && 'hidden' !== $field['type'] && 'signature' !== $field['type'] ) {
				$parts[] = $text;
			}
		}

		return implode( "\n", $parts );
	}

	/** The title of a record: its title field, else the first filled text-like field, else "#id". */
	public static function title( array $definition, array $values, int $id = 0 ): string {
		$candidates = array_merge( [ $definition['title_field'] ], array_column( self::value_fields( $definition ), 'key' ) );

		foreach ( $candidates as $key ) {
			$field = self::field( $definition, (string) $key );
			$text = $field && ( self::is_scalar_type( $field['type'] ) || 'name' === $field['type'] ) && ! in_array( $field['type'], [ 'toggle', 'hidden' ], true ) ? self::text( self::display( $field, $values[ $key ] ?? '' ), 120 ) : '';

			if ( '' !== $text ) {
				return $text;
			}
		}

		return $id ? '#' . $id : self::t( 'Untitled' );
	}

	/** CSV columns: one per stored value, group children get their own column ("Group > Child"). */
	public static function csv_columns( array $definition ): array {
		$columns = [];

		foreach ( self::value_fields( $definition ) as $field ) {
			if ( 'group' === $field['type'] ) {
				foreach ( self::flat( $field['children'] ) as $child ) {
					if ( self::has_value( $child['type'] ) ) {
						$columns[] = [ 'label' => $field['label'] . ' > ' . $child['label'], 'field' => $child, 'path' => [ $field['key'], $child['key'] ] ];
					}
				}
			} else {
				$columns[] = [ 'label' => $field['label'], 'field' => $field, 'path' => [ $field['key'] ] ];
			}
		}

		return $columns;
	}

	/**
	 * CSV rows (header first). Cells that start with = + - @ get a leading apostrophe so spreadsheets never run them.
	 *
	 * @param array[] $records Each: id, status, created, values.
	 */
	public static function csv_rows( array $definition, array $records ): array {
		$columns = self::csv_columns( $definition );
		$header = [ 'ID' ];

		foreach ( $columns as $column ) {
			$header[] = $column['label'];
		}

		$header[] = self::t( 'Status' );
		$header[] = self::t( 'Created' );
		$rows = [ $header ];

		foreach ( $records as $record ) {
			$row = [ (string) $record['id'] ];

			foreach ( $columns as $column ) {
				$value = $record['values'];

				foreach ( $column['path'] as $step ) {
					$value = is_array( $value ) ? ( $value[ $step ] ?? '' ) : '';
				}

				$row[] = self::csv_cell( self::display( $column['field'], $value ) );
			}

			$status = self::status( $definition, (string) $record['status'] );
			$row[] = self::csv_cell( $status ? $status['label'] : (string) $record['status'] );
			$row[] = (string) $record['created'];
			$rows[] = $row;
		}

		return $rows;
	}

	public static function csv_cell( string $text ): string {
		return 1 === preg_match( '/^[=+\-@\t\r]/', $text ) ? "'" . $text : $text;
	}

	/** Two letters for the round avatar in the table (Metronic symbol). */
	public static function initials( string $text ): string {
		$words = preg_split( '/\s+/', trim( $text ) );
		$letters = '';

		foreach ( array_slice( array_filter( (array) $words ), 0, 2 ) as $word ) {
			$letters .= function_exists( 'mb_substr' ) ? mb_substr( $word, 0, 1 ) : substr( $word, 0, 1 );
		}

		$letters = function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $letters ) : strtoupper( $letters );

		return '' === $letters ? '#' : $letters;
	}
}

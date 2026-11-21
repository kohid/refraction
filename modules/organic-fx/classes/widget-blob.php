<?php
namespace Refraction\Modules\OrganicFx\Classes;

use Refraction\Controls_Manager;
use Refraction\Modules\OrganicFx\Module as OrganicFx;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Deco Blob and Grain of our widgets (0.136.0), with the same settings as a container's Deco Blob and Grain:
 * shape (built-in or uploaded), look (solid, outline, solid with an offset outline), grain on the shape and / or on
 * the widget's fill (texture, colour, amount, size, pattern, blend), and a hover morph into another shape (built-in or
 * uploaded). Phone Showcase and Showcase Wheel use it; placement, size and motion stay each widget's own.
 *
 * The markup is drawn here (the shape is there with no script); organic-fx.js paints the grain textures (the same
 * textures as a container's grain), clips the shape's grain to the shape and runs the morph.
 *
 * Settings of one blob, by key (each widget passes its own names): source, shape, mine, style, line, line_width,
 * line_shape, morph,
 * morph_source, morph_shape, morph_mine, morph_ms. Grain settings, by prefix: {g}_where, {g}_texture, {g}_color,
 * {g}_amount, {g}_scale, {g}_pattern, {g}_blend.
 */
class Widget_Blob {

	/** The keys of a blob's settings, made from a prefix (a widget can name some of them otherwise). */
	public static function keys( string $p, array $own = [] ): array {
		return $own + [
			'source' => $p . '_source',
			'shape' => $p . '_shape',
			'mine' => $p . '_mine',
			'style' => $p . '_style',
			'line' => $p . '_line',
			'line_width' => $p . '_line_width',
			'line_shape' => $p . '_line_shape',
			'morph' => $p . '_morph',
			'morph_source' => $p . '_morph_source',
			'morph_shape' => $p . '_morph_shape',
			'morph_mine' => $p . '_morph_mine',
			'morph_ms' => $p . '_morph_ms',
		];
	}

	// ---------------------------------------------------------------- controls

	/** Built-in / Uploaded tabs, the two pickers and the library button, as a container's Deco Blob has. */
	public static function shape_controls( $stack, string $source, string $builtin, string $mine, array $condition, string $label = '' ): void {
		$stack->add_control( $source, [
			'label' => '' !== $label ? $label : esc_html__( 'Shape', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [ 'builtin' => [ 'title' => esc_html__( 'Built-in', 'refraction' ) ], 'mine' => [ 'title' => esc_html__( 'Uploaded', 'refraction' ) ] ],
			'default' => 'builtin',
			'toggle' => false,
			'label_block' => true,
			'classes' => 'rf-shape-tabs',
			'condition' => $condition,
		] );

		$stack->add_control( $builtin, [
			'label' => esc_html__( 'Built-in shapes', 'refraction' ),
			'type' => Controls_Manager::VISUAL_CHOICE,
			'label_block' => true,
			'columns' => 4,
			'toggle' => false,
			'options' => OrganicFx::builtin_choices(),
			'default' => 'blob-1',
			'condition' => $condition + [ $source . '!' => 'mine' ],
		] );

		$stack->add_control( $mine . '_upload', [
			'type' => Controls_Manager::BUTTON,
			'label' => esc_html__( 'Your shapes', 'refraction' ),
			'text' => esc_html__( 'Upload or manage', 'refraction' ),
			'event' => 'refraction:organicLibrary:' . $mine,
			'description' => esc_html__( 'The same shapes as Deco Blob and Shape Mask. Add an SVG (a file or pasted code), rename or delete your shapes.', 'refraction' ),
			'condition' => $condition + [ $source => 'mine' ],
		] );

		$stack->add_control( $mine, [
			'label' => esc_html__( 'Uploaded shapes', 'refraction' ),
			'type' => Controls_Manager::VISUAL_CHOICE,
			'label_block' => true,
			'columns' => 4,
			'toggle' => false,
			'options' => self::mine_choices(),
			'condition' => $condition + [ $source => 'mine' ],
		] );
	}

	/**
	 * Style (solid, outline, both), outline colour, width and shape, and the fill colour when $color is given.
	 *
	 * @param string $sel The blob's selector (e.g. '{{WRAPPER}} .rf-wblob').
	 */
	public static function look_controls( $stack, array $k, string $sel, array $condition, string $color = '' ): void {
		$stack->add_control( $k['style'], [
			'label' => esc_html__( 'Style', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'solid',
			'options' => [ 'solid' => esc_html__( 'Solid', 'refraction' ), 'outline' => esc_html__( 'Outline', 'refraction' ), 'both' => esc_html__( 'Solid with an offset outline', 'refraction' ) ],
			'condition' => $condition,
		] );

		if ( '' !== $color ) {
			$stack->add_control( $color, [
				'label' => esc_html__( 'Colour', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#F6C94A',
				'selectors' => [ $sel => '--rf-wblob-c: {{VALUE}};' ],
				'condition' => $condition + [ $k['style'] . '!' => 'outline' ],
			] );
		}

		$line = $condition + [ $k['style'] . '!' => 'solid' ];
		$stack->add_control( $k['line'], [ 'label' => esc_html__( 'Outline Colour', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#1E1E1E', 'selectors' => [ $sel => '--rf-wblob-line: {{VALUE}};' ], 'condition' => $line ] );
		$stack->add_control( $k['line_width'], [ 'label' => esc_html__( 'Outline Width', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.5, 'max' => 10, 'step' => 0.5 ] ], 'default' => [ 'unit' => 'px', 'size' => 2 ], 'selectors' => [ $sel => '--rf-wblob-lw: {{SIZE}}px;' ], 'condition' => $line ] );
		$stack->add_control( $k['line_shape'], [ 'label' => esc_html__( 'Outline Shape', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'blob-2', 'options' => self::shape_select(), 'description' => esc_html__( 'A different shape reads hand-drawn.', 'refraction' ), 'condition' => $condition + [ $k['style'] => 'both' ] ] );
	}

	/** On hover, the shape turns into another one (built-in or uploaded) and back when the pointer leaves. */
	public static function morph_controls( $stack, array $k, array $condition ): void {
		$stack->add_control( $k['morph'], [
			'label' => esc_html__( 'Morph On Hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'The shape turns into another one while the pointer is over it, and back after.', 'refraction' ),
			'separator' => 'before',
			'condition' => $condition,
		] );

		$on = $condition + [ $k['morph'] => 'yes' ];
		self::shape_controls( $stack, $k['morph_source'], $k['morph_shape'], $k['morph_mine'], $on, esc_html__( 'Into', 'refraction' ) );

		$stack->add_control( $k['morph_ms'], [
			'label' => esc_html__( 'Morph Duration (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 100,
			'max' => 5000,
			'step' => 50,
			'default' => 700,
			'condition' => $on,
		] );
	}

	/**
	 * Grain: where (the widget's fill, only on the blob's shape, or both) and the texture, as a container's Grain.
	 *
	 * @param string $sel    Where the custom properties go (the widget, e.g. '{{WRAPPER}}').
	 * @param array  $wheres The choices of "On" ( key => label ), without the empty one.
	 */
	public static function grain_controls( $stack, string $g, string $sel, array $wheres ): void {
		$stack->add_control( $g . '_where', [
			'label' => esc_html__( 'Grain', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'None', 'refraction' ) ] + $wheres,
			'description' => esc_html__( 'A film-like texture, on the fill, or only inside the Deco Blob\'s shape.', 'refraction' ),
		] );

		$on = [ $g . '_where!' => '' ];
		$stack->add_control( $g . '_texture', [ 'label' => esc_html__( 'Texture', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'film', 'options' => self::textures(), 'condition' => $on ] );
		$stack->add_control( $g . '_texture_upload', [ 'type' => Controls_Manager::BUTTON, 'label' => esc_html__( 'Your textures', 'refraction' ), 'text' => esc_html__( 'Upload or manage', 'refraction' ), 'event' => 'refraction:organicTextures:' . $g . '_texture', 'condition' => $on ] );
		$stack->add_control( $g . '_color', [ 'label' => esc_html__( 'Grain Colour', 'refraction' ), 'type' => Controls_Manager::COLOR, 'description' => esc_html__( 'Empty: dark ink.', 'refraction' ), 'condition' => $on ] );
		$stack->add_control( $g . '_amount', [ 'label' => esc_html__( 'Grain Amount', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.02, 'max' => 1, 'step' => 0.01 ] ], 'default' => [ 'size' => 0.25 ], 'selectors' => [ $sel => '--rf-wgrain-a: {{SIZE}};' ], 'condition' => $on ] );
		$stack->add_control( $g . '_scale', [ 'label' => esc_html__( 'Grain Size', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 1, 'max' => 100 ] ], 'default' => [ 'size' => 50 ], 'description' => esc_html__( 'Higher = coarser patches, lower = finer.', 'refraction' ), 'condition' => $on ] );
		$stack->add_control( $g . '_pattern', [ 'label' => esc_html__( 'Pattern', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 999, 'default' => 0, 'description' => esc_html__( '0 gives this widget its own random speckle. Any other number fixes the pattern.', 'refraction' ), 'condition' => $on ] );
		$stack->add_control( $g . '_blend', [ 'label' => esc_html__( 'Blend', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'multiply', 'options' => [ 'multiply' => esc_html__( 'Darken (multiply)', 'refraction' ), 'overlay' => esc_html__( 'Overlay', 'refraction' ), 'soft-light' => esc_html__( 'Soft light', 'refraction' ), 'screen' => esc_html__( 'Lighten (screen)', 'refraction' ), 'normal' => esc_html__( 'Normal', 'refraction' ) ], 'selectors' => [ $sel => '--rf-wgrain-blend: {{VALUE}};' ], 'condition' => $on ] );
	}

	// ---------------------------------------------------------------- shapes

	/** [ d, viewBox, fill rule ] of a shape id: built-in, uploaded (my-...), else the fallback built-in. */
	public static function shape_of( string $id, string $fallback = 'blob-1' ): array {
		if ( isset( Pure_Organic::SHAPES[ $id ] ) ) {
			return [ Pure_Organic::path( $id ), '0 0 100 100', 'nonzero' ];
		}

		$mine = ( new Shapes_Repository() )->all();

		if ( '' !== $id && isset( $mine[ $id ] ) ) {
			return [ $mine[ $id ]['d'], $mine[ $id ]['vb'], $mine[ $id ]['rule'] ];
		}

		return '' !== $fallback ? [ Pure_Organic::path( $fallback ), '0 0 100 100', 'nonzero' ] : [];
	}

	/** The shape a picker pair chose: the Uploaded tab's, else the Built-in one. */
	public static function chosen( array $s, string $source, string $builtin, string $mine ): string {
		return (string) ( 'mine' === ( $s[ $source ] ?? '' ) ? ( $s[ $mine ] ?? '' ) : ( $s[ $builtin ] ?? '' ) );
	}

	// ---------------------------------------------------------------- markup

	/** The grain settings for the script, or null when there is no grain at $where ('fill' or 'shape'). */
	public static function grain( array $s, string $g, string $where ): ?array {
		$at = (string) ( $s[ $g . '_where' ] ?? '' );

		if ( '' === $at || ( 'both' !== $at && $where !== $at ) ) {
			return null;
		}

		$texture = (string) ( $s[ $g . '_texture' ] ?? 'film' );

		return [
			't' => preg_match( '/^[a-z0-9-]+$/', $texture ) ? $texture : 'film',
			'c' => preg_match( '/^(#[0-9a-fA-F]{3,8}|rgba?\([0-9., ]+\))$/', (string) ( $s[ $g . '_color' ] ?? '' ) ) ? $s[ $g . '_color' ] : '',
			's' => max( 1, min( 100, (float) ( $s[ $g . '_scale' ]['size'] ?? 50 ) ) ),
			'p' => max( 0, min( 999, (int) ( $s[ $g . '_pattern' ] ?? 0 ) ) ),
		];
	}

	/** The grain over a widget's fill (behind its content). */
	public static function fill_grain_html( ?array $grain ): string {
		if ( ! $grain ) {
			return '';
		}

		return '<span class="rf-wgrain" aria-hidden="true" data-rf-wgrain="' . esc_attr( (string) wp_json_encode( $grain ) ) . '"></span>';
	}

	/**
	 * One blob: the shape (solid and / or outline), the grain inside it, and what the script needs for the morph.
	 *
	 * @param array      $s     The settings holding the blob's keys.
	 * @param array      $k     keys().
	 * @param array|null $grain grain( ..., 'shape' ).
	 * @param string     $class More classes.
	 * @param array|null $shape The shape when the widget works it out itself ( [ d, viewBox, rule ] ).
	 */
	public static function html( array $s, array $k, ?array $grain, string $class = '', ?array $shape = null ): string {
		$shape = $shape ? $shape : self::shape_of( self::chosen( $s, $k['source'], $k['shape'], $k['mine'] ) );
		$style = in_array( $s[ $k['style'] ] ?? '', [ 'outline', 'both' ], true ) ? $s[ $k['style'] ] : 'solid';
		$data = [];

		if ( 'yes' === ( $s[ $k['morph'] ] ?? '' ) ) {
			$into = self::shape_of( self::chosen( $s, $k['morph_source'], $k['morph_shape'], $k['morph_mine'] ), '' );

			if ( $into ) {
				$data['morph'] = [ 'd' => $into[0], 'vb' => $into[1], 'rule' => $into[2] ];
				$data['ms'] = max( 100, min( 5000, (int) ( $s[ $k['morph_ms'] ] ?? 700 ) ) );
			}
		}

		if ( $grain && 'outline' !== $style ) {
			$data['grain'] = $grain;
		}

		$svg = static function ( array $sh, string $cls ): string {
			return '<svg class="' . $cls . '" viewBox="' . esc_attr( $sh[1] ) . '" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path fill-rule="' . esc_attr( $sh[2] ) . '" d="' . esc_attr( $sh[0] ) . '"/></svg>';
		};

		$html = '<span class="rf-wblob rf-wblob--' . $style . ( '' !== $class ? ' ' . esc_attr( $class ) : '' ) . '" aria-hidden="true"' . ( $data ? ' data-rf-wblob="' . esc_attr( (string) wp_json_encode( $data ) ) . '"' : '' ) . '>';

		if ( 'outline' !== $style ) {
			$html .= $svg( $shape, 'rf-wblob__fill' );

			if ( isset( $data['grain'] ) ) {
				$html .= '<span class="rf-wblob__grain" style="' . esc_attr( '--rf-wblob-mask: url("' . self::mask_url( $shape ) . '")' ) . '"></span>';
			}
		}

		if ( 'outline' === $style ) {
			$html .= $svg( $shape, 'rf-wblob__line' );
		} elseif ( 'both' === $style ) {
			$html .= $svg( self::shape_of( (string) ( $s[ $k['line_shape'] ] ?? 'blob-2' ), 'blob-2' ), 'rf-wblob__line rf-wblob__line--offset' );
		}

		return $html . '</span>';
	}

	/** A shape as a mask image (data URI, stretched to the box). */
	public static function mask_url( array $shape ): string {
		return 'data:image/svg+xml,' . rawurlencode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' . $shape[1] . '" preserveAspectRatio="none"><path fill="#000" fill-rule="' . $shape[2] . '" d="' . $shape[0] . '"/></svg>' );
	}

	// ---------------------------------------------------------------- choices

	private static function mine_choices(): array {
		$out = [];

		foreach ( ( new Shapes_Repository() )->all() as $id => $shape ) {
			$out[ $id ] = [ 'title' => esc_html( $shape['name'] ), 'image' => OrganicFx::thumb( $shape['d'], $shape['vb'], $shape['rule'] ) ];
		}

		return $out;
	}

	/** Every shape as a plain select (the outline's other shape). */
	private static function shape_select(): array {
		$out = [];

		foreach ( Pure_Organic::SHAPES as $id => $name ) {
			$out[ $id ] = esc_html( $name );
		}

		foreach ( ( new Shapes_Repository() )->all() as $id => $shape ) {
			/* translators: %s: name of an uploaded shape. */
			$out[ $id ] = sprintf( esc_html__( 'My shape: %s', 'refraction' ), $shape['name'] );
		}

		return $out;
	}

	/** The grain textures: built in, then uploaded (tex-...). */
	private static function textures(): array {
		$out = [
			'film' => esc_html__( 'Film grain (classic)', 'refraction' ),
			'speckle' => esc_html__( 'Speckle', 'refraction' ),
			'chalk' => esc_html__( 'Distressed chalk', 'refraction' ),
			'brush' => esc_html__( 'Dry brush', 'refraction' ),
			'fibre' => esc_html__( 'Paper fibre', 'refraction' ),
			'halftone' => esc_html__( 'Halftone dots', 'refraction' ),
			'dispersion' => esc_html__( 'Dispersion (stipple fade)', 'refraction' ),
			'strokes' => esc_html__( 'Brush strokes', 'refraction' ),
			'splatter' => esc_html__( 'Grunge splatter', 'refraction' ),
			'scratches' => esc_html__( 'Scratches', 'refraction' ),
		];

		foreach ( ( new Textures_Repository() )->for_script() as $id => $t ) {
			/* translators: %s: name of an uploaded texture. */
			$out[ $id ] = sprintf( esc_html__( 'Uploaded: %s', 'refraction' ), $t['name'] );
		}

		return $out;
	}
}

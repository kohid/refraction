<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Core\Files\CSS\Post as Post_CSS;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Puts the winning header and footer into the theme.
 *
 * Classic themes: `get_header` / `get_footer` fire before header.php / footer.php load. We print the
 * document skeleton and our template, then load the theme file once into a discarded buffer, which
 * also marks it as loaded so WordPress' own `locate_template( ..., true, true )` does nothing.
 *
 * Block themes: the `core/template-part` blocks of the header and footer areas are replaced.
 *
 * A classic theme that calls refraction_theme_builder_header() itself declares
 * `add_theme_support( 'refraction-theme-builder' )` and gets no automatic takeover.
 */
class Theme_Integration {

	const THEME_SUPPORT = 'refraction-theme-builder';

	private Locations_Manager $locations;

	public function __construct( Locations_Manager $locations ) {
		$this->locations = $locations;

		add_action( 'wp', [ $locations, 'reset' ], 0 );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_template_styles' ], 20 );
		add_action( 'get_header', [ $this, 'takeover_header' ], 0, 2 );
		add_action( 'get_footer', [ $this, 'takeover_footer' ], 0, 2 );
		add_filter( 'template_include', [ $this, 'use_body_template' ], 15 );
		add_filter( 'pre_render_block', [ $this, 'replace_template_part' ], 10, 2 );
		add_action( 'refraction/theme_builder/render_header', [ $this, 'render_header_action' ] );
		add_action( 'refraction/theme_builder/render_footer', [ $this, 'render_footer_action' ] );
	}

	/** Load the templates' CSS in <head>, before the markup is printed. */
	public function enqueue_template_styles(): void {
		foreach ( array_keys( $this->locations->get_locations() ) as $location ) {
			$id = $this->locations->get_template_id( $location );

			if ( $id ) {
				Post_CSS::create( $id )->enqueue();
			}
		}
	}

	/**
	 * A Single, Archive, Search Results or Error 404 template that matches replaces the theme's page template
	 * with the Refraction Theme Builder page (header + template + footer).
	 */
	public function use_body_template( $template ) {
		if ( '' === $this->locations->get_body_location() ) {
			return $template;
		}

		$path = dirname( __DIR__ ) . '/templates/body.php';

		return is_readable( $path ) ? $path : $template;
	}

	private function is_classic_takeover_allowed(): bool {
		return ! wp_is_block_theme() && ! current_theme_supports( self::THEME_SUPPORT );
	}

	public function takeover_header( $name = null, $args = [] ): void {
		if ( ! $this->is_classic_takeover_allowed() ) {
			return;
		}

		if ( $this->locations->was_printed( Locations_Manager::HEADER ) ) {
			$this->discard_theme_file( 'header', $name, $args, 'wp_head' );

			return;
		}

		$markup = $this->locations->get_markup( Locations_Manager::HEADER );

		if ( '' === $markup ) {
			return;
		}

		$this->locations->mark_printed( Locations_Manager::HEADER );

		?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php
		wp_body_open();

		echo $markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built in Locations_Manager::get_markup().

		$this->discard_theme_file( 'header', $name, $args, 'wp_head', 'wp_body_open' );
	}

	public function takeover_footer( $name = null, $args = [] ): void {
		if ( ! $this->is_classic_takeover_allowed() ) {
			return;
		}

		if ( $this->locations->was_printed( Locations_Manager::FOOTER ) ) {
			$this->discard_theme_file( 'footer', $name, $args, 'wp_footer' );

			return;
		}

		$markup = $this->locations->get_markup( Locations_Manager::FOOTER );

		if ( '' === $markup ) {
			return;
		}

		$this->locations->mark_printed( Locations_Manager::FOOTER );

		echo $markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built in Locations_Manager::get_markup().

		wp_footer();

		echo "\n</body>\n</html>\n";

		$this->discard_theme_file( 'footer', $name, $args, 'wp_footer' );
	}

	/**
	 * Load the theme's header.php/footer.php so WordPress treats it as loaded, but throw its output away.
	 * The hooks the file would fire again are removed first; we already fired them.
	 */
	private function discard_theme_file( string $slug, $name, $args, string ...$hooks ): void {
		$templates = [];
		$name = (string) $name;

		if ( '' !== $name ) {
			$templates[] = "{$slug}-{$name}.php";
		}

		$templates[] = "{$slug}.php";

		foreach ( $hooks as $hook ) {
			remove_all_actions( $hook );
		}

		ob_start();
		locate_template( $templates, true, true, is_array( $args ) ? $args : [] );
		ob_end_clean();
	}

	/**
	 * @param string|null $pre          Short-circuit value.
	 * @param array       $parsed_block The block being rendered.
	 * @return string|null
	 */
	public function replace_template_part( $pre, $parsed_block ) {
		if ( null !== $pre || ! is_array( $parsed_block ) || 'core/template-part' !== ( $parsed_block['blockName'] ?? '' ) ) {
			return $pre;
		}

		$location = $this->get_template_part_location( (array) ( $parsed_block['attrs'] ?? [] ) );

		if ( '' === $location ) {
			return $pre;
		}

		if ( $this->locations->was_printed( $location ) ) {
			return $this->locations->get_template_id( $location ) ? '' : $pre;
		}

		$markup = $this->locations->get_markup( $location );

		if ( '' === $markup ) {
			return $pre;
		}

		$this->locations->mark_printed( $location );

		return $markup;
	}

	/** `header` or `footer` when the template part block belongs to that area, else an empty string. */
	private function get_template_part_location( array $attrs ): string {
		$area = $attrs['area'] ?? '';

		if ( '' === $area && ! empty( $attrs['slug'] ) ) {
			$theme = ! empty( $attrs['theme'] ) ? $attrs['theme'] : get_stylesheet();
			$template = get_block_template( $theme . '//' . $attrs['slug'], 'wp_template_part' );
			$area = $template && ! empty( $template->area ) ? $template->area : '';
		}

		return in_array( $area, [ Locations_Manager::HEADER, Locations_Manager::FOOTER ], true ) ? $area : '';
	}

	public function render_header_action(): void {
		$this->locations->print_location( Locations_Manager::HEADER );
	}

	public function render_footer_action(): void {
		$this->locations->print_location( Locations_Manager::FOOTER );
	}
}

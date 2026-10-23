<?php
namespace Refraction\Modules\CustomFonts\Classes;

use Refraction\Core\Utils\Icons;
use Refraction\Modules\CustomFonts\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction > Custom Fonts: list families with a live specimen, add fonts (several variations, four formats each),
 * delete a variation or a family. Every request checks the capability and a nonce.
 */
class Admin_Page {

	const SLUG = 'refraction-custom-fonts';

	private Fonts_Repository $repo;

	public function __construct( Fonts_Repository $repo ) {
		$this->repo = $repo;

		add_action( 'admin_post_refraction_fonts_add', [ $this, 'handle_add' ] );
		add_action( 'admin_post_refraction_fonts_delete', [ $this, 'handle_delete' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	public static function url( array $args = [] ): string {
		return add_query_arg( array_merge( [ 'page' => self::SLUG ], $args ), admin_url( 'admin.php' ) );
	}

	private function guard( string $action ): void {
		if ( ! current_user_can( Module::capability() ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'refraction' ), 403 );
		}

		check_admin_referer( $action );
	}

	private function back( string $type, string $message ): void {
		set_transient( 'refraction_fonts_notice_' . get_current_user_id(), [ $type, $message ], 60 );
		wp_safe_redirect( self::url() );
		exit;
	}

	public function handle_add(): void {
		$this->guard( 'refraction_fonts_add' );

		$family = Pure_Font_Face_Css::clean_family( isset( $_POST['family'] ) ? sanitize_text_field( wp_unslash( $_POST['family'] ) ) : '' );

		if ( '' === $family || '' === Fonts_Repository::slug_for( $family ) ) {
			$this->back( 'error', __( 'Give the font family a name made of letters, digits, spaces, dashes or underscores.', 'refraction' ) );
		}

		$post = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification -- checked in guard().
		$result = ( new Font_Upload() )->process( $family, $post, $_FILES );

		if ( '' !== $result['error'] ) {
			$this->back( 'error', $result['error'] );
		}

		$this->repo->add(
			$family,
			Pure_Font_Face_Css::clean_display( isset( $post['display'] ) ? (string) $post['display'] : '' ),
			! empty( $post['preload'] ),
			$result['variations']
		);
		Custom_Fonts_File::rebuild();

		/* translators: %s: font family name */
		$this->back( 'success', sprintf( __( '%s was saved. It now appears under "Custom Fonts" in every typography font list.', 'refraction' ), $family ) );
	}

	public function handle_delete(): void {
		$this->guard( 'refraction_fonts_delete' );

		$slug = isset( $_POST['family'] ) ? sanitize_key( wp_unslash( $_POST['family'] ) ) : '';
		$variation = isset( $_POST['variation'] ) ? sanitize_key( wp_unslash( $_POST['variation'] ) ) : '';

		if ( '' !== $variation ) {
			$this->repo->delete_variation( $slug, $variation );
		} else {
			$this->repo->delete_family( $slug );
		}

		Custom_Fonts_File::rebuild();
		$this->back( 'success', __( 'The font was deleted.', 'refraction' ) );
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, self::SLUG ) ) {
			return;
		}

		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_style( 'refraction-custom-fonts-admin', REFRACTION_ASSETS_URL . 'css/modules/custom-fonts/admin' . $min . '.css', [], REFRACTION_VERSION );

		$css_url = Custom_Fonts_File::url();

		if ( $css_url ) {
			wp_enqueue_style( 'refraction-custom-fonts', $css_url, [], null );
		}
	}

	public function render(): void {
		$notice = get_transient( 'refraction_fonts_notice_' . get_current_user_id() );
		delete_transient( 'refraction_fonts_notice_' . get_current_user_id() );
		$families = $this->repo->all();
		$weights = [ '100' => 'Thin 100', '200' => 'Extra light 200', '300' => 'Light 300', '400' => 'Regular 400', '500' => 'Medium 500', '600' => 'Semi bold 600', '700' => 'Bold 700', '800' => 'Extra bold 800', '900' => 'Black 900' ];
		?>
		<div class="wrap rf-cf">
			<h1 class="rf-cf__title"><?php $this->icon( 'font-download', [ 'size' => 28 ] ); ?><?php esc_html_e( 'Custom Fonts', 'refraction' ); ?></h1>
			<p class="rf-cf__lead"><?php esc_html_e( 'Upload your own web fonts. They load from your site, never from another server, and show up under "Custom Fonts" in every typography font list.', 'refraction' ); ?></p>

			<?php if ( is_array( $notice ) ) : ?>
				<div class="rf-cf__notice rf-cf__notice--<?php echo esc_attr( 'success' === $notice[0] ? 'success' : 'error' ); ?>" role="<?php echo 'error' === $notice[0] ? 'alert' : 'status'; ?>">
					<?php $this->icon( 'success' === $notice[0] ? 'check-circle' : 'error', [ 'size' => 20 ] ); ?>
					<span><?php echo esc_html( (string) $notice[1] ); ?></span>
				</div>
			<?php endif; ?>

			<div class="rf-cf__grid">
				<section class="rf-cf__list" aria-labelledby="rf-cf-list-title">
					<h2 id="rf-cf-list-title"><?php esc_html_e( 'Your fonts', 'refraction' ); ?></h2>
					<?php if ( ! $families ) : ?>
						<p class="rf-cf__empty"><?php esc_html_e( 'No custom fonts yet. Add a font family on the right to get started.', 'refraction' ); ?></p>
					<?php endif; ?>
					<?php foreach ( $families as $slug => $family ) : ?>
						<article class="rf-cf__family" data-family="<?php echo esc_attr( $family['family'] ); ?>">
							<header>
								<h3><?php echo esc_html( $family['family'] ); ?></h3>
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('<?php echo esc_js( __( 'Delete this font family and all its files?', 'refraction' ) ); ?>');">
									<?php wp_nonce_field( 'refraction_fonts_delete' ); ?>
									<input type="hidden" name="action" value="refraction_fonts_delete">
									<input type="hidden" name="family" value="<?php echo esc_attr( $slug ); ?>">
									<button type="submit" class="button-link rf-cf__delete"><?php $this->icon( 'delete', [ 'size' => 18 ] ); ?><?php esc_html_e( 'Delete family', 'refraction' ); ?></button>
								</form>
							</header>
							<p class="rf-cf__specimen" style="font-family:'<?php echo esc_attr( $family['family'] ); ?>',sans-serif;"><?php esc_html_e( 'Pack my box with five dozen liquor jugs', 'refraction' ); ?></p>
							<ul class="rf-cf__variations">
								<?php foreach ( $family['variations'] as $vid => $v ) : ?>
									<li>
										<span class="rf-cf__chip"><?php echo esc_html( $v['weight'] . ' ' . $v['style'] ); ?></span>
										<span class="rf-cf__formats"><?php echo esc_html( implode( ', ', array_keys( $v['files'] ) ) ); ?></span>
										<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
											<?php wp_nonce_field( 'refraction_fonts_delete' ); ?>
											<input type="hidden" name="action" value="refraction_fonts_delete">
											<input type="hidden" name="family" value="<?php echo esc_attr( $slug ); ?>">
											<input type="hidden" name="variation" value="<?php echo esc_attr( $vid ); ?>">
											<button type="submit" class="button-link rf-cf__delete" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: weight and style */ __( 'Delete variation %s', 'refraction' ), $v['weight'] . ' ' . $v['style'] ) ); ?>"><?php $this->icon( 'delete', [ 'size' => 18 ] ); ?></button>
										</form>
									</li>
								<?php endforeach; ?>
							</ul>
							<p class="rf-cf__meta"><?php echo esc_html( sprintf( /* translators: 1: font-display value */ __( 'font-display: %1$s%2$s', 'refraction' ), $family['display'], $family['preload'] ? ' · ' . __( 'preloaded', 'refraction' ) : '' ) ); ?></p>
						</article>
					<?php endforeach; ?>
				</section>

				<section class="rf-cf__add" aria-labelledby="rf-cf-add-title">
					<h2 id="rf-cf-add-title"><?php esc_html_e( 'Add a font', 'refraction' ); ?></h2>
					<form method="post" enctype="multipart/form-data" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="rf-cf-form">
						<?php wp_nonce_field( 'refraction_fonts_add' ); ?>
						<input type="hidden" name="action" value="refraction_fonts_add">
						<input type="hidden" name="rows" id="rf-cf-rows" value="1">

						<p class="rf-cf__field">
							<label for="rf-cf-family"><?php esc_html_e( 'Font family name', 'refraction' ); ?></label>
							<input type="text" id="rf-cf-family" name="family" required maxlength="60" placeholder="<?php esc_attr_e( 'Acme Sans', 'refraction' ); ?>">
							<span class="description"><?php esc_html_e( 'Adding to an existing family name adds variations to it.', 'refraction' ); ?></span>
						</p>

						<div id="rf-cf-variations">
							<?php $this->render_variation_row( 0, $weights ); ?>
						</div>

						<template id="rf-cf-row-template"><?php $this->render_variation_row( '__N__', $weights ); ?></template>

						<p><button type="button" class="button" id="rf-cf-add-row"><?php $this->icon( 'add', [ 'size' => 18 ] ); ?><?php esc_html_e( 'Add another variation', 'refraction' ); ?></button></p>

						<p class="rf-cf__field">
							<label for="rf-cf-display"><?php esc_html_e( 'Font display', 'refraction' ); ?></label>
							<select id="rf-cf-display" name="display">
								<option value="swap"><?php esc_html_e( 'Swap (show fallback text first)', 'refraction' ); ?></option>
								<option value="auto"><?php esc_html_e( 'Auto', 'refraction' ); ?></option>
								<option value="block"><?php esc_html_e( 'Block (hide text briefly)', 'refraction' ); ?></option>
								<option value="fallback"><?php esc_html_e( 'Fallback', 'refraction' ); ?></option>
								<option value="optional"><?php esc_html_e( 'Optional', 'refraction' ); ?></option>
							</select>
						</p>
						<p class="rf-cf__field rf-cf__field--check">
							<label><input type="checkbox" name="preload" value="1"> <?php esc_html_e( 'Preload the woff2 files of this family', 'refraction' ); ?></label>
							<span class="description"><?php esc_html_e( 'Adds a preload hint to every page. Use it for the one or two fonts that show above the fold.', 'refraction' ); ?></span>
						</p>
						<p><button type="submit" class="button button-primary button-hero"><?php $this->icon( 'upload-file', [ 'size' => 20 ] ); ?><?php esc_html_e( 'Upload and save', 'refraction' ); ?></button></p>
						<p class="description"><?php esc_html_e( 'Accepted: woff2, woff, ttf, otf up to 5 MB each. Files are checked by their content, not only their name.', 'refraction' ); ?></p>
					</form>
				</section>
			</div>
		</div>
		<script>
		( function () {
			var rows = document.getElementById( 'rf-cf-rows' ), box = document.getElementById( 'rf-cf-variations' ), tpl = document.getElementById( 'rf-cf-row-template' );
			document.getElementById( 'rf-cf-add-row' ).addEventListener( 'click', function () {
				var n = parseInt( rows.value, 10 );
				if ( n >= <?php echo (int) Font_Upload::MAX_ROWS; ?> ) { return; }
				box.insertAdjacentHTML( 'beforeend', tpl.innerHTML.replace( /__N__/g, String( n ) ) );
				rows.value = String( n + 1 );
			} );
		}() );
		</script>
		<?php
	}

	private function icon( string $name, array $args = [] ): void {
		echo Icons::svg( $name, $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- bundled, validated SVG.
	}

	private function render_variation_row( $n, array $weights ): void {
		?>
		<fieldset class="rf-cf__row">
			<legend><?php esc_html_e( 'Variation', 'refraction' ); ?></legend>
			<div class="rf-cf__row-head">
				<p class="rf-cf__field">
					<label for="rf-cf-weight-<?php echo esc_attr( (string) $n ); ?>"><?php esc_html_e( 'Weight', 'refraction' ); ?></label>
					<select id="rf-cf-weight-<?php echo esc_attr( (string) $n ); ?>" name="weight_<?php echo esc_attr( (string) $n ); ?>">
						<?php foreach ( $weights as $value => $label ) : ?>
							<option value="<?php echo esc_attr( (string) $value ); ?>" <?php selected( '400', (string) $value ); ?>><?php echo esc_html( $label ); ?></option>
						<?php endforeach; ?>
					</select>
				</p>
				<p class="rf-cf__field">
					<label for="rf-cf-style-<?php echo esc_attr( (string) $n ); ?>"><?php esc_html_e( 'Style', 'refraction' ); ?></label>
					<select id="rf-cf-style-<?php echo esc_attr( (string) $n ); ?>" name="style_<?php echo esc_attr( (string) $n ); ?>">
						<option value="normal"><?php esc_html_e( 'Normal', 'refraction' ); ?></option>
						<option value="italic"><?php esc_html_e( 'Italic', 'refraction' ); ?></option>
						<option value="oblique"><?php esc_html_e( 'Oblique', 'refraction' ); ?></option>
					</select>
				</p>
			</div>
			<div class="rf-cf__files">
				<?php foreach ( array_keys( Pure_Font_Face_Css::FORMATS ) as $ext ) : ?>
					<p class="rf-cf__field">
						<label for="rf-cf-file-<?php echo esc_attr( (string) $n . '-' . $ext ); ?>"><?php echo esc_html( strtoupper( $ext ) ); ?></label>
						<input type="file" id="rf-cf-file-<?php echo esc_attr( (string) $n . '-' . $ext ); ?>" name="font_<?php echo esc_attr( (string) $n . '_' . $ext ); ?>" accept=".<?php echo esc_attr( $ext ); ?>">
					</p>
				<?php endforeach; ?>
			</div>
		</fieldset>
		<?php
	}
}

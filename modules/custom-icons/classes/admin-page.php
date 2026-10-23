<?php
namespace Refraction\Modules\CustomIcons\Classes;

use Refraction\Core\Utils\Icons;
use Refraction\Modules\CustomIcons\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction > Custom Icons: upload a ZIP of SVG files or an IcoMoon / Fontello icon font bundle, see the sets
 * with a preview of their icons, delete a set. Every request checks the capability and a nonce.
 */
class Admin_Page {

	const SLUG = 'refraction-custom-icons';

	private Sets_Repository $repo;

	public function __construct( Sets_Repository $repo ) {
		$this->repo = $repo;

		add_action( 'admin_post_refraction_icons_add', [ $this, 'handle_add' ] );
		add_action( 'admin_post_refraction_icons_delete', [ $this, 'handle_delete' ] );
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
		set_transient( 'refraction_icons_notice_' . get_current_user_id(), [ $type, $message ], 60 );
		wp_safe_redirect( self::url() );
		exit;
	}

	public function handle_add(): void {
		$this->guard( 'refraction_icons_add' );

		$name = \Refraction\Modules\CustomFonts\Classes\Pure_Font_Face_Css::clean_family( isset( $_POST['set_name'] ) ? sanitize_text_field( wp_unslash( $_POST['set_name'] ) ) : '' );
		$result = ( new Icon_Upload() )->process( $name, isset( $_FILES['icon_zip'] ) ? $_FILES['icon_zip'] : [] );

		if ( '' !== $result['error'] ) {
			$this->back( 'error', $result['error'] );
		}

		$this->repo->save_set( $result['slug'], $result['set'] );

		/* translators: 1: set name, 2: number of icons */
		$this->back( 'success', sprintf( __( '%1$s was added with %2$d icons. Find it in the icon picker of any widget.', 'refraction' ), $name, count( $result['set']['icons'] ) ) );
	}

	public function handle_delete(): void {
		$this->guard( 'refraction_icons_delete' );

		$this->repo->delete_set( Pure_Icon_Set::set_slug( isset( $_POST['set'] ) ? sanitize_text_field( wp_unslash( $_POST['set'] ) ) : '' ) );
		$this->back( 'success', __( 'The icon set was deleted.', 'refraction' ) );
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, self::SLUG ) ) {
			return;
		}

		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_style( 'refraction-custom-icons-admin', REFRACTION_ASSETS_URL . 'css/modules/custom-icons/admin' . $min . '.css', [], REFRACTION_VERSION );

		foreach ( $this->repo->all() as $slug => $set ) {
			wp_enqueue_style( 'refraction-custom-icons-' . $slug, Module::style_url( $slug, $set ), [], null );
		}
	}

	private function icon( string $name, array $args = [] ): void {
		echo Icons::svg( $name, $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- bundled, validated SVG.
	}

	public function render(): void {
		$notice = get_transient( 'refraction_icons_notice_' . get_current_user_id() );
		delete_transient( 'refraction_icons_notice_' . get_current_user_id() );
		$sets = $this->repo->all();
		?>
		<div class="wrap rf-ci-admin">
			<h1 class="rf-ci-admin__title"><?php $this->icon( 'interests', [ 'size' => 28 ] ); ?><?php esc_html_e( 'Custom Icons', 'refraction' ); ?></h1>
			<p class="rf-ci-admin__lead"><?php esc_html_e( 'Add your own icon sets from a ZIP of SVG files, or from an IcoMoon or Fontello icon font download. Each set gets its own tab in the icon picker.', 'refraction' ); ?></p>

			<?php if ( is_array( $notice ) ) : ?>
				<div class="rf-ci-admin__notice rf-ci-admin__notice--<?php echo esc_attr( 'success' === $notice[0] ? 'success' : 'error' ); ?>" role="<?php echo 'error' === $notice[0] ? 'alert' : 'status'; ?>">
					<?php $this->icon( 'success' === $notice[0] ? 'check-circle' : 'error', [ 'size' => 20 ] ); ?>
					<span><?php echo esc_html( (string) $notice[1] ); ?></span>
				</div>
			<?php endif; ?>

			<div class="rf-ci-admin__grid">
				<section aria-labelledby="rf-cia-list">
					<h2 id="rf-cia-list"><?php esc_html_e( 'Your icon sets', 'refraction' ); ?></h2>
					<?php if ( ! $sets ) : ?>
						<p class="rf-ci-admin__empty"><?php esc_html_e( 'No icon sets yet. Upload a ZIP on the right.', 'refraction' ); ?></p>
					<?php endif; ?>
					<?php foreach ( $sets as $slug => $set ) : ?>
						<article class="rf-ci-admin__set" data-set="<?php echo esc_attr( $slug ); ?>">
							<header>
								<h3><?php echo esc_html( $set['name'] ); ?></h3>
								<span class="rf-ci-admin__count"><?php echo esc_html( sprintf( /* translators: 1: number of icons, 2: set type */ _n( '%1$d icon, %2$s', '%1$d icons, %2$s', count( $set['icons'] ), 'refraction' ), count( $set['icons'] ), 'svg' === $set['type'] ? __( 'SVG', 'refraction' ) : __( 'icon font', 'refraction' ) ) ); ?></span>
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('<?php echo esc_js( __( 'Delete this icon set? Icons already used on pages stop showing.', 'refraction' ) ); ?>');">
									<?php wp_nonce_field( 'refraction_icons_delete' ); ?>
									<input type="hidden" name="action" value="refraction_icons_delete">
									<input type="hidden" name="set" value="<?php echo esc_attr( $slug ); ?>">
									<button type="submit" class="button-link rf-ci-admin__delete"><?php $this->icon( 'delete', [ 'size' => 18 ] ); ?><?php esc_html_e( 'Delete set', 'refraction' ); ?></button>
								</form>
							</header>
							<ul class="rf-ci-admin__icons">
								<?php foreach ( array_slice( array_keys( $set['icons'] ), 0, 96 ) as $icon_name ) : ?>
									<li title="<?php echo esc_attr( $icon_name ); ?>">
										<?php echo Module::instance()->render_icon_html( $slug, $set, $icon_name, [ 'class' => 'rf-ci-admin__glyph' ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from sanitised parts. ?>
										<span><?php echo esc_html( $icon_name ); ?></span>
									</li>
								<?php endforeach; ?>
							</ul>
						</article>
					<?php endforeach; ?>
				</section>

				<section class="rf-ci-admin__add" aria-labelledby="rf-cia-add">
					<h2 id="rf-cia-add"><?php esc_html_e( 'Add an icon set', 'refraction' ); ?></h2>
					<form method="post" enctype="multipart/form-data" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<?php wp_nonce_field( 'refraction_icons_add' ); ?>
						<input type="hidden" name="action" value="refraction_icons_add">
						<p class="rf-ci-admin__field">
							<label for="rf-cia-name"><?php esc_html_e( 'Set name', 'refraction' ); ?></label>
							<input type="text" id="rf-cia-name" name="set_name" required maxlength="60" placeholder="<?php esc_attr_e( 'Brand icons', 'refraction' ); ?>">
							<span class="description"><?php esc_html_e( 'Uploading a set with an existing name replaces it.', 'refraction' ); ?></span>
						</p>
						<p class="rf-ci-admin__field">
							<label for="rf-cia-zip"><?php esc_html_e( 'ZIP file', 'refraction' ); ?></label>
							<input type="file" id="rf-cia-zip" name="icon_zip" accept=".zip,application/zip" required>
						</p>
						<ul class="rf-ci-admin__rules description">
							<li><?php esc_html_e( 'SVG: one file per icon, up to 100 KB each. Scripts, external links and event handlers are removed.', 'refraction' ); ?></li>
							<li><?php esc_html_e( 'Icon font: the IcoMoon or Fontello ZIP with selection.json or config.json and the font files.', 'refraction' ); ?></li>
							<li><?php esc_html_e( 'At most 500 files and 10 MB unpacked.', 'refraction' ); ?></li>
						</ul>
						<p><button type="submit" class="button button-primary button-hero"><?php $this->icon( 'upload-file', [ 'size' => 20 ] ); ?><?php esc_html_e( 'Upload and add', 'refraction' ); ?></button></p>
					</form>
				</section>
			</div>
		</div>
		<?php
	}
}

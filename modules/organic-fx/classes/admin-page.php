<?php
namespace Refraction\Modules\OrganicFx\Classes;

use Refraction\Core\Utils\Icons;
use Refraction\Modules\OrganicFx\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction > My Shapes: upload an SVG (a file or pasted code), see the library, rename or delete a shape. Only the
 * path data and viewBox of an upload are kept (Pure_Shape_Store). Every request checks the capability and a nonce.
 */
class Admin_Page {

	const SLUG = 'refraction-my-shapes';

	private Shapes_Repository $repo;

	public function __construct( Shapes_Repository $repo ) {
		$this->repo = $repo;

		add_action( 'admin_post_refraction_shapes_add', [ $this, 'handle_add' ] );
		add_action( 'admin_post_refraction_shapes_rename', [ $this, 'handle_rename' ] );
		add_action( 'admin_post_refraction_shapes_delete', [ $this, 'handle_delete' ] );
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
		set_transient( 'refraction_shapes_notice_' . get_current_user_id(), [ $type, $message ], 60 );
		wp_safe_redirect( self::url() );
		exit;
	}

	private static function posted( string $key ): string {
		return isset( $_POST[ $key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification -- checked in guard().
	}

	private static function name( string $name ): string {
		return mb_substr( trim( $name ), 0, 60 );
	}

	public function handle_add(): void {
		$this->guard( 'refraction_shapes_add' );

		$svg = '';
		$file = $_FILES['shape_file'] ?? []; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- only its tmp_name is read, below, after is_uploaded_file().

		if ( ! empty( $file['tmp_name'] ) && UPLOAD_ERR_OK === (int) ( $file['error'] ?? 1 ) && is_uploaded_file( $file['tmp_name'] ) ) {
			if ( (int) $file['size'] > Pure_Shape_Store::MAX_BYTES ) {
				$this->back( 'error', __( 'That file is larger than 200 KB. Simplify the SVG and try again.', 'refraction' ) );
			}

			$svg = (string) file_get_contents( $file['tmp_name'] ); // phpcs:ignore WordPress.WP_Alternative_Functions.file_get_contents_file_get_contents -- a local upload.
		} elseif ( isset( $_POST['shape_code'] ) ) {
			$svg = (string) wp_unslash( $_POST['shape_code'] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- parsed by Pure_Shape_Store, which keeps only numbers and path letters.
		}

		$shape = Pure_Shape_Store::parse( $svg );

		if ( ! $shape ) {
			$this->back( 'error', __( 'No shape found. Upload an SVG with a filled path, rectangle, circle, ellipse or polygon (up to 200 KB). Text and pictures inside an SVG are not used.', 'refraction' ) );
		}

		$name = self::name( self::posted( 'shape_name' ) );

		if ( '' === $name ) {
			$name = self::name( ! empty( $file['name'] ) ? preg_replace( '/\.svg$/i', '', sanitize_file_name( $file['name'] ) ) : __( 'My shape', 'refraction' ) );
		}

		if ( '' === $this->repo->add( $name, $shape ) ) {
			/* translators: %d: maximum number of shapes. */
			$this->back( 'error', sprintf( __( 'The library holds %d shapes. Delete one first.', 'refraction' ), Shapes_Repository::MAX ) );
		}

		/* translators: %s: shape name. */
		$this->back( 'success', sprintf( __( '%s was added. Pick it in Shape Mask, Deco Blob or Floating Shapes under "My shapes".', 'refraction' ), $name ) );
	}

	public function handle_rename(): void {
		$this->guard( 'refraction_shapes_rename' );

		$ok = $this->repo->rename( self::posted( 'shape' ), self::name( self::posted( 'shape_name' ) ) );
		$this->back( $ok ? 'success' : 'error', $ok ? __( 'The shape was renamed.', 'refraction' ) : __( 'The shape could not be renamed.', 'refraction' ) );
	}

	public function handle_delete(): void {
		$this->guard( 'refraction_shapes_delete' );

		$this->repo->delete( self::posted( 'shape' ) );
		$this->back( 'success', __( 'The shape was deleted.', 'refraction' ) );
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, self::SLUG ) ) {
			return;
		}

		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_style( 'refraction-my-shapes-admin', REFRACTION_ASSETS_URL . 'css/modules/organic-fx/admin' . $min . '.css', [], REFRACTION_VERSION );
	}

	private function icon( string $name, array $args = [] ): void {
		echo Icons::svg( $name, $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- bundled, validated SVG.
	}

	public function render(): void {
		$notice = get_transient( 'refraction_shapes_notice_' . get_current_user_id() );
		delete_transient( 'refraction_shapes_notice_' . get_current_user_id() );
		$shapes = $this->repo->all();
		$post = esc_url( admin_url( 'admin-post.php' ) );
		?>
		<div class="wrap rf-ms-admin">
			<h1 class="rf-ms-admin__title"><?php $this->icon( 'interests', [ 'size' => 28 ] ); ?><?php esc_html_e( 'My Shapes', 'refraction' ); ?></h1>
			<p class="rf-ms-admin__lead"><?php esc_html_e( 'Upload your own SVG shapes. They appear under "My shapes" in Shape Mask, Deco Blob and Floating Shapes, next to the built-in shapes.', 'refraction' ); ?></p>

			<?php if ( is_array( $notice ) ) : ?>
				<div class="rf-ms-admin__notice rf-ms-admin__notice--<?php echo esc_attr( 'success' === $notice[0] ? 'success' : 'error' ); ?>" role="<?php echo 'error' === $notice[0] ? 'alert' : 'status'; ?>">
					<?php $this->icon( 'success' === $notice[0] ? 'check-circle' : 'error', [ 'size' => 20 ] ); ?>
					<span><?php echo esc_html( (string) $notice[1] ); ?></span>
				</div>
			<?php endif; ?>

			<div class="rf-ms-admin__grid">
				<section aria-labelledby="rf-ms-list">
					<h2 id="rf-ms-list">
						<?php
						/* translators: 1: number of shapes, 2: maximum. */
						echo esc_html( sprintf( __( 'Your shapes (%1$d of %2$d)', 'refraction' ), count( $shapes ), Shapes_Repository::MAX ) );
						?>
					</h2>
					<?php if ( ! $shapes ) : ?>
						<p class="rf-ms-admin__empty"><?php esc_html_e( 'No shapes yet. Upload an SVG on the right.', 'refraction' ); ?></p>
					<?php else : ?>
						<ul class="rf-ms-admin__shapes">
							<?php foreach ( $shapes as $id => $shape ) : ?>
								<li class="rf-ms-admin__shape" data-shape="<?php echo esc_attr( $id ); ?>">
									<div class="rf-ms-admin__preview">
										<?php echo Pure_Shape_Store::svg( $shape ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- path data and viewBox hold only numbers and path letters. ?>
									</div>
									<form method="post" action="<?php echo $post; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>" class="rf-ms-admin__rename">
										<?php wp_nonce_field( 'refraction_shapes_rename' ); ?>
										<input type="hidden" name="action" value="refraction_shapes_rename">
										<input type="hidden" name="shape" value="<?php echo esc_attr( $id ); ?>">
										<label class="screen-reader-text" for="rf-ms-name-<?php echo esc_attr( $id ); ?>"><?php esc_html_e( 'Name', 'refraction' ); ?></label>
										<input type="text" id="rf-ms-name-<?php echo esc_attr( $id ); ?>" name="shape_name" value="<?php echo esc_attr( $shape['name'] ); ?>" maxlength="60" required>
										<button type="submit" class="button button-small"><?php esc_html_e( 'Rename', 'refraction' ); ?></button>
									</form>
									<form method="post" action="<?php echo $post; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>" onsubmit="return confirm('<?php echo esc_js( __( 'Delete this shape? Elements using it lose their mask or blob.', 'refraction' ) ); ?>');">
										<?php wp_nonce_field( 'refraction_shapes_delete' ); ?>
										<input type="hidden" name="action" value="refraction_shapes_delete">
										<input type="hidden" name="shape" value="<?php echo esc_attr( $id ); ?>">
										<button type="submit" class="button-link rf-ms-admin__delete"><?php $this->icon( 'delete', [ 'size' => 16 ] ); ?><?php esc_html_e( 'Delete', 'refraction' ); ?></button>
									</form>
								</li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
				</section>

				<section class="rf-ms-admin__add" aria-labelledby="rf-ms-add">
					<h2 id="rf-ms-add"><?php esc_html_e( 'Upload an SVG', 'refraction' ); ?></h2>
					<form method="post" enctype="multipart/form-data" action="<?php echo $post; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>">
						<?php wp_nonce_field( 'refraction_shapes_add' ); ?>
						<input type="hidden" name="action" value="refraction_shapes_add">
						<p class="rf-ms-admin__field">
							<label for="rf-ms-new-name"><?php esc_html_e( 'Name', 'refraction' ); ?></label>
							<input type="text" id="rf-ms-new-name" name="shape_name" maxlength="60" placeholder="<?php esc_attr_e( 'Brand blob', 'refraction' ); ?>">
							<span class="description"><?php esc_html_e( 'Empty: the file name.', 'refraction' ); ?></span>
						</p>
						<p class="rf-ms-admin__field">
							<label for="rf-ms-file"><?php esc_html_e( 'SVG file', 'refraction' ); ?></label>
							<input type="file" id="rf-ms-file" name="shape_file" accept=".svg,image/svg+xml">
						</p>
						<p class="rf-ms-admin__field">
							<label for="rf-ms-code"><?php esc_html_e( 'Or paste SVG code', 'refraction' ); ?></label>
							<textarea id="rf-ms-code" name="shape_code" rows="5" spellcheck="false" placeholder="&lt;svg viewBox=&quot;0 0 100 100&quot;&gt;&lt;path d=&quot;M10 50...&quot;/&gt;&lt;/svg&gt;"></textarea>
						</p>
						<ul class="rf-ms-admin__rules description">
							<li><?php esc_html_e( 'One filled silhouette works best. All paths, rectangles, circles, ellipses and polygons are joined into one shape; colours, strokes, text and pictures are dropped.', 'refraction' ); ?></li>
							<li><?php esc_html_e( 'Only the outline is kept, so nothing in the file can run on your site.', 'refraction' ); ?></li>
							<li><?php esc_html_e( 'Up to 200 KB per file and 100 shapes.', 'refraction' ); ?></li>
						</ul>
						<p><button type="submit" class="button button-primary button-hero"><?php $this->icon( 'upload-file', [ 'size' => 20 ] ); ?><?php esc_html_e( 'Add to My Shapes', 'refraction' ); ?></button></p>
					</form>
				</section>
			</div>
		</div>
		<?php
	}
}

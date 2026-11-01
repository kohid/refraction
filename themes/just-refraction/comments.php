<?php
/**
 * Comments of a post or page not built with Refraction.
 *
 * @package Just_Refraction
 */

if ( ! defined( 'ABSPATH' ) || post_password_required() ) {
	return;
}
?>
<section id="comments" class="jr-comments">
	<?php if ( have_comments() ) : ?>
		<h2 class="jr-comments-title">
			<?php
			/* translators: %s: Number of comments. */
			echo esc_html( sprintf( _n( '%s comment', '%s comments', get_comments_number(), 'just-refraction' ), number_format_i18n( get_comments_number() ) ) );
			?>
		</h2>
		<ol class="jr-comment-list">
			<?php wp_list_comments( [ 'style' => 'ol', 'short_ping' => true, 'avatar_size' => 40 ] ); ?>
		</ol>
		<?php the_comments_navigation(); ?>
	<?php endif; ?>
	<?php comment_form(); ?>
</section>

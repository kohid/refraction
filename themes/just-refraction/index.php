<?php
/**
 * Every view. A page built with Refraction prints only its content (Refraction draws everything, title included);
 * other posts and pages get a title, the content, page links and comments; lists get titles and excerpts.
 * Refraction's Theme Builder replaces this file entirely when it has a single, archive, search or 404 template.
 *
 * @package Just_Refraction
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="content" class="jr-main">
<?php
if ( is_singular() ) :
	while ( have_posts() ) :
		the_post();

		if ( just_refraction_is_refraction_page() ) :
			the_content();
			continue;
		endif;
		?>
	<article id="post-<?php the_ID(); ?>" <?php post_class( 'jr-entry' ); ?>>
		<?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
		<?php if ( 'post' === get_post_type() ) : ?>
			<p class="jr-meta"><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time></p>
		<?php endif; ?>
		<?php the_post_thumbnail( 'large' ); ?>
		<div class="entry-content">
			<?php
			the_content();
			wp_link_pages( [ 'before' => '<nav class="jr-page-links" aria-label="' . esc_attr__( 'Pages', 'just-refraction' ) . '">', 'after' => '</nav>' ] );
			?>
		</div>
		<?php if ( 'post' === get_post_type() && ( has_category() || has_tag() ) ) : ?>
			<p class="jr-meta"><?php the_category( ', ' ); ?><?php the_tags( ' &middot; ', ', ' ); ?></p>
		<?php endif; ?>
	</article>
		<?php
		if ( comments_open() || get_comments_number() ) :
			comments_template();
		endif;
	endwhile;
else :
	?>
	<header class="jr-page-header">
		<?php
		if ( is_404() ) {
			echo '<h1 class="entry-title">' . esc_html__( 'Page not found', 'just-refraction' ) . '</h1>';
		} elseif ( is_search() ) {
			/* translators: %s: Search words. */
			echo '<h1 class="entry-title">' . sprintf( esc_html__( 'Results for “%s”', 'just-refraction' ), esc_html( get_search_query() ) ) . '</h1>';
		} elseif ( is_archive() ) {
			the_archive_title( '<h1 class="entry-title">', '</h1>' );
			the_archive_description( '<div class="jr-archive-description">', '</div>' );
		} elseif ( ! is_front_page() ) {
			echo '<h1 class="entry-title">' . esc_html( get_the_title( (int) get_option( 'page_for_posts' ) ) ) . '</h1>';
		}
		?>
	</header>
	<?php
	if ( ! is_404() && have_posts() ) :
		while ( have_posts() ) :
			the_post();
			?>
	<article id="post-<?php the_ID(); ?>" <?php post_class( 'jr-summary' ); ?>>
			<?php the_title( sprintf( '<h2 class="entry-title"><a href="%s">', esc_url( get_permalink() ) ), '</a></h2>' ); ?>
			<?php the_excerpt(); ?>
	</article>
			<?php
		endwhile;
		the_posts_pagination();
	else :
		echo '<p>' . ( is_search() ? esc_html__( 'Nothing matched. Try other words.', 'just-refraction' ) : esc_html__( 'The page you are looking for is not here. Try a search.', 'just-refraction' ) ) . '</p>';
		get_search_form();
	endif;
endif;
?>
</main>
<?php
get_footer();

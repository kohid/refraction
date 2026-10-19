<?php
/**
 * Test fixture for scripts/check-pro-widgets-2.mjs (run with `wp eval-file`, test sites only).
 *
 * Creates generated images, a Lottie animation, a short video clip and one published page per widget.
 * Env: RF2_CLIP = path of an mp4 to import (optional). Prints { key: { id, url }, ... } as JSON.
 */
wp_set_current_user( 1 );
require_once ABSPATH . 'wp-admin/includes/image.php';

function rf2_widget( $type, $settings = [], $id = null ) {
	return [
		'id' => $id ? $id : substr( md5( $type . wp_json_encode( $settings ) ), 0, 7 ),
		'elType' => 'widget',
		'widgetType' => $type,
		'settings' => $settings,
		'elements' => [],
	];
}

function rf2_page( $title, array $widgets ) {
	$docs = \Refraction\Plugin::$instance->documents;
	$existing = get_page_by_path( sanitize_title( $title ) );
	if ( $existing ) {
		wp_delete_post( $existing->ID, true );
	}
	$doc = $docs->create( 'wp-page', [ 'post_title' => $title, 'post_status' => 'publish', 'post_name' => sanitize_title( $title ) ] );
	$doc->save( [
		'elements' => [ [ 'id' => substr( md5( $title ), 0, 7 ), 'elType' => 'container', 'settings' => [], 'elements' => $widgets, 'isInner' => false ] ],
		'settings' => [],
	] );

	return [ 'id' => $doc->get_main_id(), 'url' => get_permalink( $doc->get_main_id() ) ];
}

/** A coloured PNG of a given size as a media-library attachment (re-used by name). */
function rf2_image( $name, $w, $h, $rgb, $caption = '' ) {
	$upload = wp_upload_dir();
	wp_mkdir_p( $upload['path'] );
	$file = $upload['path'] . '/' . $name . '.png';
	$im = imagecreatetruecolor( $w, $h );
	imagefill( $im, 0, 0, imagecolorallocate( $im, $rgb[0], $rgb[1], $rgb[2] ) );
	imagestring( $im, 5, 10, 10, $name, imagecolorallocate( $im, 255, 255, 255 ) );
	imagepng( $im, $file );
	$existing = get_posts( [ 'post_type' => 'attachment', 'title' => $name, 'numberposts' => 1, 'fields' => 'ids' ] );
	$id = $existing ? $existing[0] : wp_insert_attachment( [ 'post_title' => $name, 'post_excerpt' => $caption, 'post_mime_type' => 'image/png', 'post_status' => 'inherit' ], $file );
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
	if ( $caption ) {
		wp_update_post( [ 'ID' => $id, 'post_excerpt' => $caption ] );
	}

	return [ 'id' => $id, 'url' => wp_get_attachment_url( $id ) ];
}

function rf2_file( $name, $mime, $contents ) {
	$upload = wp_upload_dir();
	wp_mkdir_p( $upload['path'] );
	$file = $upload['path'] . '/' . $name;
	file_put_contents( $file, $contents );
	$existing = get_posts( [ 'post_type' => 'attachment', 'title' => $name, 'numberposts' => 1, 'fields' => 'ids' ] );
	$id = $existing ? $existing[0] : wp_insert_attachment( [ 'post_title' => $name, 'post_mime_type' => $mime, 'post_status' => 'inherit' ], $file );

	return [ 'id' => $id, 'url' => wp_get_attachment_url( $id ) ];
}

$imgs = [
	rf2_image( 'rf2-red', 800, 600, [ 190, 60, 60 ], 'Red caption' ),
	rf2_image( 'rf2-green', 600, 800, [ 50, 140, 80 ], 'Green caption' ),
	rf2_image( 'rf2-blue', 1000, 600, [ 50, 90, 170 ], 'Blue caption' ),
	rf2_image( 'rf2-gold', 800, 800, [ 190, 150, 40 ], 'Gold caption' ),
	rf2_image( 'rf2-plum', 900, 500, [ 120, 60, 130 ], 'Plum caption' ),
	rf2_image( 'rf2-teal', 700, 900, [ 30, 130, 130 ], 'Teal caption' ),
];
$gallery_item = function ( $img ) {
	return [ 'id' => $img['id'], 'url' => $img['url'] ];
};
$all = array_map( $gallery_item, $imgs );

$lottie = wp_json_encode( [
	'v' => '5.7.0', 'fr' => 30, 'ip' => 0, 'op' => 60, 'w' => 100, 'h' => 100, 'nm' => 'rf2', 'ddd' => 0, 'assets' => [],
	'layers' => [ [
		'ddd' => 0, 'ind' => 1, 'ty' => 4, 'nm' => 'box', 'sr' => 1, 'ip' => 0, 'op' => 60, 'st' => 0, 'bm' => 0,
		'ks' => [
			'o' => [ 'a' => 0, 'k' => 100 ],
			'r' => [ 'a' => 1, 'k' => [ [ 't' => 0, 's' => [ 0 ], 'i' => [ 'x' => [ 1 ], 'y' => [ 1 ] ], 'o' => [ 'x' => [ 0 ], 'y' => [ 0 ] ] ], [ 't' => 60, 's' => [ 360 ] ] ] ],
			'p' => [ 'a' => 0, 'k' => [ 50, 50, 0 ] ], 'a' => [ 'a' => 0, 'k' => [ 0, 0, 0 ] ], 's' => [ 'a' => 0, 'k' => [ 100, 100, 100 ] ],
		],
		'shapes' => [ [ 'ty' => 'gr', 'nm' => 'g', 'it' => [
			[ 'ty' => 'rc', 'd' => 1, 's' => [ 'a' => 0, 'k' => [ 40, 40 ] ], 'p' => [ 'a' => 0, 'k' => [ 0, 0 ] ], 'r' => [ 'a' => 0, 'k' => 0 ] ],
			[ 'ty' => 'fl', 'c' => [ 'a' => 0, 'k' => [ 0.06, 0.46, 0.43, 1 ] ], 'o' => [ 'a' => 0, 'k' => 100 ] ],
			[ 'ty' => 'tr', 'p' => [ 'a' => 0, 'k' => [ 0, 0 ] ], 'a' => [ 'a' => 0, 'k' => [ 0, 0 ] ], 's' => [ 'a' => 0, 'k' => [ 100, 100 ] ], 'r' => [ 'a' => 0, 'k' => 0 ], 'o' => [ 'a' => 0, 'k' => 100 ] ],
		] ] ],
	] ],
] );
$lottie_att = rf2_file( 'rf2-anim.json', 'application/json', $lottie );
$bad_json = rf2_file( 'rf2-not-lottie.json', 'application/json', '{"hello":"world"}' );

$clip = getenv( 'RF2_CLIP' );
$clip_url = '';
if ( $clip && is_readable( $clip ) ) {
	$clip_att = rf2_file( 'rf2-clip.mp4', 'video/mp4', file_get_contents( $clip ) );
	$clip_url = $clip_att['url'];
}

$filler = function ( $n, $h = 900 ) {
	return rf2_widget( 'html', [ 'html' => '<div style="height:' . $h . 'px;background:#f4f4f4">filler ' . $n . '</div>' ], 'fl' . str_pad( (string) $n, 5, '0', STR_PAD_LEFT ) );
};

$pages = [];

// ---------------------------------------------------------- media carousel
$slide = function ( $img, $caption, $extra = [] ) {
	return array_merge( [ '_id' => 'm' . substr( md5( $img['url'] . $caption ), 0, 7 ), 'type' => 'image', 'image' => [ 'id' => $img['id'], 'url' => $img['url'] ], 'caption' => $caption ], $extra );
};
$pages['media-carousel'] = rf2_page( 'RF2 Media Carousel', [
	rf2_widget( 'refraction-media-carousel', [
		'mode' => 'carousel', 'slides_to_show' => '3', 'slides_to_show_tablet' => '2', 'slides_to_show_mobile' => '1', 'space_between' => [ 'size' => 12, 'unit' => 'px' ],
		'show_caption' => 'yes', 'open_lightbox' => 'yes', 'infinite' => 'yes', 'autoplay' => '', 'carousel_label' => 'Photo carousel',
		'slides' => [
			$slide( $imgs[0], 'First <b>caption</b>' ), $slide( $imgs[1], 'Second' ), $slide( $imgs[2], 'Third' ), $slide( $imgs[3], 'Fourth' ),
			$slide( $imgs[4], 'A video', [ 'type' => 'video', 'video_link' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' ] ),
			$slide( $imgs[5], 'Sixth' ),
		],
	], 'mc000001' ),
	rf2_widget( 'refraction-media-carousel', [
		'mode' => 'slideshow', 'open_lightbox' => 'no', 'navigation' => 'arrows', 'infinite' => 'yes',
		'slides' => [ $slide( $imgs[0], 'S1' ), $slide( $imgs[1], 'S2' ), $slide( $imgs[2], 'S3' ), $slide( $imgs[3], 'S4' ) ],
	], 'mc000002' ),
	rf2_widget( 'refraction-media-carousel', [
		'mode' => 'carousel', 'effect' => 'coverflow', 'slides_to_show' => '3', 'open_lightbox' => 'no', 'infinite' => 'yes',
		'slides' => [ $slide( $imgs[0], '' ), $slide( $imgs[1], '' ), $slide( $imgs[2], '' ), $slide( $imgs[3], '' ), $slide( $imgs[4], '' ) ],
	], 'mc000003' ),
	rf2_widget( 'refraction-media-carousel', [ 'mode' => 'carousel', 'slides_to_show' => '3', 'slides' => [ $slide( $imgs[0], 'Only one' ) ], 'autoplay' => 'yes' ], 'mc000004' ),
	rf2_widget( 'refraction-media-carousel', [ 'slides' => [] ], 'mc000005' ),
	rf2_widget( 'refraction-media-carousel', [ 'mode' => 'carousel', 'slides_to_show' => '1', 'effect' => 'fade', 'autoplay' => 'yes', 'autoplay_speed' => 1500, 'speed' => 300, 'pause_on_hover' => 'yes', 'slides' => [ $slide( $imgs[0], 'a' ), $slide( $imgs[1], 'b' ), $slide( $imgs[2], 'c' ) ] ], 'mc000006' ),
] );

// ------------------------------------------------------ testimonial carousel
$pages['testimonial-carousel'] = rf2_page( 'RF2 Testimonial Carousel', [
	rf2_widget( 'refraction-testimonial-carousel', [
		'carousel_label' => 'Customer quotes', 'layout' => 'below',
		'testimonials' => [
			[ '_id' => 'ta000001', 'content' => 'Quote one <script>alert(1)</script>', 'name' => 'Ann <i>A</i>', 'job' => 'CEO', 'image' => [ 'id' => $imgs[0]['id'], 'url' => $imgs[0]['url'] ] ],
			[ '_id' => 'ta000002', 'content' => "Quote two\nsecond line", 'name' => 'Bob', 'job' => 'CTO', 'link' => [ 'url' => 'https://example.com/bob' ] ],
			[ '_id' => 'ta000003', 'content' => 'Quote three', 'name' => 'Cy', 'job' => '' ],
		],
	], 'tc000001' ),
	rf2_widget( 'refraction-testimonial-carousel', [ 'testimonials' => [ [ '_id' => 'tb000001', 'content' => 'Only quote', 'name' => 'Solo', 'job' => 'x' ] ] ], 'tc000002' ),
	rf2_widget( 'refraction-testimonial-carousel', [ 'slides_to_show' => '2', 'layout' => 'aside', 'testimonials' => [
		[ '_id' => 'tc000011', 'content' => 'Two at once A', 'name' => 'A', 'job' => '' ], [ '_id' => 'tc000012', 'content' => 'Two at once B', 'name' => 'B', 'job' => '' ], [ '_id' => 'tc000013', 'content' => 'Two at once C', 'name' => 'C', 'job' => '' ],
	] ], 'tc000003' ),
] );

// ------------------------------------------------------------------ reviews
$pages['reviews'] = rf2_page( 'RF2 Reviews', [
	rf2_widget( 'refraction-reviews', [
		'layout' => 'grid', 'columns' => '2', 'show_rating_number' => 'yes',
		'reviews' => [
			[ '_id' => 'ra000001', 'name' => 'Alex <b>x</b>', 'rating' => 5, 'content' => 'Five stars <script>alert(1)</script>', 'date' => 'May 2026', 'source' => 'Verified buyer' ],
			[ '_id' => 'ra000002', 'name' => 'Sam', 'rating' => 4.5, 'content' => 'Four and a half', 'date' => '', 'source' => '' ],
			[ '_id' => 'ra000003', 'name' => 'Kim', 'rating' => 3, 'content' => 'Three', 'date' => '2026', 'source' => '' ],
			[ '_id' => 'ra000004', 'name' => 'Zed', 'rating' => 0, 'content' => '', 'date' => '', 'source' => '' ],
			[ '_id' => 'ra000005', 'name' => 'Out of range', 'rating' => 9, 'content' => 'Clamped', 'date' => '', 'source' => '' ],
		],
	], 'rv000001' ),
	rf2_widget( 'refraction-reviews', [
		'layout' => 'carousel', 'slides_to_show' => '2', 'slides_to_show_tablet' => '2', 'slides_to_show_mobile' => '1', 'carousel_label' => 'Review slider', 'navigation' => 'both',
		'reviews' => [
			[ '_id' => 'rb000001', 'name' => 'R1', 'rating' => 5, 'content' => 'c1' ], [ '_id' => 'rb000002', 'name' => 'R2', 'rating' => 4, 'content' => 'c2' ],
			[ '_id' => 'rb000003', 'name' => 'R3', 'rating' => 3.5, 'content' => 'c3' ], [ '_id' => 'rb000004', 'name' => 'R4', 'rating' => 2, 'content' => 'c4' ],
		],
	], 'rv000002' ),
] );

// ------------------------------------------------------------------ hotspot
$hs = function ( $id, $label, $x, $y, $tip, $extra = [] ) {
	return array_merge( [ '_id' => $id, 'label' => $label, 'marker_text' => '+', 'tooltip' => $tip, 'x' => [ 'size' => $x, 'unit' => '%' ], 'y' => [ 'size' => $y, 'unit' => '%' ] ], $extra );
};
$spots = [
	$hs( 'hsa00001', 'Point A', 20, 30, 'Tip A <script>alert(1)</script>', [ 'link' => [ 'url' => 'https://example.com/a' ], 'link_text' => 'More A' ] ),
	$hs( 'hsa00002', 'Point B', 80, 60, 'Tip B', [ 'side' => 'bottom', 'x_mobile' => [ 'size' => 40, 'unit' => '%' ] ] ),
	$hs( 'hsa00003', 'Edge point', 98, 10, 'Tip near the right edge' ),
];
$pages['hotspot'] = rf2_page( 'RF2 Hotspot', [
	rf2_widget( 'refraction-hotspot', [ 'image' => [ 'id' => $imgs[2]['id'], 'url' => $imgs[2]['url'] ], 'trigger' => 'click', 'hotspots' => $spots ], 'hs000001' ),
	rf2_widget( 'refraction-hotspot', [ 'image' => [ 'id' => $imgs[2]['id'], 'url' => $imgs[2]['url'] ], 'trigger' => 'hover', 'hotspots' => [ $hs( 'hsb00001', 'Hover A', 30, 40, 'Hover tip' ), $hs( 'hsb00002', 'Hover B', 70, 40, 'Other tip' ) ] ], 'hs000002' ),
	rf2_widget( 'refraction-hotspot', [ 'image' => [ 'id' => $imgs[2]['id'], 'url' => $imgs[2]['url'] ], 'trigger' => 'always', 'pulse' => '', 'hotspots' => [ $hs( 'hsc00001', 'Always A', 30, 60, 'Always tip' ) ] ], 'hs000003' ),
	rf2_widget( 'refraction-hotspot', [ 'image' => [ 'url' => '' ] ], 'hs000004' ),
] );

// ---------------------------------------------------------- code highlight
$samples = [
	'js' => "// hi\nconst a = \"<script>alert(1)</script>\";\nfunction f(x) { return x + 1; }",
	'php' => "<?php\n\$x = ['a' => 1];\necho \$x['a']; // out\n?>",
	'css' => ".a > b {\n  color: #fff;\n  margin: 0 auto;\n}",
	'html' => "<div class=\"a\">\n  <a href=\"/x\">link</a>\n</div>",
	'json' => "{\n  \"name\": \"x\",\n  \"n\": 1.5,\n  \"ok\": true\n}",
	'bash' => "# list\nfor f in *.txt; do\n  echo \"\$f\"\ndone",
	'python' => "def f(x):\n    # add\n    return x + 1\n",
];
$code_widgets = [];
$i = 1;
foreach ( $samples as $lang => $code ) {
	$extra = 1 === $i ? [ 'filename' => 'demo.js', 'highlight_lines' => '2, 3' ] : [];
	$code_widgets[] = rf2_widget( 'refraction-code-highlight', array_merge( [ 'language' => $lang, 'code' => $code ], $extra ), 'ch00000' . $i );
	++$i;
}
$code_widgets[] = rf2_widget( 'refraction-code-highlight', [ 'language' => 'js', 'code' => "a\nb", 'show_copy' => '', 'show_line_numbers' => '', 'show_language' => '', 'theme' => 'paper' ], 'ch000008' );
$code_widgets[] = rf2_widget( 'refraction-code-highlight', [ 'language' => 'js', 'code' => '   ' ], 'ch000009' );
$pages['code-highlight'] = rf2_page( 'RF2 Code Highlight', $code_widgets );

// ------------------------------------------------------------------- lottie
$pages['lottie'] = rf2_page( 'RF2 Lottie', [
	rf2_widget( 'refraction-lottie', [ 'source' => 'media', 'json' => [ 'id' => $lottie_att['id'], 'url' => $lottie_att['url'] ], 'trigger' => 'autoplay', 'loop' => 'yes', 'label' => 'Spinning square', 'width' => [ 'size' => 160, 'unit' => 'px' ] ], 'lt000001' ),
	rf2_widget( 'refraction-lottie', [ 'source' => 'url', 'url' => $lottie_att['url'], 'trigger' => 'click', 'loop' => '', 'label' => 'Click me' ], 'lt000002' ),
	rf2_widget( 'refraction-lottie', [ 'source' => 'url', 'url' => $lottie_att['url'], 'trigger' => 'hover', 'hover_leave' => 'pause' ], 'lt000003' ),
	rf2_widget( 'refraction-lottie', [ 'source' => 'url', 'url' => $bad_json['url'], 'trigger' => 'autoplay' ], 'lt000004' ),
	rf2_widget( 'refraction-lottie', [ 'source' => 'url', 'url' => 'javascript:alert(1)' ], 'lt000005' ),
	$filler( 1 ),
	rf2_widget( 'refraction-lottie', [ 'source' => 'url', 'url' => $lottie_att['url'], 'trigger' => 'scroll', 'label' => 'Scroll driven' ], 'lt000006' ),
	$filler( 2 ),
] );

// ----------------------------------------------------------- video playlist
$vp_items = [
	[ '_id' => 'va000001', 'title' => 'Clip one', 'link' => $clip_url, 'thumbnail' => [ 'id' => $imgs[0]['id'], 'url' => $imgs[0]['url'] ], 'duration' => '0:01' ],
	[ '_id' => 'va000002', 'title' => 'Clip <b>two</b>', 'link' => $clip_url, 'duration' => '0:01' ],
	[ '_id' => 'va000003', 'title' => 'YouTube three', 'link' => 'https://youtu.be/dQw4w9WgXcQ', 'duration' => '3:32' ],
	[ '_id' => 'va000004', 'title' => 'Not a video', 'link' => 'https://example.com/page' ],
];
$pages['video-playlist'] = rf2_page( 'RF2 Video Playlist', [
	rf2_widget( 'refraction-video-playlist', [ 'videos' => $vp_items, 'autoplay_next' => 'yes', 'loop_list' => '', 'layout' => 'right', 'playlist_title' => 'My playlist' ], 'vp000001' ),
	rf2_widget( 'refraction-video-playlist', [ 'videos' => array_slice( $vp_items, 0, 2 ), 'autoplay_next' => '', 'layout' => 'below' ], 'vp000002' ),
	rf2_widget( 'refraction-video-playlist', [ 'videos' => [ $vp_items[3] ] ], 'vp000003' ),
] );

// ------------------------------------------------------------------ gallery
$pages['gallery'] = rf2_page( 'RF2 Gallery', [
	rf2_widget( 'refraction-gallery', [
		'layout' => 'grid', 'columns' => '3', 'caption' => 'below',
		'galleries' => [
			[ '_id' => 'ga000001', 'title' => 'Warm <b>tones</b>', 'images' => [ $all[0], $all[3], $all[4] ] ],
			[ '_id' => 'ga000002', 'title' => 'Cool tones', 'images' => [ $all[1], $all[2], $all[5] ] ],
		],
	], 'gl000001' ),
	rf2_widget( 'refraction-gallery', [ 'layout' => 'masonry', 'columns' => '3', 'galleries' => [ [ '_id' => 'gb000001', 'title' => 'One', 'images' => $all ] ] ], 'gl000002' ),
	rf2_widget( 'refraction-gallery', [ 'layout' => 'justified', 'row_height' => [ 'size' => 160, 'unit' => 'px' ], 'galleries' => [ [ '_id' => 'gc000001', 'title' => 'One', 'images' => $all ] ] ], 'gl000003' ),
	rf2_widget( 'refraction-gallery', [ 'layout' => 'grid', 'open_lightbox' => 'no', 'caption' => 'overlay', 'all_label' => '', 'galleries' => [ [ '_id' => 'gd000001', 'title' => 'A', 'images' => [ $all[0], $all[1] ] ], [ '_id' => 'gd000002', 'title' => 'B', 'images' => [ $all[2] ] ] ] ], 'gl000004' ),
	rf2_widget( 'refraction-gallery', [ 'galleries' => [ [ '_id' => 'ge000001', 'title' => 'Empty', 'images' => [] ] ] ], 'gl000005' ),
] );

// ----------------------------------------------------------------- facebook
$pages['facebook'] = rf2_page( 'RF2 Facebook', [
	rf2_widget( 'refraction-facebook-button', [ 'url_source' => 'custom', 'url' => 'https://example.com/like-me', 'action' => 'recommend', 'layout' => 'button_count', 'size' => 'large', 'share' => 'yes' ], 'fb000001' ),
	rf2_widget( 'refraction-facebook-button', [ 'url_source' => 'current' ], 'fb000002' ),
	rf2_widget( 'refraction-facebook-comments', [ 'url_source' => 'custom', 'url' => 'https://example.com/discuss', 'numposts' => 7 ], 'fb000003' ),
	rf2_widget( 'refraction-facebook-embed', [ 'type' => 'post', 'url' => 'https://www.facebook.com/Meta/posts/123', 'frame_width' => 500, 'frame_height' => 400 ], 'fb000004' ),
	rf2_widget( 'refraction-facebook-embed', [ 'type' => 'video', 'url' => 'https://www.facebook.com/Meta/videos/456', 'show_text' => '' ], 'fb000005' ),
	rf2_widget( 'refraction-facebook-page', [ 'url' => 'https://www.facebook.com/Meta', 'tabs' => [ 'timeline', 'events' ], 'frame_width' => 340, 'frame_height' => 450, 'small_header' => 'yes' ], 'fb000006' ),
	rf2_widget( 'refraction-facebook-page', [ 'url' => 'https://evil.example.com/Meta' ], 'fb000007' ),
	rf2_widget( 'refraction-facebook-embed', [ 'url' => '' ], 'fb000008' ),
] );

echo wp_json_encode( $pages );

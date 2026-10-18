<?php

namespace Refraction\Tests\Phpunit\Refraction\Modules\EditorOne;

use Refraction\Modules\EditorOne\Classes\Slug_Normalizer;
use PHPUnit\Framework\TestCase as PHPUnit_TestCase;

class Test_Slug_Normalizer extends PHPUnit_TestCase {

	private Slug_Normalizer $normalizer;

	public function setUp(): void {
		parent::setUp();
		$this->normalizer = new Slug_Normalizer();
	}

	/**
	 * @dataProvider data_normalize
	 */
	public function test_normalize( $slug, $expected ) {
		$result = $this->normalizer->normalize( $slug );
		$this->assertEquals( $expected, $result );
	}

	public function data_normalize() {
		return [
			'non_url_slug' => [ 'refraction-settings', 'refraction-settings' ],
			'path_prefixed_slug' => [ 'edit.php?post_type=refraction_library', 'edit.php?post_type=refraction_library' ],
			'http_url_basename' => [ 'https://example.com/wp-admin/admin.php', 'admin.php' ],
			'http_url_query' => [ 'https://example.com/wp-admin/admin.php?page=refraction', 'admin.php?page=refraction' ],
			'http_url_fragment' => [ 'https://example.com/wp-admin/admin.php#section', 'admin.php#section' ],
			'http_url_query_fragment' => [ 'https://example.com/wp-admin/admin.php?page=refraction#section', 'admin.php?page=refraction#section' ],
			'http_no_path' => [ 'http://example.com', '' ],
			'empty_string' => [ '', '' ],
			'https_url' => [ 'https://secure.example.com/wp-admin/edit.php?post_type=page', 'edit.php?post_type=page' ],
		];
	}

	/**
	 * @dataProvider data_is_excluded
	 */
	public function test_is_excluded( $item_slug, $excluded_slugs, $expected ) {
		$result = $this->normalizer->is_excluded( $item_slug, $excluded_slugs );
		$this->assertEquals( $expected, $result );
	}

	public function data_is_excluded() {
		return [
			'exact_match' => [ 'refraction-settings', [ 'refraction-settings', 'refraction-tools' ], true ],
			'not_in_list' => [ 'refraction-other', [ 'refraction-settings', 'refraction-tools' ], false ],
			'normalized_match' => [ 'https://example.com/wp-admin/admin.php?page=refraction', [ 'admin.php?page=refraction' ], true ],
			'empty_excluded' => [ 'refraction-settings', [], false ],
			'exact_before_normalized' => [ 'edit.php?post_type=refraction_library', [ 'edit.php?post_type=refraction_library' ], true ],
			'special_chars' => [
				'edit-tags.php?taxonomy=refraction_library_category&post_type=refraction_library',
				[ 'edit-tags.php?taxonomy=refraction_library_category&post_type=refraction_library' ],
				true,
			],
			'html_encoded' => [
				'edit-tags.php?taxonomy=refraction_library_category&amp;post_type=refraction_library',
				[ 'edit-tags.php?taxonomy=refraction_library_category&amp;post_type=refraction_library' ],
				true,
			],
			'partial_match' => [ 'refraction-settings-advanced', [ 'refraction-settings' ], false ],
		];
	}
}

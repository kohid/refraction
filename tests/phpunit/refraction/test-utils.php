<?php
namespace Refraction\Testing;

use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Utils extends Refraction_Test_Base {

	public function test_getYoutubeId() {
		$youtube_id = '9uOETcuFjbE';
		$youtube_urls = [
			'https://www.youtube.com/watch?v=' . $youtube_id,
			'https://www.youtube.com/watch?v=' . $youtube_id . '&feature=player_embedded',
			'https://youtu.be/' . $youtube_id,
		];

		foreach ( $youtube_urls as $youtube_url ) {
			$video_properties = \Refraction\Embed::get_video_properties( $youtube_url );

			$this->assertEquals( $youtube_id, $video_properties['video_id'] );
		}

		$this->assertNull( \Refraction\Embed::get_video_properties( 'https://www.youtube.com/' ) );
	}
}

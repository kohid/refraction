<?php
namespace Elementor\Tests\Phpunit\Elementor\Modules\Blender;

use Elementor\Modules\Blender\Classes\Gltf_Files;
use PHPUnit\Framework\TestCase;

/**
 * Pure PHP: runs with tests/phpunit/run-unit.sh as well as in the full suite.
 */
class Test_Gltf_Files extends TestCase {

	private $files = [];

	protected function tearDown(): void {
		foreach ( $this->files as $file ) {
			if ( file_exists( $file ) ) {
				unlink( $file );
			}
		}

		parent::tearDown();
	}

	private function make_file( string $contents ): string {
		$file = tempnam( sys_get_temp_dir(), 'gltf' );
		file_put_contents( $file, $contents );
		$this->files[] = $file;

		return $file;
	}

	public static function make_glb( int $version = 2, ?int $declared_length = null, string $payload = '' ): string {
		$length = 12 + strlen( $payload );

		return 'glTF' . pack( 'VV', $version, $declared_length ?? $length ) . $payload;
	}

	public function test_valid_glb() {
		$this->assertTrue( Gltf_Files::is_valid_glb( $this->make_file( self::make_glb( 2, null, str_repeat( "\0", 8 ) ) ) ) );
	}

	public function test_glb_with_wrong_magic_is_rejected() {
		$this->assertFalse( Gltf_Files::is_valid_glb( $this->make_file( 'GIF8' . pack( 'VV', 2, 12 ) ) ) );
	}

	public function test_glb_version_1_is_rejected() {
		$this->assertFalse( Gltf_Files::is_valid_glb( $this->make_file( self::make_glb( 1 ) ) ) );
	}

	public function test_truncated_glb_is_rejected() {
		$this->assertFalse( Gltf_Files::is_valid_glb( $this->make_file( self::make_glb( 2, 500 ) ) ) );
		$this->assertFalse( Gltf_Files::is_valid_glb( $this->make_file( 'glTF' ) ) );
	}

	public function test_php_disguised_as_glb_is_rejected() {
		$this->assertFalse( Gltf_Files::is_valid_glb( $this->make_file( '<?php echo 1;' ) ) );
	}

	public function test_missing_file_is_rejected() {
		$this->assertFalse( Gltf_Files::is_valid_glb( '/nonexistent/model.glb' ) );
		$this->assertFalse( Gltf_Files::is_valid_gltf_json( '/nonexistent/model.gltf' ) );
	}

	public function test_valid_gltf_json() {
		$this->assertTrue( Gltf_Files::is_valid_gltf_json( $this->make_file( '{"asset":{"version":"2.0","generator":"Khronos glTF Blender I/O"}}' ) ) );
	}

	public function test_gltf_json_needs_version_2() {
		$this->assertFalse( Gltf_Files::is_valid_gltf_json( $this->make_file( '{"asset":{"version":"1.0"}}' ) ) );
		$this->assertFalse( Gltf_Files::is_valid_gltf_json( $this->make_file( '{"scenes":[]}' ) ) );
		$this->assertFalse( Gltf_Files::is_valid_gltf_json( $this->make_file( '<html></html>' ) ) );
	}

	public function test_check_filetype_and_ext_accepts_real_glb() {
		$file = $this->make_file( self::make_glb() );
		$original = [
			'ext' => false,
			'type' => false,
			'proper_filename' => false,
		];

		$result = ( new Gltf_Files() )->check_filetype_and_ext( $original, $file, 'Chair.GLB' );

		$this->assertSame( 'glb', $result['ext'] );
		$this->assertSame( 'model/gltf-binary', $result['type'] );
	}

	public function test_check_filetype_and_ext_rejects_fake_glb() {
		$file = $this->make_file( 'not a model' );
		$original = [
			'ext' => 'glb',
			'type' => 'model/gltf-binary',
			'proper_filename' => false,
		];

		$result = ( new Gltf_Files() )->check_filetype_and_ext( $original, $file, 'chair.glb' );

		$this->assertFalse( $result['ext'] );
		$this->assertFalse( $result['type'] );
	}

	public function test_check_filetype_and_ext_leaves_other_files_alone() {
		$original = [
			'ext' => 'png',
			'type' => 'image/png',
			'proper_filename' => false,
		];

		$this->assertSame( $original, ( new Gltf_Files() )->check_filetype_and_ext( $original, '/tmp/x', 'photo.png' ) );
	}

	public function test_upload_mimes_are_added() {
		$mimes = ( new Gltf_Files() )->add_upload_mimes( [ 'png' => 'image/png' ] );

		$this->assertSame( 'model/gltf-binary', $mimes['glb'] );
		$this->assertSame( 'model/gltf+json', $mimes['gltf'] );
		$this->assertSame( 'image/png', $mimes['png'] );
	}
}

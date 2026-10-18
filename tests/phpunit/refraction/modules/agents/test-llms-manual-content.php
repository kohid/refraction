<?php

namespace Refraction\Tests\Phpunit\Refraction\Modules\Agents;

use Refraction\Core\Utils\Exceptions;
use Refraction\Modules\Agents\Agent_Ready_Settings;
use Refraction\Modules\Agents\Classes\Llms_Content_Ajax;
use Refraction\Modules\Agents\Content_Generator;
use Refraction\Modules\Agents\Llms_Manual_Content;
use Refraction\Modules\Agents\Module;
use Refraction\Modules\Agents\Prompt_Injection_Sanitizer;
use RefractionEditorTesting\Refraction_Test_Base;

class Test_Llms_Manual_Content extends Refraction_Test_Base {

	private Agent_Ready_Settings $settings;

	private Llms_Manual_Content $manual_content;

	private Llms_Content_Ajax $ajax;

	public function setUp(): void {
		parent::setUp();

		$this->act_as_admin();

		delete_option( Agent_Ready_Settings::OPTION );
		delete_option( Llms_Manual_Content::OPTION );

		$generator            = new Content_Generator( new Prompt_Injection_Sanitizer() );
		$this->settings       = new Agent_Ready_Settings( $generator );
		$this->manual_content = new Llms_Manual_Content( $generator );
		$this->ajax           = new Llms_Content_Ajax( $this->settings, $this->manual_content );

		$this->settings->register();
		$this->settings->ensure_option_exists();
	}

	public function tearDown(): void {
		delete_option( Agent_Ready_Settings::OPTION );
		delete_option( Llms_Manual_Content::OPTION );

		parent::tearDown();
	}

	public function test_save__stores_sanitized_content_without_autoload() {
		// Arrange
		wp_cache_delete( 'alloptions', 'options' );

		// Act
		$this->manual_content->save( "# My site\n<script>alert(1)</script>Hello" );

		// Assert
		$this->assertStringContainsString( '# My site', $this->manual_content->get_content() );
		$this->assertStringNotContainsString( '<script>', $this->manual_content->get_content() );
		$this->assertGreaterThan( 0, $this->manual_content->get_modified_at() );
		$this->assertArrayNotHasKey( Llms_Manual_Content::OPTION, wp_load_alloptions() );
	}

	public function test_save__rejects_empty_content() {
		// Assert
		$this->expectException( \InvalidArgumentException::class );

		// Act
		$this->manual_content->save( "  \n " );
	}

	public function test_save__rejects_content_over_the_size_cap() {
		// Assert
		$this->expectException( \InvalidArgumentException::class );

		// Act
		$this->manual_content->save( str_repeat( 'a', Content_Generator::LLMS_FULL_HARD_CAP + 1 ) );
	}

	public function test_ajax_handle__saves_content_and_sets_manually_edited_flag() {
		// Act
		$result = $this->ajax->handle( [ 'content' => '# Edited by hand' ] );

		// Assert
		$this->assertSame( [ 'isManuallyEdited' => true ], $result );
		$this->assertSame( '# Edited by hand', $this->manual_content->get_content() );
		$this->assertTrue( $this->settings->is_llms_manually_edited() );
	}

	public function test_ajax_handle__rejects_users_without_manage_options() {
		// Arrange
		$this->act_as_editor();

		// Assert
		$this->expectException( \Exception::class );

		// Act
		$this->ajax->handle( [ 'content' => '# Not allowed' ] );
	}

	public function test_ajax_handle__refuses_when_physical_file_exists() {
		// Arrange
		require_once ABSPATH . 'wp-admin/includes/file.php';
		$file_path = get_home_path() . Module::LLMS_FILENAME;
		file_put_contents( $file_path, '# Server file' );

		try {
			// Act
			$this->ajax->handle( [ 'content' => '# Edited by hand' ] );
			$this->fail( 'Expected the save to be refused when a physical llms.txt exists.' );
		} catch ( \Exception $exception ) {
			// Assert
			$this->assertSame( Exceptions::BAD_REQUEST, $exception->getCode() );
			$this->assertSame( '', $this->manual_content->get_content() );
			$this->assertFalse( $this->settings->is_llms_manually_edited() );
		} finally {
			unlink( $file_path );
		}
	}
}

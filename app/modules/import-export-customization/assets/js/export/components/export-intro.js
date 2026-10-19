import { Box, Typography, Link } from '@elementor/ui';

export default function ExportIntro() {
	return (
		<Box sx={ { mb: 4 } }>
			<Typography variant="h4" component="h2" gutterBottom color="text.primary">
				{ __( 'Export a Website template?', 'refraction' ) }
			</Typography>
			<Typography variant="subtitle1" color="text.secondary">
				{ __( 'Choose which Refraction components - templates, content and site settings - to include in your website templates file. By default, all of your components will be exported.', 'refraction' ) }{ ' ' }
				<Link href="https://github.com/kohid/refraction#readme" color="info.light" target="_blank" rel="noopener noreferrer">
					{ __( 'Learn more', 'refraction' ) }
				</Link>
			</Typography>
		</Box>
	);
}

import { Stack, Box, Typography, Paper, Link } from '@elementor/ui';

export function ReExportBanner() {
	return (
		<Paper
			color="secondary"
			elevation={ 0 }
			variant="elevation"
		>
			<Stack
				direction="row"
				sx={ {
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '5px',
					p: 2.5,
				} }
			>
				<Stack
					direction="row"
					sx={ {
						alignItems: 'center',
						gap: '5px',
					} }
				>
					<Box component="i" className="rficon-info-circle" />
					<Typography variant="body2">
						{ __( 'This website template was exported from an older version of Refraction. If possible, re-export it with the latest version for better capabilities.', 'refraction' ) }
					</Typography>
				</Stack>
				<Link
					href="https://github.com/kohid/refraction/issues"
					variant="body2"
					color="info.light"
					underline="hover"
					target="_blank"
					rel="noopener noreferrer"
				>
					{ __( 'Learn more', 'refraction' ) }
				</Link>
			</Stack>
		</Paper>
	);
}

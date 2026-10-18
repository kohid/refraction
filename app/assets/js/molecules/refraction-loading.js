export default function RefractionLoading( props ) {
	return (
		<div className="refraction-loading">
			<div className="refraction-loader-wrapper">
				<div className="refraction-loader">
					<div className="refraction-loader-boxes">
						<div className="refraction-loader-box" />
						<div className="refraction-loader-box" />
						<div className="refraction-loader-box" />
						<div className="refraction-loader-box" />
					</div>
				</div>
				<div className="refraction-loading-title">{ props.loadingText }</div>
			</div>
		</div>
	);
}

RefractionLoading.propTypes = {
	loadingText: PropTypes.string,
};

RefractionLoading.defaultProps = {
	loadingText: __( 'Loading', 'refraction' ),
};

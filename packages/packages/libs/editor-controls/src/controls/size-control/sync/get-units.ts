import { type ExtendedSizeOption, type SizeUnit } from '../types';

export const getLengthUnits = () => {
	return ( window.refraction?.config?.size_units?.length ?? [] ) as SizeUnit[];
};

export const getAngleUnits = () => {
	return ( window.refraction?.config?.size_units?.angle ?? [] ) as SizeUnit[];
};

export const getTimeUnits = () => {
	return ( window.refraction?.config?.size_units?.time ?? [] ) as SizeUnit[];
};

export const getExtendedUnits = () => {
	return ( window.refraction?.config?.size_units?.extended_units ?? [] ) as ExtendedSizeOption[];
};

/**
 * Cloud kits were removed together with Refraction's remote services, so there is nothing to ask the backend:
 * the cloud kit library is never available and has no quota. The functions keep their shape for the callers that remain.
 *
 * @return {Promise<{is_eligible: boolean}>} Cloud kits are never eligible.
 */
export async function fetchCloudKitsEligibility() {
	return { is_eligible: false };
}

/**
 * @return {Promise<Object>} Empty quota data.
 */
export async function fetchCloudKitsQuota() {
	return {};
}

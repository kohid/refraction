import { getSessionStorageItem, setSessionStorageItem } from '@refraction/session';

import { type PageAuditReport } from '../../types';
import { getPersistedReport, persistReport } from '../report-storage';

jest.mock( '@refraction/session' );

const FAKE_REPORT: PageAuditReport = {
	documentId: 42,
	runAt: 1700000000000,
	overall: 100,
	categories: {
		'best-practices': { score: 100, failed: 0, total: 0 },
		seo: { score: 100, failed: 0, total: 0 },
		accessibility: { score: 100, failed: 0, total: 0 },
		performance: { score: 100, failed: 0, total: 0 },
		compliance: { score: 100, failed: 0, total: 0 },
	},
	auditResults: [],
};

describe( 'report-storage', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	it( 'persists a report under a per-document key', () => {
		// Act.
		persistReport( 42, FAKE_REPORT );

		// Assert.
		expect( setSessionStorageItem ).toHaveBeenCalledWith( 'refraction/audits/report/42', FAKE_REPORT );
	} );

	it( 'reads a persisted report for the given document', () => {
		// Arrange.
		jest.mocked( getSessionStorageItem ).mockReturnValue( FAKE_REPORT );

		// Act.
		const report = getPersistedReport( 42 );

		// Assert.
		expect( getSessionStorageItem ).toHaveBeenCalledWith( 'refraction/audits/report/42' );
		expect( report ).toEqual( FAKE_REPORT );
	} );

	it( 'returns null when there is no persisted report', () => {
		// Arrange.
		jest.mocked( getSessionStorageItem ).mockReturnValue( undefined );

		// Act.
		const report = getPersistedReport( 7 );

		// Assert.
		expect( report ).toBeNull();
	} );
} );

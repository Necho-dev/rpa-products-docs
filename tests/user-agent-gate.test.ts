import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isBlockedUserAgent } from '../src/lib/auth/user-agent-gate';

describe('isBlockedUserAgent', () => {
  it('blocks vuln scanners', () => {
    assert.equal(isBlockedUserAgent('vuln_scanner/3.1.0 (CVE-2026-4020)'), true);
    assert.equal(isBlockedUserAgent('Vuln-Scanner/1.0'), true);
    assert.equal(isBlockedUserAgent('nikto/2.5'), true);
    assert.equal(isBlockedUserAgent('sqlmap/1.7'), true);
  });

  it('blocks curl and empty UA', () => {
    assert.equal(isBlockedUserAgent('curl/8.0.0'), true);
    assert.equal(isBlockedUserAgent(''), true);
    assert.equal(isBlockedUserAgent(null), true);
  });

  it('allows normal browsers', () => {
    assert.equal(
      isBlockedUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      ),
      false,
    );
  });
});

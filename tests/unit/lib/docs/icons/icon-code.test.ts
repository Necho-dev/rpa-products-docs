import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parsePlatformIconCode,
  platformIconLookupKey,
} from '@/lib/docs/icons/icon-code';

describe('platformIconLookupKey', () => {
  it('keeps ICO_ codes', () => {
    assert.equal(platformIconLookupKey('ICO_QIANNIU'), 'ICO_QIANNIU');
    assert.equal(platformIconLookupKey('ICO_1688_SZYX'), 'ICO_1688_SZYX');
  });

  it('does not map RPA_ or bare CODE', () => {
    assert.equal(platformIconLookupKey('RPA_QIANNIU'), undefined);
    assert.equal(platformIconLookupKey('RPA_1688'), undefined);
    assert.equal(platformIconLookupKey('QIANNIU'), undefined);
    assert.equal(platformIconLookupKey('ALI1688'), undefined);
    assert.equal(platformIconLookupKey('LayoutDashboard'), undefined);
    assert.equal(platformIconLookupKey(''), undefined);
    assert.equal(platformIconLookupKey(undefined), undefined);
  });
});

describe('parsePlatformIconCode', () => {
  it('normalizes ICO_ and RPA_ case-insensitively', () => {
    assert.equal(parsePlatformIconCode('ico_qianniu'), 'ICO_QIANNIU');
    assert.equal(parsePlatformIconCode('rpa_1688_szyx'), 'ICO_1688_SZYX');
  });

  it('rejects bare CODE', () => {
    assert.equal(parsePlatformIconCode('QIANNIU'), undefined);
    assert.equal(parsePlatformIconCode('ALI1688'), undefined);
  });
});

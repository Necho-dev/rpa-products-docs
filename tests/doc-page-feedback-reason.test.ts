import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DOC_FEEDBACK_REASONS,
  isAllowedDocFeedbackReason,
  isDocPageFeedbackOpinion,
} from '../src/lib/docs/feedback/reasons';

describe('page feedback reasons', () => {
  it('accepts page opinions only for source page', () => {
    assert.equal(isDocPageFeedbackOpinion('有帮助'), true);
    assert.equal(isDocPageFeedbackOpinion('没帮助'), true);
    assert.equal(isDocPageFeedbackOpinion('其他错误'), false);
    assert.equal(isAllowedDocFeedbackReason('page', '有帮助'), true);
    assert.equal(isAllowedDocFeedbackReason('page', '没帮助'), true);
    assert.equal(isAllowedDocFeedbackReason('page', '其他错误'), false);
  });

  it('keeps error reasons off the page opinion list', () => {
    for (const reason of DOC_FEEDBACK_REASONS) {
      assert.equal(isDocPageFeedbackOpinion(reason), false);
      assert.equal(isAllowedDocFeedbackReason('document', reason), true);
      assert.equal(isAllowedDocFeedbackReason('selection', reason), true);
    }
    assert.equal(isAllowedDocFeedbackReason('document', '有帮助'), false);
    assert.equal(isAllowedDocFeedbackReason('selection', '没帮助'), false);
  });
});

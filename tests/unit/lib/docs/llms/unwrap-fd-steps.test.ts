import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unwrapFdSteps } from '@/lib/docs/llms/unwrap-fd-steps';

describe('unwrapFdSteps', () => {
  it('restores numbered headings and drops fd-step wrappers', () => {
    const input = `## 一、创建子账号 [#一-创建子账号]

<div className="fd-steps">
<div className="fd-step">
### 登录链接 [#登录链接]

a.千牛网页版--子账户管理链接
</div>
<div className="fd-step">
### 开通子账号流程 [#开通子账号流程]

a.在子账号管理中，新增子账号
</div>
</div>
`;

    const out = unwrapFdSteps(input);
    assert.equal(out.includes('fd-step'), false);
    assert.equal(out.includes('fd-steps'), false);
    assert.match(out, /### 1\. 登录链接 \[#登录链接\]/);
    assert.match(out, /### 2\. 开通子账号流程 \[#开通子账号流程\]/);
  });

  it('does not rewrite numbered headings inside fenced code', () => {
    const input = `\`\`\`html
<div className="fd-steps">
<div className="fd-step">
### 登录链接
</div>
</div>
\`\`\`
`;
    assert.equal(unwrapFdSteps(input), input.replace(/\n{3,}/g, '\n\n'));
  });

  it('unwraps nested step groups from the inside', () => {
    const input = `<div className="fd-steps">
<div className="fd-step">
### 外层

<div className="fd-steps">
<div className="fd-step">
#### 内层甲
</div>
<div className="fd-step">
#### 内层乙
</div>
</div>
</div>
</div>
`;
    const out = unwrapFdSteps(input);
    assert.equal(out.includes('fd-step'), false);
    assert.match(out, /### 1\. 外层/);
    assert.match(out, /#### 1\. 内层甲/);
    assert.match(out, /#### 2\. 内层乙/);
  });
});

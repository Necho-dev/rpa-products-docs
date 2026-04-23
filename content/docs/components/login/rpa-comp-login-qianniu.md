---
title: 千牛商家工作台-登录组件
description: 淘宝千牛商家工作台登录组件包（rpa-comp-login-qianniu）
entry: rpa-comp-login-qianniu
---

| 属性 | 值 |
|------|-----|
| 目标网页 | `https://loginmyseller.taobao.com`（预检访问 `https://myseller.taobao.com/home.htm`） |
| 操作类型 | 浏览器自动化操作 |
| 业务场景 | 千牛商家工作台账号密码登录；登录框在 `iframe#alibaba-login-box` 内部； |

### 安装 PyPI 包

```bash
pip install -i https://nexus.yucekj.cn/repository/pypi-hero/simple/ rpa-comp-login-qianniu
```

### 连接器如何使用

#### Poetry 依赖声明

```toml
# pyproject.toml
[tool.poetry.dependencies]
rpa-comp-login-qianniu = {version = ">=0.1.0", source = "pypi-hero"}
```

#### `@auth` 装饰器

```python
@auth(
    comp="rpa.comp.login.qianniu",
    preflight=True,
    skip_execute_if_failure=True,
    retry_on=(LoginError,),
    max_attempts=3,
    reraise=True,
)
class XXXConnector(BaseConnector):
    ...
```

#### `use_component` 调用

```python
class XXXConnector(BaseConnector):
    ...
    async with self.use_component("rpa.comp.login.qianniu", tab=self.tab) as login:
        result = await login.invoke(account=account)
    ...
```

> 推荐使用 `@auth` 装饰器声明式挂载登录组件，这将由 SDK 自动完成前置依赖调用以及执行过程中的异常捕获和重试处理；

### 完整生命周期

| 步骤 | 方法 | 说明 |
|------|------|------|
| 1 | `precheck_impl` | 访问工作台首页，检查 URL 是否被重定向到登录页；未重定向则认定已登录 |
| 2 | `ensure_login_page` | 若当前不在登录页则导航至 `https://loginmyseller.taobao.com` |
| 3 | `input_credentials` | 在 `iframe#alibaba-login-box` 内填写账号和密码 |
| 4 | `need_verify_code` | 检测 iframe 内是否存在短信验证码输入框（提交前） |
| 5 | `handle_verify_code` | 若步骤 4 为 True，调用 `QianniuSmsVerifyCodeHandler` 处理短信验证码 |
| 6 | `submit_login` | 点击 `button.fm-submit.password-login` 提交登录 |
| 7 | `check_login_result` | 校验 URL 是否已离开登录页；若已成功则跳过后续步骤 |
| 8 | `need_verify_code` | 检测是否弹出短信验证码输入框（提交后） |
| 9 | `handle_verify_code` | 若步骤 8 为 True，调用 `QianniuSmsVerifyCodeHandler` 处理短信验证码 |
| 10 | `check_login_result` | 最终校验登录结果，返回 `ComponentOutput` |

### 调用入参

> 通常由 SDK 自动从 `Account` 模型注入，无需业务层手动传入。

| 字段 | 类型 | 说明 |
|------|------|------|
| `account.username` | `string` | 登录账号 |
| `account.password` | `string` | 登录密码 |

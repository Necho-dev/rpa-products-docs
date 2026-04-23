---
title: 拼多多商家后台-登录组件
description: 拼多多商家后台登录组件包（rpa-comp-login-pinduoduo）
entry: rpa-comp-login-pinduoduo
---

| 属性 | 值 |
|------|-----|
| 目标网页 | `https://mms.pinduoduo.com/login/`（预检访问 `https://mms.pinduoduo.com/home`） |
| 操作类型 | 浏览器自动化操作 |
| 业务场景 | 拼多多商家后台账号密码登录；需要提前将「扫码登录」切换为「账号登录」 |

### 安装 PyPI 包

```bash
pip install -i https://nexus.yucekj.cn/repository/pypi-hero/simple/ rpa-comp-login-pinduoduo
```

### 连接器如何使用

#### Poetry 依赖声明

```toml
# pyproject.toml
[tool.poetry.dependencies]
rpa-comp-login-pinduoduo = {version = ">=0.1.0", source = "pypi-hero"}
```

#### `@auth` 装饰器

```python
@auth(
    comp="rpa.comp.login.pinduoduo",
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
    async with self.use_component("rpa.comp.login.pinduoduo", tab=self.tab) as login:
        result = await login.invoke(account=account)
    ...
```
> 推荐使用 `@auth` 装饰器声明式挂载登录组件，这将由 SDK 自动完成前置依赖调用以及执行过程中的异常捕获和重试处理；

### 完整生命周期

| 步骤 | 方法 | 说明 |
|------|------|------|
| 1 | `precheck_impl` | 访问商家后台首页，若 URL 未停留在登录页则认定已登录 |
| 2 | `ensure_login_page` | 若当前不在登录页则导航至 `https://mms.pinduoduo.com/login/`，并点击「账号登录」 |
| 3 | `input_credentials` | 在 `input#usernameId`、`input#passwordId` 填写账号与密码 |
| 4 | `need_verify_code` | 检测是否存在 `.verify-phone-container`（短信验证） |
| 5 | `handle_verify_code` | 预留：短信验证码处理（当前实现为空，可按需接入 `VerifyCodeHandler`） |
| 6 | `submit_login` | 点击 `.info-content button` 提交登录 |
| 7 | `check_login_result` | 根据 URL 是否仍含 `mms.pinduoduo.com/login` 判断成功与否 |

### 调用入参

> 通常由 SDK 自动从 `Account` 模型注入，无需业务层手动传入。

| 字段 | 类型 | 说明 |
|------|------|------|
| `account.username` | `string` | 登录账号 |
| `account.password` | `string` | 登录密码 |

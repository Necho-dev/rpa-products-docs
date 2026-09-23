# SaaS 产品接入 cube 内跳转说明

本文说明 SaaS 产品如何接入 cube 内的免登跳转，流程可参考当前目录下的 `mock_saas_server.py`。

## 整体流程

1. 用户先登录 cube。
2. 浏览器访问 cube 的跳转入口：

   ```text
   {cubeBaseUrl}/saasProductAuth?targetUrl={urlEncodedSaasEntryUrl}
   ```

3. cube 根据当前登录用户创建 SaaS 用户。
4. cube 使用租户的 SaaS `appSecret` 对用户登录信息加密签名。
5. cube 跳转到 SaaS 产品入口，并在 URL 上追加：

   ```text
   ed={encryptData}&sh={secretHash}&sg={signature}&tm={timestamp}
   ```

6. SaaS 产品收到这 4 个参数后，跳转到用户中心 OIDC 授权接口。
7. 用户中心校验签名，生成一次性 `code`，再重定向回 SaaS 产品回调地址。
8. SaaS 产品用 `code` 请求用户中心 `userInfo` 接口获取用户信息，完成登录。

## cube 跳转链接组装

cube 跳转入口：

```text
GET {cubeBaseUrl}/saasProductAuth?targetUrl={urlEncodedSaasEntryUrl}
```

示例：

```text
https://dev01.yuce-tech.cn/api/saasProductAuth?targetUrl=http%3A%2F%2F127.0.0.1%3A5678%2F
```

其中：

- `cubeBaseUrl` 是 cube 服务地址，例如 `https://dev01.yuce-tech.cn/api`。
- `targetUrl` 是 SaaS 产品入口地址，必须做 URL encode。
- `targetUrl` 可以带自己的 query 参数，cube 会继续追加 `ed/sh/sg/tm`。

Python 组装示例：

```python
from urllib import parse

cube_base_url = "https://dev01.yuce-tech.cn/api"
saas_entry_url = "http://127.0.0.1:5678/"

url = cube_base_url + "/saasProductAuth?targetUrl=" + parse.quote(saas_entry_url, safe="")
print(url)
```

JavaScript 组装示例：

```javascript
const cubeBaseUrl = "https://dev01.yuce-tech.cn/api";
const saasEntryUrl = "http://127.0.0.1:5678/";

const url = `${cubeBaseUrl}/saasProductAuth?targetUrl=${encodeURIComponent(saasEntryUrl)}`;
console.log(url);
```

## SaaS 产品入口处理

SaaS 产品入口需要识别 cube 追加的 4 个参数：

| 参数 | 含义 |
| --- | --- |
| `ed` | 加密后的登录数据 |
| `sh` | secret hash，用于用户中心定位租户密钥 |
| `sg` | 签名 |
| `tm` | 时间戳 |

如果入口没有这些参数，可以展示普通首页或引导用户从 cube 进入。

如果入口有这些参数，SaaS 产品应跳转到用户中心：

```text
GET {userCentreBaseUrl}/open/oidc/auth?ed={ed}&sh={sh}&sg={sg}&tm={tm}&url={callbackUrl}
```

其中 `url` 是 SaaS 产品自己的回调地址，也需要 URL encode。

示例：

```text
http://192.168.40.217:30108/open/oidc/auth?ed=xxx&sh=xxx&sg=xxx&tm=xxx&url=http%3A%2F%2F127.0.0.1%3A5678%2Fcallback
```

## SaaS 回调处理

用户中心校验成功后，会重定向到 SaaS 产品提供的 `callbackUrl`，并追加 `code`：

```text
{callbackUrl}?code={code}
```

SaaS 产品拿到 `code` 后，请求用户中心获取用户信息：

```text
GET {userCentreBaseUrl}/open/oidc/userInfo?code={code}
```

返回成功后，SaaS 产品即可建立自己的登录态，并跳转到产品内首页。

注意：

- `code` 是一次性的，获取用户信息后会失效。
- `code` 有有效期，目前用户中心实现为 5 分钟。
- SaaS 产品应在服务端用 `code` 换用户信息，不建议在前端直接换取后保存登录态。

## mock_saas_server.py 测试方式

当前目录提供了一个模拟 SaaS 产品服务：

```bash
python3 mock_saas_server.py
```

默认配置：

```text
MOCK_SAAS_PORT=5678
MOCK_SAAS_PUBLIC_BASE_URL=http://127.0.0.1:5678
USER_CENTRE_BASE_URL=http://192.168.40.217:30108
```

启动后访问：

```text
http://127.0.0.1:5678/
```

然后手工组装 cube 跳转地址：

```text
https://dev01.yuce-tech.cn/api/saasProductAuth?targetUrl=http%3A%2F%2F127.0.0.1%3A5678%2F
```

测试前提：

- 浏览器已经登录 cube。
- cube 当前租户配置里能取到 SaaS `appSecret`。
- 用户中心能通过 `secretHash` 找到对应租户密钥。
- cube 能访问用户中心的 `/open/userApi/createAccounts` 接口。
- mock SaaS 服务能访问用户中心的 `/open/oidc/auth` 和 `/open/oidc/userInfo` 接口。

完整成功链路：

```text
浏览器
  -> cube /saasProductAuth?targetUrl=...
  -> mock SaaS /?ed=...&sh=...&sg=...&tm=...
  -> 用户中心 /open/oidc/auth
  -> mock SaaS /callback?code=...
  -> 用户中心 /open/oidc/userInfo?code=...
  -> mock SaaS /home
```

## 用户中心地址前缀规则

cube 调用用户中心创建用户接口时，接口基础路径固定为：

```text
/open/userApi/createAccounts
```

实际 URL 拼接规则：

- `yuce.saas-user-centre.baseUrl` 以 `https` 开头时，cube 会拼 `/api` 前缀：

  ```text
  {baseUrl}/api/open/userApi/createAccounts
  ```

- `yuce.saas-user-centre.baseUrl` 不是以 `https` 开头时，不拼 `/api` 前缀：

  ```text
  {baseUrl}/open/userApi/createAccounts
  ```

例如当前无 nginx 的开发环境：

```properties
yuce.saas-user-centre.baseUrl=http://192.168.40.217:30108
```

实际请求：

```text
http://192.168.40.217:30108/open/userApi/createAccounts
```

## SaaS 产品侧最小接入逻辑

SaaS 产品至少需要实现 3 个页面或接口：

1. 入口地址，例如 `/`

   接收 cube 追加的 `ed/sh/sg/tm`，然后重定向到用户中心 `/open/oidc/auth`。

2. 回调地址，例如 `/callback`

   接收用户中心追加的 `code`，服务端请求 `/open/oidc/userInfo` 换取用户信息。

3. 产品首页，例如 `/home`

   SaaS 产品建立自己的 session 后跳转到这里。

伪代码：

```text
GET /
  if missing ed/sh/sg/tm:
      show normal page
  callbackUrl = "{saasBaseUrl}/callback"
  redirect "{userCentreBaseUrl}/open/oidc/auth?ed=...&sh=...&sg=...&tm=...&url={callbackUrl}"

GET /callback?code=...
  userInfo = GET "{userCentreBaseUrl}/open/oidc/userInfo?code=..."
  create saas session
  redirect "/home"
```

## 注意事项

- `targetUrl` 必须是完整 URL，包含 scheme 和 host，例如 `http://127.0.0.1:5678/`。
- `targetUrl` 传给 cube 前必须 URL encode。
- SaaS 产品回调地址传给用户中心前也必须 URL encode。
- 如果 SaaS 入口 URL 含 `#` fragment，需要注意服务端无法收到 fragment，建议回调地址使用普通 path/query。
- `ed/sh/sg/tm` 不需要 SaaS 产品自己解密，SaaS 产品只负责转交给用户中心。
- SaaS 产品最终只信任用户中心 `/open/oidc/userInfo` 返回的用户信息。

---
title: 微信/视频号
icon: WEIXIN_XD
description: 覆盖微信小店、微信视频号助手/加热平台等场景的连接器
entry: RPA_WEIXIN
module:
  link: https://store.weixin.qq.com/
  group: weixin
  icon:
    comp: WEIXIN_SPHZS
references:
  - kind: dependency
    path: /docs/auth/ACCOUNT_PASSWORD/RPA_WEIXIN_XD
    mode: summary
    badge:
      label: 授权依赖
    prompt:
      label: 请提前完成授权配置
      type: warning
---

:::meta-panel
icon: WEIXIN_XD
platform: 微信/视频号
platformUrl: https://store.weixin.qq.com/
requireLogin: true
loginOptions:
  - type: qrcode
:::

## 内含连接器

:::module-grid
layout: tabs
cover: true
sphjr:
  label: 视频号加热/SPHJR
  icon:
    comp: WEIXIN_SPHJR
    color: '#07C160'
:::

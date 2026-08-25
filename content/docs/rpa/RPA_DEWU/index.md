---
title: 得物商家后台
icon: DEWU
description: 覆盖得物平台财务等场景的连接器
entry: RPA_DEWU
module:
  link: https://stark.dewu.com
  group: dewu
  icon:
    comp: DEWU
references:
  - kind: dependency
    path: /docs/auth/ACCOUNT_PASSWORD/RPA_DEWU
    mode: summary
    badge:
      label: 授权依赖
    prompt:
      label: 请提前完成授权配置
      type: warning
---

:::meta-panel
icon: DEWU
platform: 得物商家后台
platformUrl: https://stark.dewu.com
requireLogin: true
loginOptions:
  - text: 账号+密码
    icon: CircleUserRound
  - type: sms
:::

## 内含连接器

:::module-grid
layout: tabs
cover: true
finance:
  label: 财务/Finance
  icon:
    comp: Wallet
    color: '#059669'
marketing:
  label: 营销/Marketing
  icon:
    comp: Megaphone
    color: '#9333ea'
gravity:
  label: 引力/Gravity
  icon:
    comp: Sparkles
    color: '#6366f1'
:::

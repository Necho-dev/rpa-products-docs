---
title: 抖店商家后台
icon: DOUDIAN
description: 覆盖抖店飞鸽客服等场景的连接器
entry: RPA_DOUDIAN
module:
  link: https://fxg.jinritemai.com
  group: doudian
  icon:
    comp: DOUDIAN
references:
  - kind: dependency
    path: /docs/auth/ACCOUNT_PASSWORD/RPA_DOUDIAN
    prompt:
      label: 请提前完成授权配置
      type: warning
---

:::meta-panel
icon: DOUDIAN
platform: 抖店商家后台
platformUrl: https://fxg.jinritemai.com
requireLogin: true
loginOptions:
  - text: 邮箱+密码
    icon: CircleUserRound
  - text: 店铺名称
    icon: Store
  - type: sms
:::

## 内含连接器

:::module-grid
layout: tabs
cover: true
shop:
  label: 店铺/Shop
  icon:
    comp: Store
    color: '#0284c7'
im:
  label: 即时通讯/IM
  icon:
    comp: MessageCircle
    color: '#e11d48'
:::

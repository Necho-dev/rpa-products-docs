---
title: 生意参谋工作台
icon: SYCM
description: 覆盖生意参谋流量与商品等分析能力的连接器
entry: RPA_SYCM
module:
  link: https://sycm.taobao.com
  group: taobao
  icon:
    comp: SYCM
---

:::meta-panel
icon: SYCM
platform: 生意参谋
platformUrl: https://sycm.taobao.com
requireLogin: true
loginOptions:
  - text: 账号+密码
    icon: CircleUserRound
  - text: 店铺名称
    icon: Store
  - type: sms
authHelpUrl: /docs/auth/ACCOUNT_PASSWORD/RPA_SYCM
:::

## 内含连接器

:::module-grid
layout: tabs
cover: true
flow:
  label: 流量/Flow
  icon:
    comp: Activity
    color: '#7c3aed'
item:
  label: 商品/Item
  icon:
    comp: ShoppingBag
    color: '#ea580c'
market:
  label: 市场/Market
  icon:
    comp: TrendingUp
    color: '#0d9488'
shop:
  label: 店铺/Shop
  icon:
    comp: Store
    color: '#0284c7'
:::

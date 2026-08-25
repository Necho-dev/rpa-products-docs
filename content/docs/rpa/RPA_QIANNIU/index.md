---
title: 千牛商家工作台
icon: QIANNIU
description: 覆盖千牛店铺、商品、物流、营销等场景的连接器
entry: RPA_QIANNIU
module:
  link: https://myseller.taobao.com
  group: taobao
  icon:
    comp: QIANNIU
references:
  - path: /docs/auth/ACCOUNT_PASSWORD/RPA_QIANNIU
    kind: dependency
    badge:
      label: 授权依赖
    prompt:
      label: 请提前完成授权配置
      type: warning
---

:::meta-panel
icon: QIANNIU
platform: 千牛商家工作台
platformUrl: https://myseller.taobao.com
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
item:
  label: 商品/Item
  icon:
    comp: ShoppingBag
    color: '#ea580c'
shop:
  label: 店铺/Shop
  icon:
    comp: Store
    color: '#0284c7'
logistics:
  label: 物流/Logistics
  icon:
    comp: Truck
    color: '#16a34a'
marketing:
  label: 营销/Marketing
  icon:
    comp: Megaphone
    color: '#9333ea'
finance:
  label: 财务/Finance
  icon:
    comp: Wallet
    color: '#059669'
:::

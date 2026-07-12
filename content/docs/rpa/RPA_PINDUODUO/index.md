---
title: 拼多多商家后台
icon: PINDUODUO
description: 覆盖拼多多商家后台数据与经营的连接器
entry: RPA_PINDUODUO
module:
  link: https://mms.pinduoduo.com/
  group: pinduoduo
  icon:
    comp: PINDUODUO
---

:::meta-panel
icon: PINDUODUO
platform: 拼多多商家后台
platformUrl: https://mms.pinduoduo.com/
requireLogin: true
loginOptions:
  - text: 账号+密码
    icon: CircleUserRound
  - type: sms
authHelpUrl: /docs/auth/ACCOUNT_PASSWORD/RPA_PINDUODUO
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
item:
  label: 商品/Item
  icon:
    comp: ShoppingBag
    color: '#ea580c'
finance:
  label: 财务/Finance
  icon:
    comp: Wallet
    color: '#059669'
mms:
  label: 推广平台/Promotion
  icon:
    comp: Megaphone
    color: '#9333ea'
jinbao:
  label: 多多进宝/Jinbao
  icon:
    comp: Coins
    color: '#ca8a04'
:::

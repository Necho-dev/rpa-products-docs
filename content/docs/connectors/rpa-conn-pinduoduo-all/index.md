---
title: 拼多多商家后台
description: 覆盖拼多多商家后台数据与经营的 rpa-conn-pinduoduo-all 包说明与安装
entry: rpa-conn-pinduoduo-all
moduleGroup: pinduoduo
moduleIcon:
  comp: Store
  color: '#d97706'
---

:::meta-panel
platform: 拼多多商家后台
platformUrl: https://mms.pinduoduo.com/
requireLogin: true
sdkConstraint: rpa-hero-sdk >=3.0.0
components:
  - pkg: rpa-comp-login-pinduoduo
    type: login
:::

## 安装 PyPI 包

```bash
pip install rpa-conn-pinduoduo-all
```

## 内含连接器

:::module-grid
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
  label: 推广平台/MMS
  icon:
    comp: Megaphone
    color: '#9333ea'
jinbao:
  label: 多多进宝/Jinbao
  icon:
    comp: Coins
    color: '#ca8a04'
:::

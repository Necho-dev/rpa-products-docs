---
title: 千牛商家工作台
description: 覆盖千牛/店铺/商品/服务等场景的 rpa-conn-qianniu-all 包说明与安装
entry: rpa-conn-qianniu-all
moduleGroup: taobao
moduleIcon:
  comp: Bot
  color: '#0284c7'
---

:::meta-panel
platform: 千牛商家工作台
platformUrl: https://myseller.taobao.com
requireLogin: true
sdkConstraint: rpa-hero-sdk >=3.0.0
components:
  - pkg: rpa-comp-login-qianniu
    type: login

:::

## 安装 PyPI 包

```bash
pip install rpa-conn-qianniu-all
```

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


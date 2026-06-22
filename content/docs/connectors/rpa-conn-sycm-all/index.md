---
title: 生意参谋工作台
description: 覆盖生意参谋流量与商品等分析能力的 rpa-conn-sycm-all 包说明与安装
entry: rpa-conn-sycm-all
moduleGroup: taobao
moduleIcon:
  comp: BarChart2
  color: '#7c3aed'
---

:::meta-panel
platform: 生意参谋
platformUrl: https://sycm.taobao.com
requireLogin: true
sdkConstraint: rpa-hero-sdk >=3.0.0
components:
  - pkg: rpa-comp-login-qianniu
    type: login
:::

## 安装 PyPI 包

```bash
pip install rpa-conn-sycm-all
```

## 内含连接器

:::module-grid
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
shop:
  label: 店铺/Shop
  icon:
    comp: Store
    color: '#0284c7'
:::

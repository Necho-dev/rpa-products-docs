---
title: 京东商智
description: 覆盖京东商智商品分析等场景的 rpa-conn-jdsz-all 包说明与安装
entry: rpa-conn-jdsz-all
moduleGroup: jdsz
moduleIcon:
  comp: BarChart3
  color: '#dc2626'
---

:::meta-panel
platform: 京东商智
platformUrl: https://jdsz.jd.com
requireLogin: true
sdkConstraint: rpa-hero-sdk >=3.3.0
components:
  - pkg: rpa-comp-login-jdsz
    type: login
:::

## 安装 PyPI 包

```bash
pip install -i https://nexus.yucekj.cn/repository/pypi-hero/simple/ rpa-conn-jdsz-all
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
:::

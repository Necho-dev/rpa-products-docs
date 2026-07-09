---
title: 京麦商家后台
description: 覆盖京麦平台财务等场景的 rpa-conn-jingmai-all 包说明与安装
entry: rpa-conn-jingmai-all
moduleGroup: jingmai
moduleIcon:
  comp: Store
  color: '#dc2626'
---

:::meta-panel
platform: 京麦商家后台
platformUrl: https://shop.jd.com/jdm/home
requireLogin: true
sdkConstraint: rpa-hero-sdk >=3.3.0
components:
  - pkg: rpa-comp-login-jingmai
    type: login
:::

## 安装 PyPI 包

```bash
pip install -i https://nexus.yucekj.cn/repository/pypi-hero/simple/ rpa-conn-jingmai-all
```

## 内含连接器

:::module-grid
layout: tabs
cover: true
finance:
  label: 财务/Finance
  icon:
    comp: Wallet
    color: '#059669'
wl:
  label: 物流/WL
  icon:
    comp: Truck
    color: '#2563eb'
:::

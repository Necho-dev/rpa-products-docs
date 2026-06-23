---
title: 得物商家后台
description: 覆盖得物平台财务等场景的 rpa-conn-dewu-all 包说明与安装
entry: rpa-conn-dewu-all
moduleGroup: dewu
moduleIcon:
  comp: Wallet
  color: '#059669'
---

:::meta-panel
platform: 得物商家后台
platformUrl: https://stark.dewu.com
requireLogin: true
sdkConstraint: rpa-hero-sdk >=3.3.0
components:
  - pkg: rpa-comp-login-dewu
    type: login
:::

## 安装 PyPI 包

```bash
pip install rpa-conn-dewu-all
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

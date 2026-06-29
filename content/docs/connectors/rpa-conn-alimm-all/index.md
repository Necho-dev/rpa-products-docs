---
title: 阿里妈妈
description: 覆盖阿里妈妈品销宝、万相台、品牌新享等场景的 rpa-conn-alimm-all 包说明与安装
entry: rpa-conn-alimm-all
moduleGroup: taobao
moduleIcon:
  comp: Megaphone
  color: '#ea580c'
---

:::meta-panel
platform: 阿里妈妈
platformUrl: https://www.alimama.com
requireLogin: true
sdkConstraint: rpa-hero-sdk >=3.3.0
components:
  - pkg: rpa-comp-login-alimm
    type: login
:::

## 安装 PyPI 包

```bash
pip install rpa-conn-alimm-all
```

## 内含连接器

:::module-grid
layout: tabs
cover: true
pxb:
  label: 品销宝/Pxb
  icon:
    comp: Megaphone
    color: '#ea580c'
wxt:
  label: 万相台/Wxt
  icon:
    comp: BarChart2
    color: '#2563eb'
ppxx:
  label: 品牌新享/Ppxx
  icon:
    comp: Sparkles
    color: '#eab308'
tblm:
  label: 淘宝联盟/Tblm
  icon:
    comp: Link2
    color: '#0d9488'
:::

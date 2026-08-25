---
title: 阿里妈妈
icon: ALIMM
description: 覆盖阿里妈妈品销宝、万相台、品牌新享、淘宝联盟、达摩盘、UD智汇投、营销生态UD等场景的连接器
entry: RPA_ALIMM
module:
  link: https://www.alimama.com
  group: taobao
  icon:
    comp: ALIMM
references:
  - kind: dependency
    path: /docs/auth/ACCOUNT_PASSWORD/RPA_ALIMM
    mode: summary
    prompt:
      label: 请提前完成授权配置
      type: warning
---

:::meta-panel
icon: ALIMM
platform: 阿里妈妈
platformUrl: https://www.alimama.com
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
pxb:
  label: 品销宝/PXB
  icon:
    comp: Megaphone
    color: '#ea580c'
wxt:
  label: 万相台/WXT
  icon:
    comp: BarChart2
    color: '#2563eb'
ppxx:
  label: 品牌新享/PPXX
  icon:
    comp: Sparkles
    color: '#eab308'
tblm:
  label: 淘宝联盟/TBLM
  icon:
    comp: Link2
    color: '#0d9488'
dmp:
  label: 达摩盘/DMP
  icon:
    comp: Target
    color: '#7c3aed'
ud:
  label: UD智汇投/UD
  icon:
    comp: LineChart
    color: '#db2777'
yxstud:
  label: 营销生态UD/YXSTUD
  icon:
    comp: Share2
    color: '#0891b2'
:::

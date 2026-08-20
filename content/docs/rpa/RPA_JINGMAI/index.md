---
title: 京麦商家后台
icon: JINGMAI
description: 覆盖京麦平台财务、物流、京慧等场景的连接器
entry: RPA_JINGMAI
module:
  link: https://shop.jd.com/
  group: jingdong
  icon:
    comp: JINGMAI
---

:::meta-panel
icon: JINGMAI
platform: 京麦商家后台
platformUrl: https://shop.jd.com/
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
finance:
  label: 财务/Finance
  icon:
    comp: Wallet
    color: '#059669'
wl:
  label: 物流/Logistics
  icon:
    comp: Truck
    color: '#2563eb'
jh:
  label: 京慧/Jinghui
  icon:
    comp: BarChart3
    color: '#dc2626'
:::

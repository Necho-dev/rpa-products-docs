---
title: 店铺-推广平台-财务流水日账单
description: 按日期范围、资金类型、流水类型、交易金额范围导出推广平台财务流水日账单明细数据
entry: rpa.conn.pinduoduo.shop.daily.invoice
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响；高峰期或数据量较大时可能延长至约 10分钟。
category: shop
---

| 属性             | 值                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_推广平台财务流水日账单明细表(拼多多RPA)`|
| **连接器代码**   | `rpa.conn.pinduoduo.shop.daily.invoice`|
| **操作类型**     | `文件导出`|
| **目标网页**     | `https://yingxiao.pinduoduo.com/mains/account/report`|
| **适用场景**     | 按日期范围、资金类型、流水类型、交易金额范围导出推广平台财务流水日账单明细数据|
| **数据表名**     | `ods_rpa_pinduoduo_shop_daily_invoice_du`|
| **业务表名**     | `ODS_推广平台财务流水日账单明细表(拼多多RPA)`|

### 目标页面

> **取数路径**：拼多多推广平台—账户—财务流水
>
> **取数链接**：[https://yingxiao.pinduoduo.com/mains/account/report](https://yingxiao.pinduoduo.com/mains/account/report)

![拼多多推广平台—财务流水日账单](../_public/images/pinduoduo/shop_daily_invoice_20260601.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `custom_start_date` | 开始日期 | `String` | 是 | `-` | 与 `custom_end_date` 须为同一天；格式 `YYYYMMDD` / `YYYY-MM-DD`；最早约 today 往前 6 个自然月 |
| `custom_end_date` | 结束日期 | `String` | 是 | `-` | 与 `custom_start_date` 须为同一天；格式 `YYYYMMDD` / `YYYY-MM-DD`；不可晚于今天 |
| `fund_type` | 资金类型 | `String` | 否 | `-` | 允许值：`CASH`（现金）/ `RED_PACKET`（红包）/ `VIRTUAL_GOLD`（虚拟金）/ `SUBSIDY`（津贴） |
| `flow_type` | 流水类型 | `String` | 否 | `-` | 允许值：`INCOME`（收入）/ `EXPENSE`（支出） |
| `min_amount` | 最小交易金额 | `String` | 否 | `-` | 有效数字，不能大于 `max_amount` |
| `max_amount` | 最大交易金额 | `String` | 否 | `-` | 有效数字 |

### 入参样例

```json
{
  "custom_start_date": "20260909",
  "custom_end_date": "20260909",
  "fund_type": "",
  "flow_type": "",
  "min_amount": "",
  "max_amount": ""
}
```

两种日期格式均可：

```json
{
  "custom_start_date": "2026-09-08",
  "custom_end_date": "20260908"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "拼多多财务流水日账单 - 查询入参",
  "description": "custom_start_date / custom_end_date 必填且须为同一天；格式 YYYYMMDD / YYYY-MM-DD；最早约 today 往前 6 个自然月；不可晚于今天",
  "type": "object",
  "required": ["custom_start_date", "custom_end_date"],
  "additionalProperties": false,
  "properties": {
    "custom_start_date": {
      "type": "string",
      "description": "开始日期；与 custom_end_date 须为同一天；格式 YYYYMMDD / YYYY-MM-DD；最早约 today 往前 6 个自然月",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "结束日期；与 custom_start_date 须为同一天；格式 YYYYMMDD / YYYY-MM-DD；不可晚于今天",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "fund_type": {
      "type": "string",
      "description": "资金类型；允许值：CASH（现金）/ RED_PACKET（红包）/ VIRTUAL_GOLD（虚拟金）/ SUBSIDY（津贴）",
      "enum": ["CASH", "RED_PACKET", "VIRTUAL_GOLD", "SUBSIDY"]
    },
    "flow_type": {
      "type": "string",
      "description": "流水类型；允许值：INCOME（收入）/ EXPENSE（支出）",
      "enum": ["INCOME", "EXPENSE"]
    },
    "min_amount": { "type": "string", "description": "最小交易金额；有效数字，不能大于 max_amount" },
    "max_amount": { "type": "string", "description": "最大交易金额；有效数字" }
  }
}
```

### 数据字段

| 字段           | 中文释义 | 数据类型 | 可为空 | 取数路径       | 示例                                                                         |
| -------------- | -------- | -------- | ------ | -------------- | ---------------------------------------------------------------------------- |
| `tradeTime`    | 交易时间 | `string` | 否     | `XLS.0.时间`       | `2026-05-31 23:59:59`                                                          |
| `fundType`     | 资金类型 | `string` | 否     | `XLS.0.资金类型`   | 现金                                                                         |
| `flowType`     | 流水类型 | `string` | 否     | `XLS.0.流水类型`   | 支出                                                                         |
| `shopName`     | 店铺名称 | `string` | 否     | `XLS.0.店铺名称`   | 王小卤旗舰店                                                                 |
| `tradeAmount`  | 交易金额 | `number` | 否     | `XLS.0.交易金额`   | 5789.02                                                                      |
| `balance`      | 余额     | `number` | 否     | `XLS.0.余额`       | 22232.02                                                                     |
| `tradeSummary` | 交易摘要 | `string` | 是     | `XLS.0.交易摘要`   | 推广支出： 明星店铺1100.13元； 商品推广4688.89元；                           |
| `bizDate`      | 业务日期 | `string` | 否     | 附加           |                                                                              |
| `accountId`    | 授权 ID  | `string` | 否     | 附加           |                                                                              |
| `taskId`       | 任务 ID  | `string` | 否     | 附加           |                                                                              |

### 数据样例

```json
[
  {
    "tradeTime": "2026-05-31 23:59:59",
    "fundType": "现金",
    "flowType": "支出",
    "shopName": "王小卤旗舰店",
    "tradeAmount": 5789.02,
    "balance": 22232.02,
    "tradeSummary": "推广支出： 明星店铺1100.13元； 商品推广4688.89元；",
    "bizDate": "20260601",
    "accountId": "102",
    "taskId": "dev-0-efe4cdcb"
  }
]
```

---

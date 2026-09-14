---
title: 商品-商品360-流量来源
description: 按商品 ID 和统计时间（7天/30天/日/周/月）查询指定商品的流量来源数据，导出单品维度的流量来源拆解
entry: rpa.conn.sycm.item.archives.flow.source
badge:
  label: 已上线
  color: "#16A34A"
dataReady:
  time: "09:00:00"
  cycle: daily
  description: 生意参谋大部分核心数据模块（流量、商品、市场等）昨日数据在上午 9 点前完成更新
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响；高峰期或数据量较大时可能延长至约 10分钟。
category: item
---

| 属性             | 值                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_商品360流量来源明细下载(生意参谋RPA)`|
| **连接器代码**   | `rpa.conn.sycm.item.archives.flow.source`|
| **操作类型**     | `文件导出`|
| **目标网页**     | `https://sycm.taobao.com/cc/item_archives`|
| **适用场景**     | 按商品 ID 和统计时间查询指定商品的流量来源数据，导出单品维度的流量来源拆解（一级～四级来源、UV/PV、加购收藏、支付等）|
| **数据表名**     | `ods_rpa_sycm_item_archives_flow_source_du`|
| **业务表名**     | `ODS_商品360流量来源明细下载(生意参谋RPA)`|

### 目标页面

> **取数路径**：生意参谋—商品—商品360—流量来源
>
> **取数链接**：[https://sycm.taobao.com/cc/item_archives](https://sycm.taobao.com/cc/item_archives?activeKey=flow)

![生意参谋—商品360—流量来源](../_public/images/sycm/item_archives_flow_source_20260521.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `item_id` | 商品 ID | `String` | 是 | `-` | |
| `date_type` | 统计时间类型 | `String` | 是 | `-` | 允许值：`LAST_7_DAYS`（近 7 天）/ `LAST_30_DAYS`（近 30 天）/ `DAY`（按日）/ `WEEK`（自然周）/ `MONTH`（自然月） |
| `biz_date` | 业务日期 | `String` | 条件必填 | `-` | `date_type` 为 `DAY`/`WEEK`/`MONTH` 时必填；始终填一天，格式 `YYYYMMDD` 或 `YYYY-MM-DD`；`LAST_7_DAYS`/`LAST_30_DAYS` 时忽略。`DAY` 不可选今日及以后；`WEEK`/`MONTH` 用这一天定位所在周/月，不可选本周/本月的日期；最早约 2024-07-01 |

### 入参样例

近 7 天：

```json
{
  "item_id": "752102501302",
  "date_type": "LAST_7_DAYS"
}
```

近 30 天：

```json
{
  "item_id": "752102501302",
  "date_type": "LAST_30_DAYS"
}
```

指定自然日（`YYYYMMDD`）：

```json
{
  "item_id": "752102501302",
  "date_type": "DAY",
  "biz_date": "20260905"
}
```

指定自然日（`YYYY-MM-DD`）：

```json
{
  "item_id": "752102501302",
  "date_type": "DAY",
  "biz_date": "2026-08-05"
}
```

按周：

```json
{
  "item_id": "752102501302",
  "date_type": "WEEK",
  "biz_date": "2026-08-31"
}
```

按月：

```json
{
  "item_id": "752102501302",
  "date_type": "MONTH",
  "biz_date": "2026-08-01"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-商品360-流量来源 - 查询入参",
  "description": "按商品 ID 和统计时间（7天/30天/日/周/月）查询指定商品的流量来源数据，导出单品维度的流量来源拆解",
  "type": "object",
  "properties": {
    "item_id": {
      "type": "string",
      "description": "商品 ID"
    },
    "date_type": {
      "type": "string",
      "description": "统计时间类型。允许值：LAST_7_DAYS（近 7 天）/ LAST_30_DAYS（近 30 天）/ DAY（按日）/ WEEK（自然周）/ MONTH（自然月）",
      "enum": ["LAST_7_DAYS", "LAST_30_DAYS", "DAY", "WEEK", "MONTH"]
    },
    "biz_date": {
      "type": "string",
      "description": "业务日期；date_type 为 DAY/WEEK/MONTH 时必填；始终填一天；LAST_7_DAYS/LAST_30_DAYS 时忽略。格式 YYYYMMDD 或 YYYY-MM-DD；DAY 不可选今日及以后；WEEK/MONTH 用这一天定位所在周/月，不可选本周/本月的日期；最早约 2024-07-01",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": ["item_id", "date_type"],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "date_type": {
            "enum": ["DAY", "WEEK", "MONTH"]
          }
        },
        "required": ["date_type"]
      },
      "then": {
        "required": ["biz_date"]
      }
    }
  ]
}
```

### 数据字段

| 字段                   | 中文释义   | 数据类型              | 可为空 | 取数路径           | 示例 |
| ---------------------- | ---------- | --------------------- | ------ | ------------------ | ---- |
| `firstLevelSource`     | 一级来源   | `string`              | 否     | `XLS.0.一级来源`   | 店内流转 |
| `secondLevelSource`    | 二级来源   | `string`              | 否     | `XLS.0.二级来源`   | 商品导流 |
| `thirdLevelSource`     | 三级来源   | `string`              | 是     | `XLS.0.三级来源`   | 商品导流 |
| `fourthLevelSource`    | 四级来源   | `string`              | 是     | `XLS.0.四级来源`   | 商品导流 |
| `uv`                   | 访客数     | `number`              | 否     | `XLS.0.访客数`     | 25 |
| `pv`                   | 浏览量     | `number`              | 否     | `XLS.0.浏览量`     | 58 |
| `addCartUv`            | 加购人数   | `string`              | 否     | `XLS.0.加购人数`   | 1 |
| `collectUv`            | 商品收藏人数 | `string`             | 否   | `XLS.0.商品收藏人数` | 0 |
| `payBuyerCnt`          | 支付买家数 | `string`              | 否     | `XLS.0.支付买家数` | 1 |
| `payConversionRatio`   | 支付转化率 | `string`              | 否     | `XLS.0.支付转化率` | 4.00% |
| `payAmt`               | 支付金额   | `string`              | 否     | `XLS.0.支付金额`   | 3,299.00 |
| `avgPrice`             | 客单价     | `string`              | 否     | `XLS.0.客单价`     | 3,299.00 |
| `payItemCnt`           | 支付件数   | `string`              | 否     | `XLS.0.支付件数`   | 1 |
| `itemId`               | 商品 ID    | `string`              | 否     | 来自入参           | 752102501302 |
| `dateType`             | 统计时间类型 | `String`            | 否     | 附加，来自入参 `date_type` | `DAY` |
| `dateRangeStart`       | 统计区间起始日 | `String`          | 否     | 附加 | `2026-09-05` |
| `dateRangeEnd`         | 统计区间结束日 | `String`          | 否     | 附加 | `2026-09-05` |
| `bizDate`              | 业务日期   | `string`              | 否     | 附加，取区间结束日 `YYYYMMDD` | `20260905` |
| `accountId`            | 授权 ID    | `string`              | 否     | 附加 | |

### 数据样例

```json
[
  {
    "firstLevelSource": "店内流转",
    "secondLevelSource": "商品导流",
    "thirdLevelSource": "商品导流",
    "fourthLevelSource": "商品导流",
    "uv": 25,
    "pv": 58,
    "addCartUv": "1",
    "collectUv": "0",
    "payBuyerCnt": "1",
    "payConversionRatio": "4.00%",
    "payAmt": "3,299.00",
    "avgPrice": "3,299.00",
    "payItemCnt": "1",
    "itemId": "752102501302",
    "dateType": "DAY",
    "dateRangeStart": "2026-09-05",
    "dateRangeEnd": "2026-09-05",
    "bizDate": "20260905",
    "accountId": "101"
  }
]
```

---

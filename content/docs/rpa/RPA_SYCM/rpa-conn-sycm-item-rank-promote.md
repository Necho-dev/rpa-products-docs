---
title: 商品-商品排行-推广商品数据下载
description: 按日期类型（日/周/月）和日期参数下载生意参谋商品排行推广商品数据，支持天、自然周、自然月维度
entry: rpa.conn.sycm.item.rank.promote
badge:
  label: 已上线
  color: "#16A34A"
dataReady:
  time: 09:00:00
  cycle: daily
  description: 生意参谋大部分核心数据模块（流量、商品、市场等）昨日数据在上午 9 点前完成更新
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响；高峰期或数据量较大时可能延长至约 10分钟。
category: item
---

| 属性             | 值                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                                               |
| **连接器名称**   | `ODS_商品排行推广商品数据下载(生意参谋RPA)`                                                |
| **连接器代码**   | `rpa.conn.sycm.item.rank.promote`                                                          |
| **操作类型**     | `文件导出`                                                                                 |
| **目标网页**     | `https://sycm.taobao.com/cc/item_rank`                                                     |
| **适用场景**     | 按日期类型（日/周/月）和日期参数下载生意参谋商品排行推广商品数据，支持天、自然周、自然月维度 |
| **数据表名**     | `ods_rpa_sycm_item_rank_promote_du`                                                        |
| **业务表名**     | `ODS_商品排行推广商品数据下载(生意参谋RPA)`                                                |

### 目标页面

> **取数路径**：生意参谋—商品—商品排行—推广商品
>
> **取数链接**：[https://sycm.taobao.com/cc/item_rank](https://sycm.taobao.com/cc/item_rank)

![生意参谋—商品排行推广商品数据下载](../_public/images/sycm/rank_promote_20260430.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_type` | 日期类型 | `String` | 是 | — | 可选值：`day`（天）/ `week`（自然周）/ `month`（自然月） |
| `biz_date` | 业务日期 | `String` | 是 | — | 格式：`YYYYMMDD` 或 `YYYY-MM-DD`；`day` 最晚昨天、`week` 最晚上一完整周、`month` 最晚上个月 |

### 入参样例

按「天」维度查询（`YYYYMMDD`）：

```json
{
  "date_type": "day",
  "biz_date": "20260419"
}
```

按「天」维度查询（`YYYY-MM-DD`）：

```json
{
  "date_type": "day",
  "biz_date": "2026-04-19"
}
```

按「自然周」维度查询：传入该周内任意一天，系统自动对齐到周一～周日：

```json
{
  "date_type": "week",
  "biz_date": "20260414"
}
```

按「自然月」维度查询：传入该月内任意一天，系统自动对齐到月初～月末：

```json
{
  "date_type": "month",
  "biz_date": "20260301"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-商品排行推广商品数据下载 - 查询入参",
  "description": "按日期类型（日/周/月）和日期参数下载生意参谋商品排行推广商品数据，支持天、自然周、自然月维度",
  "type": "object",
  "properties": {
    "date_type": {
      "type": "string",
      "description": "日期类型。可选值：day（天）/ week（自然周）/ month（自然月）",
      "enum": ["day", "week", "month"]
    },
    "biz_date": {
      "type": "string",
      "description": "业务日期。格式 YYYYMMDD 或 YYYY-MM-DD；day 最晚昨天、week 最晚上一完整周、month 最晚上个月",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": ["date_type", "biz_date"],
  "additionalProperties": false
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `statDate` | 统计日期 | `String` | 否 | `XLS.0.统计日期` | 2026-04-29 |
| `itemId` | 商品 ID | `Number` | 否 | `XLS.0.商品ID` | `988****428` (已脱敏) |
| `itemTitle` | 商品名称 | `String` | 否 | `XLS.0.商品名称` | `松下小****一体` (已脱敏) |
| `promoCost` | 推广消耗 | `Number` | 否 | `XLS.0.推广消耗` | 123.21 |
| `directGuidePayAmt` | 直接引导成交金额 | `Number` | 否 | `XLS.0.直接引导成交金额` | 0.0 |
| `promoDirectRoi` | 推广直接 ROI | `Number` | 否 | `XLS.0.推广直接ROI` | 0.0 |
| `impressionCnt` | 展现量 | `Number` | 否 | `XLS.0.展现量` | 3736 |
| `clickCnt` | 点击量 | `Number` | 否 | `XLS.0.点击量` | 145 |
| `clickRate` | 点击率 | `String` | 否 | `XLS.0.点击率` | 3.88% |
| `cpc` | 单次点击成本 | `Number` | 否 | `XLS.0.单次点击成本` | 0.85 |
| `directPayOrdCnt` | 直接成交笔数 | `Number` | 否 | `XLS.0.直接成交笔数` | 0 |
| `totalGuidePayAmt` | 总引导成交金额 | `String` | 否 | `XLS.0.总引导成交金额` | 4,918.00 |
| `totalRoi` | 总 ROI | `Number` | 否 | `XLS.0.总ROI` | 39.92 |
| `totalGuidePayOrdCnt` | 总引导成交笔数 | `Number` | 否 | `XLS.0.总引导成交笔数` | 2 |
| `taskId` | 任务 ID | `String` | 否 | 附加 | `dev****062` (已脱敏) |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | 20260429 |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****1` (已脱敏) |

### 数据样例

```json
[
  {
    "statDate": "2026-04-29",
    "itemId": "988****428",
    "itemTitle": "松下小****一体",
    "promoCost": 123.21,
    "directGuidePayAmt": 0.0,
    "promoDirectRoi": 0.0,
    "impressionCnt": 3736,
    "clickCnt": 145,
    "clickRate": "3.88%",
    "cpc": 0.85,
    "directPayOrdCnt": 0,
    "totalGuidePayAmt": "4,918.00",
    "totalRoi": 39.92,
    "totalGuidePayOrdCnt": 2,
    "taskId": "dev****062",
    "bizDate": "20260429",
    "accountId": "1****1"
  }
]
```

---

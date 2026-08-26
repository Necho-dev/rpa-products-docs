---
title: 流量-商品来源-付费推广流量趋势
description: 按商品 ID 与统计时间下载生意参谋商品来源页「付费推广」流量趋势明细，输出按日拆分的访客、浏览、加购、支付等指标
entry: rpa.conn.sycm.flow.item.source.trends.report
badge:
  label: 待上线
  color: "#EA580C"
dataReady:
  time: "09:00:00"
  cycle: daily
  description: 生意参谋大部分核心数据模块（流量、商品、市场等）昨日数据在上午 9 点前完成更新
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响。
module:
  group: flow
---

| 属性             | 值                                                                 |
| ---------------- | ------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                       |
| **连接器名称**   | `ODS_流量商品来源流量趋势明细报表(生意参谋RPA)`                    |
| **连接器代码**   | `rpa.conn.sycm.flow.item.source.trends.report`                     |
| **操作类型**     | `文件导出`                                                         |
| **目标网页**     | `https://sycm.taobao.com/flow/monitor/itemsource`                |
| **适用场景**     | 按商品 ID 与统计时间下载生意参谋商品来源页「付费推广」流量趋势明细，输出按日拆分的访客、浏览、加购、支付等指标 |
| **数据表名**     | `ods_rpa_sycm_flow_item_source_trends_report_du`                   |
| **业务表名**     | `ODS_流量商品来源流量趋势明细报表(生意参谋RPA)`                    |

### 目标页面

> **取数路径**：生意参谋—流量—商品来源—付费推广—流量趋势
>
> **取数链接**：[https://sycm.taobao.com/flow/monitor/itemsource](https://sycm.taobao.com/flow/monitor/itemsource)

![生意参谋—商品来源—付费推广流量趋势](../_public/images/sycm/flow_item_source_trends_report_20260825.png)

未订购生意参谋标准包的账号、当前商品无「付费推广」来源行或趋势入口不可见时，连接器返回空数据，属正常现象：分别对应 `success=true`、`message=当前账号未订购生意参谋标准包，返回空数据` 或 `message=当前商品无可用付费推广趋势入口，返回空数据`、`data=[]`。采集成功时 `message=商品来源流量趋势采集完成, 共计 N 条记录`（N 为实际条数）。不支持 `date_type=today`（当天页面无趋势下载入口）。

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `selfItemId` | 商品 ID | `String` | 是 | — | 10~15 位数字字符串 |
| `date_type` | 统计时间类型 | `String` | 否 | `day` | 可选值：`recent7`（7天）/ `recent30`（30天）/ `day`（日）/ `week`（周）/ `month`（月）。**不支持** `today` |
| `biz_date` | 业务日期 | `String` | 条件必填 | `day` 缺省 T-1 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`。`date_type=week/month` 时必填；`day` 未传时默认 T-1；`date_type` 与 `biz_date` 都未传时等价于 `day` + T-1；`recent7`/`recent30` 忽略本字段。`week`/`month` 传入任意落在目标周/月内的日期即可，连接器归一化为整周/整月区间 |

### 入参样例

仅商品 ID（`date_type`、`biz_date` 都未传 → 默认 `day` + 昨天 T-1）：

```json
{
  "selfItemId": "826562939262"
}
```

按商品 + 默认昨天（等价于上例）：

```json
{
  "selfItemId": "826562939262",
  "date_type": "day"
}
```

指定自然日：

```json
{
  "selfItemId": "826562939262",
  "date_type": "day",
  "biz_date": "2026-08-24"
}
```

近 7 天（忽略 `biz_date`）：

```json
{
  "selfItemId": "826562939262",
  "date_type": "recent7"
}
```

近 30 天（忽略 `biz_date`）：

```json
{
  "selfItemId": "826562939262",
  "date_type": "recent30"
}
```

按周（`biz_date` 落在该周内任意一天即可）：

```json
{
  "selfItemId": "826562939262",
  "date_type": "week",
  "biz_date": "2026-08-20"
}
```

按月（`biz_date` 落在该月内任意一天即可）：

```json
{
  "selfItemId": "826562939262",
  "date_type": "month",
  "biz_date": "2026-01-27"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-商品来源-付费推广流量趋势 - 查询入参",
  "description": "按商品 ID 与统计时间下载生意参谋商品来源页「付费推广」流量趋势明细，输出按日拆分的访客、浏览、加购、支付等指标",
  "type": "object",
  "properties": {
    "selfItemId": {
      "type": "string",
      "description": "商品 ID，10~15 位数字字符串",
      "pattern": "^\\d{10,15}$"
    },
    "date_type": {
      "type": "string",
      "description": "统计时间类型，未传默认 day。可选值：recent7（7天）/ recent30（30天）/ day（日）/ week（周）/ month（月）。不支持 today",
      "enum": ["recent7", "recent30", "day", "week", "month"],
      "default": "day"
    },
    "biz_date": {
      "type": "string",
      "description": "业务日期。date_type=week/month 时必填；day 未传默认 T-1；date_type 与 biz_date 都未传时等价 day+T-1；recent7/recent30 忽略。week/month 须落在对应自然周/月内（归一化为整周/整月）。格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": ["selfItemId"],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": { "date_type": { "enum": ["week", "month"] } },
        "required": ["date_type"]
      },
      "then": { "required": ["biz_date"] }
    }
  ]
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `statDate` | 统计时间 | `String` | 否 | `XLS.0.统计时间` | `2026-07-26` |
| `uv` | 访客数 | `String` | 是 | `XLS.0.访客数` | `4` |
| `pv` | 浏览量 | `String` | 是 | `XLS.0.浏览量` | `4` |
| `addCartUv` | 加购人数 | `String` | 是 | `XLS.0.加购人数` | `-` |
| `collectUv` | 商品收藏人数 | `String` | 是 | `XLS.0.商品收藏人数` | `-` |
| `payBuyerCnt` | 支付买家数 | `String` | 是 | `XLS.0.支付买家数` | `-` |
| `payConversionRatio` | 支付转化率 | `String` | 是 | `XLS.0.支付转化率` | `-` |
| `payAmt` | 支付金额 | `String` | 是 | `XLS.0.支付金额` | `-` |
| `avgPrice` | 客单价 | `String` | 是 | `XLS.0.客单价` | `-` |
| `payItemCnt` | 支付件数 | `String` | 是 | `XLS.0.支付件数` | `-` |
| `selfItemId` | 商品 ID | `String` | 否 | 附加，来自入参 | `826****262` (已脱敏) |
| `dateType` | 统计时间类型 | `String` | 否 | 附加，来自入参 `date_type` | `day` |
| `dateRangeStart` | 统计区间起始日 | `String` | 否 | 附加 | `2026-08-24` |
| `dateRangeEnd` | 统计区间结束日 | `String` | 否 | 附加 | `2026-08-24` |
| `bizDate` | 业务日期 | `String` | 否 | 附加，取统计区间结束日 `YYYYMMDD` | `20260824` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****1` (已脱敏) |

### 数据样例

```json
[
  {
    "statDate": "2026-07-26",
    "uv": "4",
    "pv": "4",
    "addCartUv": "-",
    "collectUv": "-",
    "payBuyerCnt": "-",
    "payConversionRatio": "-",
    "payAmt": "-",
    "avgPrice": "-",
    "payItemCnt": "-",
    "bizDate": "20260824",
    "accountId": "1****1",
    "selfItemId": "826****262",
    "dateType": "day",
    "dateRangeStart": "2026-08-24",
    "dateRangeEnd": "2026-08-24"
  }
]
```

---

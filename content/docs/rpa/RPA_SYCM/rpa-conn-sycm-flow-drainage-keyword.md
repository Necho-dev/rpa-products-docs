---
title: 流量-搜索词分析-引流搜索关键词
description: 按 7天/日 导出「引流搜索关键词」明细报表，获得引流侧搜索词效果（UV、加购、收藏、支付、UV 价值等）与流量转化
entry: rpa.conn.sycm.flow.drainage.keyword
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
---

| 属性             | 值                                                                                |
| ---------------- | --------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_流量引流搜索关键词列表下载(生意参谋RPA)`|
| **连接器代码**   | `rpa.conn.sycm.flow.drainage.keyword`|
| **操作类型**     | `文件导出`|
| **目标网页**     | `https://sycm.taobao.com/flow/monitor/keyword_assistant`|
| **适用场景**     | 导出「引流搜索关键词」明细报表，获得引流侧搜索词效果（UV、加购、收藏、支付、UV 价值等）与流量转化|
| **数据表名**     | `ods_rpa_sycm_flow_drainage_keyword_du`|
| **业务表名**     | `ODS_流量引流搜索关键词列表下载(生意参谋RPA)`|

### 目标页面

> **取数路径**：生意参谋—流量—搜索词分析—引流搜索关键词
>
> **取数链接**：[https://sycm.taobao.com/flow/monitor/keyword_assistant](https://sycm.taobao.com/flow/monitor/keyword_assistant)

![生意参谋—引流搜索关键词](../_public/images/sycm/flow_drainage_keyword_20260521.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_type` | 统计时间类型 | `String` | 否 | `day` | 可选值：`recent7`（7天）/ `day`（日）。页面只有实时、7天、日；实时无下载，不开放 |
| `biz_date` | 业务日期 | `String` | 否 | `day` 都空则昨日 T-1 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`。`recent7` 忽略本参数。日不可选今日及以后 |

### 入参样例

按日（默认昨天）：

```json
{
  "date_type": "day"
}
```

指定自然日：

```json
{
  "date_type": "day",
  "biz_date": "2026-08-05"
}
```

近 7 天：

```json
{
  "date_type": "recent7"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-引流搜索关键词 - 查询入参",
  "description": "按 7天/日 导出引流搜索关键词明细",
  "type": "object",
  "properties": {
    "date_type": {
      "type": "string",
      "description": "统计时间类型，未传默认 day。可选值：recent7（7天）/ day（日）。不开放实时、周、月",
      "enum": ["recent7", "day"],
      "default": "day"
    },
    "biz_date": {
      "type": "string",
      "description": "业务日期；day 都空则昨日 T-1；recent7 时忽略。格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

### 数据字段

| 字段            | 中文释义   | 数据类型              | 可为空 | 取数路径           | 示例 |
| --------------- | ---------- | --------------------- | ------ | ------------------ | ---- |
| `statDate`      | 统计日期   | `string` | 否     | `XLS.0.统计日期`   | 2026-04-14 |
| `keyword`       | 搜索词     | `string` | 否     | `XLS.0.搜索词`     | 内衣洗衣机 |
| `uv`            | 访客数     | `number`  | 否     | `XLS.0.访客数`     | 7 |
| `addCartUv`     | 加购人数   | `number`  | 否     | `XLS.0.加购人数`   | 0 |
| `collectUv`     | 商品收藏人数 | `number` | 否   | `XLS.0.商品收藏人数` | 0 |
| `payBuyerCnt`   | 支付买家数 | `number`  | 否     | `XLS.0.支付买家数` | 0 |
| `payConversionRatio`        | 支付转化率 | `string` | 否     | `XLS.0.支付转化率` | 0.00% |
| `payItemCnt`    | 支付件数   | `number`  | 是     | `XLS.0.支付件数`   | - |
| `payAmt`        | 支付金额   | `string` | 是     | `XLS.0.支付金额`   | - |
| `avgPrice`      | 客单价     | `number`  | 是     | `XLS.0.客单价`     | - |
| `uvValue`       | UV 价值    | `number`  | 是     | `XLS.0.UV价值`     | - |
| `dateType`      | 统计时间类型 | `String` | 否   | 附加，来自入参 `date_type` | `day` |
| `dateRangeStart` | 统计区间起始日 | `String` | 否 | 附加 | `2026-08-05` |
| `dateRangeEnd`  | 统计区间结束日 | `String` | 否   | 附加 | `2026-08-05` |
| `bizDate`       | 业务日期   | `string` | 否     | 附加，取区间结束日 `YYYYMMDD` | |
| `accountId`     | 授权 ID    | `string` | 否     | 附加 | |

### 数据样例

```json
[
  {
    "statDate": "2026-04-14",
    "keyword": "内衣洗衣机",
    "uv": 7,
    "addCartUv": 0,
    "collectUv": 0,
    "payBuyerCnt": 0,
    "payConversionRatio": "0.00%",
    "payAmt": "-",
    "avgPrice": "-",
    "uvValue": "-",
    "dateType": "day",
    "dateRangeStart": "2026-04-14",
    "dateRangeEnd": "2026-04-14",
    "bizDate": "20260414",
    "accountId": "101"
  }
]
```

---

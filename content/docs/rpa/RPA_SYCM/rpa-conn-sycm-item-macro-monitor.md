---
title: 商品-宏观监控-数据下载
description: 采集生意参谋宏观监控页面按 7天/30天/日/周/月 的商品经营数据，含支付、加购、访客、转化率等核心指标
entry: rpa.conn.sycm.item.macro.monitor
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

| 属性             | 值                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_商品宏观监控日更指标数据下载(生意参谋RPA)`|
| **连接器代码**   | `rpa.conn.sycm.item.macro.monitor`|
| **操作类型**     | `文件导出`|
| **目标网页**     | `https://sycm.taobao.com/cc/macro_monitor`|
| **适用场景**     | 采集生意参谋宏观监控页面按 7天/30天/日/周/月 的商品经营数据，含支付、加购、访客、转化率等核心指标|
| **数据表名**     | `ods_rpa_sycm_item_macro_monitor_du`|
| **业务表名**     | `ODS_商品宏观监控日更指标数据下载(生意参谋RPA)`|

### 目标页面

> **取数路径**：生意参谋—商品—宏观监控
>
> **取数链接**：[https://sycm.taobao.com/cc/macro_monitor](https://sycm.taobao.com/cc/macro_monitor)

![生意参谋—宏观监控数据下载](../_public/images/sycm/macro_monitor_20260429.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_type` | 统计时间类型 | `String` | 否 | `day` | 可选值：`recent7`（7天）/ `recent30`（30天）/ `day`（日）/ `week`（周）/ `month`（月）。不开放实时、自定义 |
| `biz_date` | 业务日期 | `String` | 条件必填 | `day` 都空则昨日 T-1 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`。`week`/`month` 必填；`recent7`/`recent30` 忽略本参数。日不可选今日及以后；周只接受已结束的完整周（周一至周日）；月只接受已结束的完整月 |

### 入参样例

按日（默认昨天，可不传 `biz_date`）：

```json
{
  "date_type": "day"
}
```

指定自然日（`YYYY-MM-DD`）：

```json
{
  "date_type": "day",
  "biz_date": "2026-08-05"
}
```

指定自然日（`YYYYMMDD`）：

```json
{
  "date_type": "day",
  "biz_date": "20260305"
}
```

近 7 天：

```json
{
  "date_type": "recent7"
}
```

按周（传入该周内任意一天）：

```json
{
  "date_type": "week",
  "biz_date": "2025-11-05"
}
```

按月：

```json
{
  "date_type": "month",
  "biz_date": "2025-06-15"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-商品宏观监控 - 查询入参",
  "description": "采集生意参谋宏观监控页面按 7天/30天/日/周/月 的商品经营数据，含支付、加购、访客、转化率等核心指标",
  "type": "object",
  "properties": {
    "date_type": {
      "type": "string",
      "description": "统计时间类型，未传默认 day。可选值：recent7（7天）/ recent30（30天）/ day（日）/ week（周）/ month（月）。不开放实时、自定义",
      "enum": ["recent7", "recent30", "day", "week", "month"],
      "default": "day"
    },
    "biz_date": {
      "type": "string",
      "description": "业务日期；week/month 时必填；day 都空则昨日 T-1；recent7/recent30 时忽略。格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": [],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "date_type": {
            "enum": ["week", "month"]
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

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `stat_date` | 统计日期 | `String` | 否 | `XLS.0.统计日期` | `2025-01-27` |
| `refund_amt` | 成功退货退款金额 | `String` | 是 | `XLS.0.成功退货退款金额` | `14,414.00` |
| `pay_amt` | 支付金额 | `String` | 是 | `XLS.0.支付金额` | `10,095.00` |
| `installment_pay_amt` | 分期支付金额 | `Number` | 是 | `XLS.0.分期支付金额` | `0.0` |
| `pay_item_cnt` | 支付件数 | `Number` | 是 | `XLS.0.支付件数` | `5` |
| `item_cart_buyer_cnt` | 商品加购人数 | `String` | 是 | `XLS.0.商品加购人数` | `39` |
| `item_cart_cnt` | 商品加购件数 | `String` | 是 | `XLS.0.商品加购件数` | `47` |
| `item_pv` | 商品浏览量 | `String` | 是 | `XLS.0.商品浏览量` | `2,133` |
| `item_uv` | 商品访客数 | `String` | 是 | `XLS.0.商品访客数` | `877` |
| `mini_detail_uv` | 商品微详情访客数 | `String` | 是 | `XLS.0.商品微详情访客数` | `222` |
| `item_collect_buyer_cnt` | 商品收藏人数 | `Number` | 是 | `XLS.0.商品收藏人数` | `8` |
| `avg_stay_duration` | 商品平均停留时长 | `Number` | 是 | `XLS.0.商品平均停留时长` | `18` |
| `order_buyer_cnt` | 下单买家数 | `Number` | 是 | `XLS.0.下单买家数` | `4` |
| `pay_buyer_cnt` | 支付买家数 | `Number` | 是 | `XLS.0.支付买家数` | `2` |
| `order_convert_rate` | 下单转化率 | `String` | 是 | `XLS.0.下单转化率` | `0.45%` |
| `detail_bounce_rate` | 商品详情页跳出率 | `String` | 是 | `XLS.0.商品详情页跳出率` | `0.00%` |
| `order_amt` | 下单金额 | `String` | 是 | `XLS.0.下单金额` | `20,692.00` |
| `visit_collect_rate` | 访问收藏转化率 | `String` | 是 | `XLS.0.访问收藏转化率` | `0.89%` |
| `cart_convert_rate` | 访问加购转化率 | `String` | 是 | `XLS.0.访问加购转化率` | `4.45%` |
| `pay_old_buyer_cnt` | 支付老买家数 | `Number` | 是 | `XLS.0.支付老买家数` | `0` |
| `old_buyer_pay_amt` | 老买家支付金额 | `Number` | 是 | `XLS.0.老买家支付金额` | `0.0` |
| `pay_convert_rate` | 支付转化率 | `String` | 是 | `XLS.0.支付转化率` | `0.23%` |
| `pay_new_buyer_cnt` | 支付新买家数 | `Number` | 是 | `XLS.0.支付新买家数` | `0` |
| `pay_item_num` | 有支付商品数 | `Number` | 是 | `XLS.0.有支付商品数` | `3` |
| `order_item_cnt` | 下单件数 | `Number` | 是 | `XLS.0.下单件数` | `8` |
| `visit_item_num` | 有访问商品数 | `Number` | 是 | `XLS.0.有访问商品数` | `75` |
| `avg_price_per_buyer` | 客单价 | `String` | 是 | `XLS.0.客单价` | `5,047.50` |
| `dateType` | 统计时间类型 | `String` | 否 | 附加，来自入参 `date_type` | `day` |
| `dateRangeStart` | 统计区间起始日 | `String` | 否 | 附加 | `2026-08-05` |
| `dateRangeEnd` | 统计区间结束日 | `String` | 否 | 附加 | `2026-08-05` |
| `bizDate` | 业务日期 | `String` | 否 | 附加，取区间结束日 `YYYYMMDD` | `20260805` |
| `accountId` | 授权 ID | `String` | 否 | 附加 |  |
| `taskId` | 任务 ID | `String` | 否 | 附加 |  |

### 数据样例

```json
{
    "stat_date": "2025-01-27",
    "refund_amt": "14,414.00",
    "pay_amt": "10,095.00",
    "installment_pay_amt": 0.0,
    "pay_item_cnt": 5,
    "item_cart_buyer_cnt": "39",
    "item_cart_cnt": "47",
    "item_pv": "2,133",
    "item_uv": "877",
    "mini_detail_uv": "222",
    "item_collect_buyer_cnt": 8,
    "avg_stay_duration": 18,
    "order_buyer_cnt": 4,
    "pay_buyer_cnt": 2,
    "order_convert_rate": "0.45%",
    "detail_bounce_rate": "0.00%",
    "order_amt": "20,692.00",
    "visit_collect_rate": "0.89%",
    "cart_convert_rate": "4.45%",
    "pay_old_buyer_cnt": 0,
    "old_buyer_pay_amt": 0.0,
    "pay_convert_rate": "0.23%",
    "pay_new_buyer_cnt": 0,
    "pay_item_num": 3,
    "order_item_cnt": 8,
    "visit_item_num": 75,
    "avg_price_per_buyer": "5,047.50",
    "dateType": "day",
    "dateRangeStart": "2025-01-27",
    "dateRangeEnd": "2025-01-27",
    "bizDate": "20250127",
    "accountId": "101",
    "taskId": "dev-0-eb0baf43"
}
```

---

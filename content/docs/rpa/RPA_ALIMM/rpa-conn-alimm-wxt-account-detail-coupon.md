---
title: 万相台-账户-优惠券花费明细
description: 导出阿里妈妈万相台账户明细中的优惠券花费明细，支持按券类型与日期范围筛选
entry: rpa.conn.alimm.wxt.account.detail.coupon
badge:
  label: 待上线
  color: "#EA580C"
estimatedDuration:
  sec: 300
module:
  group: wxt
---

| 属性             | 值                                                                 |
| ---------------- | ------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                       |
| **连接器名称**   | `ODS_万相台账户优惠券花费明细表(阿里妈妈RPA)`                      |
| **连接器代码**   | `rpa.conn.alimm.wxt.account.detail.coupon`                         |
| **操作类型**     | `文件导出`                                                         |
| **目标网页**     | `https://one.alimama.com/index.html#!/account/detail`              |
| **适用场景**     | 导出阿里妈妈万相台账户明细中的优惠券花费明细，支持按券类型与日期范围筛选 |
| **数据表名**     | `ods_rpa_alimm_wxt_account_detail_coupon_du`                       |
| **业务表名**     | `ODS_万相台账户优惠券花费明细表(阿里妈妈RPA)`                      |

### 目标页面

> **取数路径**：阿里妈妈—万相台—账户—账户明细—优惠券花费明细
>
> **取数链接**：[https://one.alimama.com/index.html#!/account/detail](https://one.alimama.com/index.html#!/account/detail)

![阿里妈妈—万相台优惠券花费明细](../public/images/alimm/wxt_account_detail_coupon_20260713.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `coupon_type` | 券类型 | `String` | 否 | `all` | 可选值：`all`（全部券类型）/ `cash`（现金券）/ `discount`（满折券）/ `order`（订单券）/ `voucher`（代金券）；不支持空字符串 `""`，全部须传 `all` |
| `start_date` | 起始日期 | `String` | 是 | — | 对应页面日期范围开始；格式 `YYYYMMDD` 或 `YYYY-MM-DD`；不能晚于 `end_date` |
| `end_date` | 结束日期 | `String` | 是 | — | 对应页面日期范围结束；格式 `YYYYMMDD` 或 `YYYY-MM-DD`；不能晚于今天 |

### 入参样例

```json
{
  "coupon_type": "all",
  "start_date": "20260601",
  "end_date": "20260713"
}
```

```json
{
  "coupon_type": "cash",
  "start_date": "2026-06-01",
  "end_date": "2026-07-13"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "阿里妈妈-万相台优惠券花费明细 - 查询入参",
  "description": "导出阿里妈妈万相台账户明细中的优惠券花费明细，支持按券类型与日期范围筛选",
  "type": "object",
  "properties": {
    "coupon_type": {
      "type": "string",
      "description": "券类型。可选值：all（全部券类型）/ cash（现金券）/ discount（满折券）/ order（订单券）/ voucher（代金券）；不支持空字符串，全部须传 all",
      "enum": ["all", "cash", "discount", "order", "voucher"],
      "default": "all"
    },
    "start_date": {
      "type": "string",
      "description": "起始日期，对应页面日期范围开始。格式 YYYYMMDD 或 YYYY-MM-DD；不能晚于 end_date",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "end_date": {
      "type": "string",
      "description": "结束日期，对应页面日期范围结束。格式 YYYYMMDD 或 YYYY-MM-DD；不能晚于今天",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": ["start_date", "end_date"],
  "additionalProperties": false
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `settleTime` | 记账日期 | `String` | 否 | `CSV.0.记账日期` | `2026-06-30` |
| `couponName` | 优惠券名称 | `String` | 否 | `CSV.0.优惠券名称` | `异常秒退订单返款 (-1)` |
| `couponType` | 券类型 | `String` | 否 | `CSV.0.券类型` | `代金券` |
| `changeType` | 使用方式 | `String` | 否 | `CSV.0.使用方式` | `扣款` |
| `amount` | 操作金额（元） | `Number` | 否 | `CSV.0.操作金额(元)` | `-1` |
| `remark` | 备注 | `String` | 是 | `CSV.0.备注` | `20260629券消耗扣款` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260713` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `108` |

### 数据样例

```json
{
  "settleTime": "2026-06-30",
  "couponName": "异常秒退订单返款 (-1)",
  "couponType": "代金券",
  "changeType": "扣款",
  "amount": -1,
  "remark": "20260629券消耗扣款",
  "bizDate": "20260713",
  "accountId": "108"
}
```

---

---
title: 财务-保证金账户-结算资金账单明细
description: 导出千牛保证金账户「结算资金」账单明细，支持快捷时间范围或自定义起止日期
entry: rpa.conn.qianniu.finance.bail.account.detail
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  sec: 210
  description: 导出文件通常需要约 20 分钟生成，任务高峰期可能会延长
module:
  group: finance
---

:::warning[页面兼容性说明]
当前连接器目标页面只支持**天猫平台**的店铺，暂不兼容**淘宝C店**，请确认后使用！
:::

| 属性             | 值                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                                                   |
| **连接器名称**   | `ODS_财务保证金结算资金账单明细表(千牛RPA)`                                                                 |
| **连接器代码**   | `rpa.conn.qianniu.finance.bail.account.detail`                                                                 |
| **操作类型**     | `文件导出`                                                                                                     |
| **目标网页**     | `https://myseller.taobao.com/home.htm/whale-accountant/bill/account-details`                                   |
| **适用场景**     | 导出千牛保证金账户「结算资金」账单明细，支持快捷时间范围或自定义起止日期                                       |
| **数据表名**     | `ods_rpa_qianniu_finance_bail_account_detail_du`                                                               |
| **业务表名**     | `ODS_财务保证金结算资金账单明细表(千牛RPA)`                                                                 |

### 目标页面

> **取数路径**：千牛—财务—保证金账户—账单明细
>
> **取数链接**：[https://myseller.taobao.com/home.htm/whale-accountant/bill/account-details](https://myseller.taobao.com/home.htm/whale-accountant/bill/account-details)

![千牛—保证金账户—结算资金账单明细](../_public/images/qianniu/finance_bail_account_detail_20260715.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_range_type` | 时间范围类型 | `String` | 否 | `LAST_30_DAYS` | 可选值：`YESTERDAY`（昨天）、`TODAY`（今天）、`LAST_7_DAYS`（7 日）、`LAST_30_DAYS`（30 日）、`THIS_MONTH`（本月）、`THIS_YEAR`（本年）、`CUSTOM`（自定义） |
| `custom_start_date` | 自定义开始日期 | `String` | 条件必填 | — | `date_range_type` 为 `CUSTOM` 时必填；支持格式：`YYYYMMDD`、`YYYY-MM-DD`；不得晚于今天；非 `CUSTOM` 模式不应传入 |
| `custom_end_date` | 自定义结束日期 | `String` | 条件必填 | — | `date_range_type` 为 `CUSTOM` 时必填；支持格式：`YYYYMMDD`、`YYYY-MM-DD`；不得晚于今天；与开始日期含首尾跨度不超过 365 天；非 `CUSTOM` 模式不应传入 |

### 入参样例

```json
{
  "date_range_type": "LAST_30_DAYS"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "千牛-结算资金账单明细 - 查询入参",
  "description": "导出千牛保证金账户「结算资金」账单明细，支持快捷时间范围或自定义起止日期",
  "type": "object",
  "properties": {
    "date_range_type": {
      "type": "string",
      "description": "时间范围类型。可选值：YESTERDAY（昨天）、TODAY（今天）、LAST_7_DAYS（7 日）、LAST_30_DAYS（30 日）、THIS_MONTH（本月）、THIS_YEAR（本年）、CUSTOM（自定义）",
      "enum": [
        "YESTERDAY",
        "TODAY",
        "LAST_7_DAYS",
        "LAST_30_DAYS",
        "THIS_MONTH",
        "THIS_YEAR",
        "CUSTOM"
      ],
      "default": "LAST_30_DAYS"
    },
    "custom_start_date": {
      "type": "string",
      "description": "自定义开始日期。date_range_type 为 CUSTOM 时必填；支持格式 YYYYMMDD、YYYY-MM-DD；不得晚于今天；非 CUSTOM 模式不应传入",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "自定义结束日期。date_range_type 为 CUSTOM 时必填；支持格式 YYYYMMDD、YYYY-MM-DD；不得晚于今天；与开始日期含首尾跨度不超过 365 天；非 CUSTOM 模式不应传入",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": [],
  "if": {
    "properties": {
      "date_range_type": {
        "const": "CUSTOM"
      }
    },
    "required": ["date_range_type"]
  },
  "then": {
    "required": ["custom_start_date", "custom_end_date"]
  },
  "else": {
    "not": {
      "anyOf": [
        {
          "required": ["custom_start_date"]
        },
        {
          "required": ["custom_end_date"]
        }
      ]
    }
  },
  "additionalProperties": false
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `completeTime` | 完成时间 | `String` | 否 | `XLSX.0.完成时间` | `2026-07-08 09:40:06` |
| `operationType` | 操作类型 | `String` | 否 | `XLSX.0.操作类型` | `出账` |
| `reason` | 原因 | `String` | 否 | `XLSX.0.原因` | `交易赔付/争议处理/运费争议` |
| `currency` | 币种 | `String` | 否 | `XLSX.0.币种` | `CNY` |
| `amount` | 收支金额（元） | `Number` | 否 | `XLSX.0.收支金额(元)` | `-7.9` |
| `sourceAccount` | 来源账户 | `String` | 否 | `XLSX.0.来源账户` | `保证金余额` |
| `destAccount` | 去向账户 | `String` | 否 | `XLSX.0.去向账户` | `消费者（***）` |
| `fundingType` | 出资类型 | `String` | 否 | `XLSX.0.出资类型` | `现金` |
| `bizDesc` | 业务描述 | `String` | 否 | `XLSX.0.业务描述` | `0070002&#124;其他支出-交易赔付（保证金扣款）` |
| `bizNo` | 业务编号 | `String` | 是 | `XLSX.0.业务编号` | — |
| `orderNo` | 订单编号 | `Number` | 是 | `XLSX.0.订单编号` | `5121428****6030737` |
| `remark` | 备注 | `String` | 是 | `XLSX.0.备注` | `-` |
| `sellerPlatform` | 店铺平台 | `String` | 否 | 附加 | `tmall` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 |  |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `***` |

### 数据样例

```json
[
  {
    "completeTime": "2026-07-08 09:40:06",
    "operationType": "出账",
    "reason": "交易赔付/争议处理/运费争议",
    "currency": "CNY",
    "amount": -7.9,
    "sourceAccount": "保证金余额",
    "destAccount": "消费者（***）",
    "fundingType": "现金",
    "bizDesc": "0070002|其他支出-交易赔付（保证金扣款）",
    "bizNo": null,
    "orderNo": "5121428****6030737",
    "remark": "-",
    "sellerPlatform": "tmall",
    "bizDate": "2026-07-08T16:00:00.000Z",
    "accountId": "***"
  }
]
```

---

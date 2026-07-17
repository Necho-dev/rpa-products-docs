---
title: 推广平台-工具-操作记录
description: 采集拼多多推广平台商品推广操作记录，支持按操作模块、操作类型、操作人和日期范围筛选
entry: rpa.conn.pinduoduo.promotion.tools.operate.log
badge:
  label: 待上线
  color: "#EA580C"
estimatedDuration:
  sec: 120
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响
module:
  group: mms
---

| 属性             | 值                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                                        |
| **连接器名称**   | `ODS_推广平台工具操作记录(拼多多RPA)`                                                               |
| **连接器代码**   | `rpa.conn.pinduoduo.promotion.tools.operate.log`                                                    |
| **操作类型**     | `页面解析`                                                                                          |
| **目标网页**     | `https://yingxiao.pinduoduo.com/tools/operate/log`                                                  |
| **适用场景**     | 采集拼多多推广平台商品推广操作记录，支持按操作模块、操作类型、操作人和日期范围筛选                  |
| **数据表名**     | `ods_rpa_pinduoduo_promotion_tools_operate_log_du`                                                  |
| **业务表名**     | `ODS_推广平台工具操作记录(拼多多RPA)`                                                               |

### 目标页面

> **取数路径**：拼多多推广平台—工具—操作记录—商品推广
>
> **取数链接**：[https://yingxiao.pinduoduo.com/tools/operate/log](https://yingxiao.pinduoduo.com/tools/operate/log)

![拼多多推广平台—工具-操作记录](../_public/images/pinduoduo/promotion_tools_operate_log_20260717.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `operation_module` | 操作模块 | `String` | 否 | `ALL` | 可选值：`ALL`（全部）、`PROMOTION`（推广）、`CREATIVE`（创意） |
| `operation_type` | 操作类型 | `String` | 否 | `ALL` | 可选值：`ALL`（全部）、`ADD`（添加）、`UPDATE`（更新）、`DELETE`（删除） |
| `operator_type` | 操作人类型 | `String` | 否 | `ALL` | 可选值：`ALL`（全部）、`MERCHANT`（商家）、`SYSTEM`（系统） |
| `custom_start_date` | 查询起始日期 | `String` | 条件必填 | 昨日 | 支持 `YYYYMMDD` 或 `YYYY-MM-DD`；不传日期时使用平台页面默认的昨日，传入时须与 `custom_end_date` 成对，且不能晚于结束日期 |
| `custom_end_date` | 查询结束日期 | `String` | 条件必填 | 昨日 | 支持 `YYYYMMDD` 或 `YYYY-MM-DD`；不传日期时使用平台页面默认的昨日，传入时须与 `custom_start_date` 成对，且不能早于起始日期 |

### 入参样例

```json
{
  "operation_module": "ALL",
  "operation_type": "ALL",
  "operator_type": "ALL",
  "custom_start_date": "20260716",
  "custom_end_date": "20260717"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "拼多多推广平台-工具-操作记录 - 查询入参",
  "description": "采集拼多多推广平台商品推广操作记录，支持按操作模块、操作类型、操作人和日期范围筛选",
  "type": "object",
  "properties": {
    "operation_module": {
      "type": "string",
      "description": "操作模块，可选全部、推广或创意",
      "enum": ["ALL", "PROMOTION", "CREATIVE"],
      "default": "ALL"
    },
    "operation_type": {
      "type": "string",
      "description": "操作类型，可选全部、添加、更新或删除",
      "enum": ["ALL", "ADD", "UPDATE", "DELETE"],
      "default": "ALL"
    },
    "operator_type": {
      "type": "string",
      "description": "操作人类型，可选全部、商家或系统",
      "enum": ["ALL", "MERCHANT", "SYSTEM"],
      "default": "ALL"
    },
    "custom_start_date": {
      "type": "string",
      "description": "查询起始日期，支持 YYYYMMDD 或 YYYY-MM-DD；不传日期时使用平台页面默认的昨日，传入时不能晚于结束日期",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "查询结束日期，支持 YYYYMMDD 或 YYYY-MM-DD；不传日期时使用平台页面默认的昨日，传入时不能早于起始日期",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": [],
  "dependentRequired": {
    "custom_start_date": ["custom_end_date"],
    "custom_end_date": ["custom_start_date"]
  },
  "additionalProperties": false
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `moduleType` | 操作模块类型 | `Number` | 是 | 页面解析 | `15` |
| `operateTime` | 操作时间 | `String` | 是 | 页面解析 | `2026-07-16 13:26:54` |
| `operationObject` | 操作对象 | `String` | 是 | 页面解析 | `「稳定****96）` (已脱敏) |
| `operationType` | 操作类型 | `Number` | 是 | 页面解析 | `2` |
| `id` | 操作记录 ID | `Number` | 是 | 页面解析 | `710****551` (已脱敏) |
| `columnChanges` | 字段变更明细 | `List[Dict]` | 是 | 页面解析 | `null` |
| `operatorId` | 操作人 ID | `Number` | 是 | 页面解析 | `164****036` (已脱敏) |
| `operatorName` | 操作人 | `String` | 是 | 页面解析 | `示例店铺****` (已脱敏) |
| `content` | 操作详情 | `String` | 是 | 页面解析 | `更新 ****54」` (已脱敏) |
| `operateCodeList` | 操作编码列表 | `List[Number]` | 是 | 页面解析 | `[157]` |
| `primaryKey` | 操作对象主键 | `Number` | 是 | 页面解析 | `973****821` (已脱敏) |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260717` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****8` (已脱敏) |

### 数据样例

```json
[
  {
    "moduleType": 15,
    "operateTime": "2026-07-16 13:26:54",
    "operationObject": "「稳定****96）",
    "operationType": 2,
    "id": "710****551",
    "columnChanges": null,
    "operatorId": "164****036",
    "operatorName": "示例店铺****",
    "content": "更新 ****54」",
    "operateCodeList": [157],
    "primaryKey": "973****821",
    "bizDate": "20260717",
    "accountId": "1****8"
  }
]
```

---

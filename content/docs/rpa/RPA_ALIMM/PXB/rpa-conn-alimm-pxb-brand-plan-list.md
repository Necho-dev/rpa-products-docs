---
title: 计划-品牌专区-计划列表
description: 采集合妈妈品销宝品牌专区推广计划列表及展现、点击、消耗等报表指标
entry: rpa.conn.alimm.pxb.brand.plan.list
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响
category: brand
---

| 属性             | 值                                                          |
| ---------------- | ----------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_品销宝品牌专区计划明细表(阿里妈妈RPA)`|
| **连接器代码**   | `rpa.conn.alimm.pxb.brand.plan.list`|
| **操作类型**     | `页面解析`|
| **目标网页**     | `https://branding.taobao.com/#!/plan/index`|
| **适用场景**     | 采集合妈妈品销宝品牌专区推广计划列表及展现、点击、消耗等报表指标|
| **数据表名**     | `ods_rpa_alimm_pxb_brand_plan_list_du`|
| **业务表名**     | `ODS_品销宝品牌专区计划明细表(阿里妈妈RPA)`|

### 目标页面

> **取数路径**：品销宝—计划—品牌专区—计划列表
>
> **取数链接**：[https://branding.taobao.com/#!/plan/index](https://branding.taobao.com/#!/plan/index)

![品销宝—计划—品牌专区—计划列表](../../_public/images/alimm/pxb_brand_plan_list_20260610.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `status` | 计划状态 | `String` | 否 | `VALID` | 允许值：`ALL`（全部状态）/ `VALID`（有效计划）/ `RUNNING`（正在投放）/ `PAUSED`（暂停投放）/ `WAITING`（等待投放）/ `ENDED`（结束投放） |
| `date_type` | 统计时间类型 | `String` | 是 | `-` | 允许值：`TODAY`（今日）/ `YESTERDAY`（昨日）/ `LAST_7_DAYS`（近 7 天）/ `LAST_15_DAYS`（近 15 天）/ `LAST_30_DAYS`（近 30 天）/ `THIS_MONTH`（本月）/ `LAST_MONTH`（上月）/ `CUSTOM`（自定义区间） |
| `custom_start_date` | 自定义起始日期 | `String` | 条件必填 | `-` | `date_type` 为 `CUSTOM` 时必填；格式 `YYYYMMDD` 或 `YYYY-MM-DD` |
| `custom_end_date` | 自定义结束日期 | `String` | 条件必填 | `-` | `date_type` 为 `CUSTOM` 时必填；格式 `YYYYMMDD` 或 `YYYY-MM-DD`；最晚为今天 |
| `search_plan` | 搜索计划关键词 | `String` | 否 | `-` | 按计划名称模糊搜索 |

### 入参样例

`YYYYMMDD`：

```json
{
    "status": "ALL",
    "date_type": "CUSTOM",
    "custom_start_date": "20260101",
    "custom_end_date": "20260610",
    "search_plan": ""
}
```

`YYYY-MM-DD`：

```json
{
    "status": "",
    "date_type": "CUSTOM",
    "custom_start_date": "2026-01-01",
    "custom_end_date": "2026-06-10",
    "search_plan": ""
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "计划-品牌专区-计划列表 - 查询入参",
  "description": "采集品销宝品牌专区推广计划列表",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "计划状态，允许值 ALL（全部状态）/ VALID（有效计划）/ RUNNING（正在投放）/ PAUSED（暂停投放）/ WAITING（等待投放）/ ENDED（结束投放）",
      "default": "VALID"
    },
    "date_type": {
      "type": "string",
      "description": "统计时间类型，允许值 TODAY（今日）/ YESTERDAY（昨日）/ LAST_7_DAYS（近 7 天）/ LAST_15_DAYS（近 15 天）/ LAST_30_DAYS（近 30 天）/ THIS_MONTH（本月）/ LAST_MONTH（上月）/ CUSTOM（自定义区间）",
      "enum": ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_15_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH", "CUSTOM"]
    },
    "custom_start_date": {
      "type": "string",
      "description": "自定义起始日期，date_type=CUSTOM 时必填，格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "自定义结束日期，date_type=CUSTOM 时必填，格式 YYYYMMDD 或 YYYY-MM-DD；最晚为今天",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "search_plan": {
      "type": "string",
      "description": "搜索计划关键词"
    }
  },
  "required": ["date_type"],
  "allOf": [
    {
      "if": {
        "properties": { "date_type": { "const": "CUSTOM" } },
        "required": ["date_type"]
      },
      "then": {
        "required": ["custom_start_date", "custom_end_date"]
      }
    }
  ],
  "additionalProperties": false
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `campaignId` | 推广计划 ID | `number` | 否 | `campaignId` | `14127726028` |
| `campaignName` | 推广计划名称 | `string` | 否 | `campaignName` | `Y26_洗发水` |
| `campaignType` | 计划类型 | `number` | 否 | `campaignType` | `1` |
| `contractId` | 合同 ID | `number` | 否 | `contractId` | `276347` |
| `contractName` | 合同名称 | `string` | 否 | `contractName` | `2026年品牌专区_兔头妈妈_1.1-12.31` |
| `startTime` | 投放开始时间 | `string` | 否 | `beginTime` | `2026-05-09 00:00:00` |
| `endTime` | 投放结束时间 | `string` | 否 | `endTime` | `2026-12-31 00:00:00` |
| `status` | 计划状态 | `number` | 否 | `status` | `2` |
| `lifeCycle` | 生命周期状态码 | `number` | 否 | `lifeCycle` | `99` |
| `productId` | 产品线 ID | `number` | 否 | `productId` | `101005201` |
| `campaignNoEnough` | 创意是否不足 | `boolean` | 否 | `campaignNoEnough` | `true` |
| `campaignReasonDesc` | 创意不足说明 | `string` | 是 | `campaignReasonDesc` | ` 该计划下单元（y26洗发水）无有效创意，请及时上传创意，避免投放期间无展现;` |
| `impression` | 展现量 | `number` | 否 | `impression` | `5905.0` |
| `click` | 总点击量 | `number` | 否 | `click` | `1334.0` |
| `shopClick` | 跳转点击量 | `number` | 否 | `shopclick` | `1334.0` |
| `interactClick` | 互动点击量 | `number` | 否 | `interactclick` | `0.0` |
| `ctr` | 点击率 | `number` | 否 | `ctr` | `0.2259` |
| `shopCtr` | 跳转点击率 | `number` | 否 | `shopctr` | `0.2259` |
| `cpm` | 千次展现成本（元） | `number` | 否 | `cpm` | `0.0` |
| `cpc` | 点击单价（元） | `number` | 否 | `cpc` | `0.0` |
| `shopCpc` | 跳转点击单价（元） | `number` | 否 | `shopcpc` | `0.0` |
| `cost` | 消耗（元） | `number` | 否 | `cost` | `0.0` |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |

### 数据样例

```json
{
  "campaignId": 14127726028,
  "campaignName": "Y26_洗发水",
  "campaignType": 1,
  "contractId": 276347,
  "contractName": "2026年品牌专区_兔头妈妈_1.1-12.31",
  "startTime": "2026-05-09 00:00:00",
  "endTime": "2026-12-31 00:00:00",
  "status": 2,
  "lifeCycle": 99,
  "productId": 101005201,
  "campaignNoEnough": true,
  "campaignReasonDesc": " 该计划下单元（y26洗发水）无有效创意，请及时上传创意，避免投放期间无展现;",
  "impression": 5905.0,
  "click": 1334.0,
  "shopClick": 1334.0,
  "interactClick": 0.0,
  "ctr": 0.2259,
  "shopCtr": 0.2259,
  "cpm": 0.0,
  "cpc": 0.0,
  "shopCpc": 0.0,
  "cost": 0.0,
  "bizDate": "20260610",
  "accountId": "108"
}
```

---

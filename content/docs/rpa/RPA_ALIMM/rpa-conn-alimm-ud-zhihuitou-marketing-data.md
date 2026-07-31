---
title: UD智汇投-报表-商品营销数据
description: 导出阿里妈妈 UD智汇投 商品营销数据报表，支持按营销场景、投放媒体、汇总周期及投放商品类目筛选
entry: rpa.conn.alimm.ud_zhihuitou.marketing.data
badge:
  label: 待上线
  color: "#EA580C"
estimatedDuration:
  sec: 90
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响。
module:
  group: ud_zhihuitou
---

| 属性             | 值                                                                 |
| ---------------- | ------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                       |
| **连接器名称**   | `ODS_UD智汇投报表商品营销数据明细表(阿里妈妈RPA)`                  |
| **连接器代码**   | `rpa.conn.alimm.ud_zhihuitou.marketing.data`                        |
| **操作类型**     | `文件导出`                                                         |
| **目标网页**     | `https://ud.alimama.com/index.html#!/report/launchItem?rptType=launchItem` |
| **适用场景**     | 导出阿里妈妈 UD智汇投 商品营销数据报表，支持按营销场景、投放媒体、汇总周期及投放商品类目筛选 |
| **数据表名**     | `ods_rpa_alimm_ud_zhihuitou_marketing_data_du`                      |
| **业务表名**     | `ODS_UD智汇投报表商品营销数据明细表(阿里妈妈RPA)`                  |

### 目标页面

> **取数路径**：阿里妈妈—UD智汇投—结案洞察—商品洞察—商品营销数据
>
> **取数链接**：[https://ud.alimama.com/index.html#!/report/launchItem?rptType=launchItem](https://ud.alimama.com/index.html#!/report/launchItem?rptType=launchItem)

![阿里妈妈—UD智汇投商品营销数据](../_public/images/alimm/ud_zhihuitou_marketing_data_20260721.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `marketing_scenes` | 营销场景 | `String` / `List[String]` | 否 | 全选 | 不传或空=页面「全选」；有值须为下拉可选 code/中文，否则入参校验失败。可选值：`ALL_MEDIA_SMART`（全媒体智投）/ `SINGLE_MEDIA_SMART`（单媒体智投）/ `UD_SMART`（UDSmart）；支持逗号分隔多值 |
| `delivery_medias` | 投放媒体 | `String` / `List[String]` | 否 | 全选 | 不传或空=页面「全选」；有值须为下拉可选 code/中文，否则入参校验失败。可选值：`ALL_MEDIA`（全媒体）/ `BYTEDANCE`（字节）/ `TENCENT`（腾讯）/ `XIAOHONGSHU`（小红书）/ `BILIBILI`（B站）；支持逗号分隔多值 |
| `custom_start_date` | 汇总周期开始日期 | `String` | 条件必填 | `2026-05-01`（超 90 天自动前移） | 与 `custom_end_date` 须同时传入或同时省略；仅 `YYYYMMDD` / `YYYY-MM-DD`（月日两位补零，如 `2026-06-02`）；拒绝 `2026-06-2`、`2026/06/02`；不能早于今天往前 89 天（页面「查询最大范围 90 天」含首尾）；含首尾跨度 ≤ 90 天。不传时默认从 `2026-05-01` 起（超可查窗口或跨度时自动前移） |
| `custom_end_date` | 汇总周期结束日期 | `String` | 条件必填 | 昨天 | 与 `custom_start_date` 须同时传入或同时省略；仅 `YYYYMMDD` / `YYYY-MM-DD`（月日须两位补零）；单边传入报错 |
| `launch_item_categories` | 投放商品所在类目 | `String` / `List[String]` | 否 | 全选 | 不传或空=页面「全选」；有值为搜索关键词（须能搜到下拉选项，否则报错）；单值最长 64 字；多匹配取第一条；支持逗号分隔多值 |

### 入参样例

默认（全选筛选 + 默认汇总周期）：

```json
{}
```

按场景 / 媒体 / 周期 / 类目筛选：

```json
{
  "marketing_scenes": ["ALL_MEDIA_SMART", "UD_SMART"],
  "delivery_medias": "BYTEDANCE,TENCENT",
  "custom_start_date": "20260701",
  "custom_end_date": "20260720",
  "launch_item_categories": "羽绒"
}
```

中文别名 + 日期横杠格式：

```json
{
  "marketing_scenes": "全媒体智投",
  "delivery_medias": ["字节", "小红书"],
  "custom_start_date": "2026-06-01",
  "custom_end_date": "2026-07-15"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "阿里妈妈-UD智汇投商品营销数据 - 查询入参",
  "description": "导出阿里妈妈 UD智汇投 商品营销数据报表，支持按营销场景、投放媒体、汇总周期及投放商品类目筛选",
  "type": "object",
  "properties": {
    "marketing_scenes": {
      "description": "营销场景。不传或空=页面全选；有值须为下拉可选 code/中文，否则入参校验失败。可选值：ALL_MEDIA_SMART（全媒体智投）/ SINGLE_MEDIA_SMART（单媒体智投）/ UD_SMART（UDSmart）；支持逗号分隔多值",
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "ALL_MEDIA_SMART",
              "SINGLE_MEDIA_SMART",
              "UD_SMART",
              "全媒体智投",
              "单媒体智投",
              "UDSmart"
            ]
          },
          "uniqueItems": true
        }
      ]
    },
    "delivery_medias": {
      "description": "投放媒体。不传或空=页面全选；有值须为下拉可选 code/中文，否则入参校验失败。可选值：ALL_MEDIA（全媒体）/ BYTEDANCE（字节）/ TENCENT（腾讯）/ XIAOHONGSHU（小红书）/ BILIBILI（B站）；支持逗号分隔多值",
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "ALL_MEDIA",
              "BYTEDANCE",
              "TENCENT",
              "XIAOHONGSHU",
              "BILIBILI",
              "全媒体",
              "字节",
              "腾讯",
              "小红书",
              "B站"
            ]
          },
          "uniqueItems": true
        }
      ]
    },
    "custom_start_date": {
      "type": "string",
      "description": "汇总周期开始日期。与 custom_end_date 须同时传入或同时省略；仅 YYYYMMDD 或 YYYY-MM-DD（月日须两位补零）；拒绝 2026-06-2、2026/06/02；不传默认 2026-05-01（超可查窗口或跨度自动前移）；不能早于今天往前 89 天（页面查询最大范围 90 天含首尾）；含首尾跨度 ≤ 90 天",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "汇总周期结束日期。与 custom_start_date 须同时传入或同时省略；仅 YYYYMMDD 或 YYYY-MM-DD（月日须两位补零）；不传默认昨天；单边传入报错",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "launch_item_categories": {
      "description": "投放商品所在类目搜索关键词。不传或空=页面全选；有值须能搜到下拉选项（单值最长 64 字），否则报错；多匹配取第一条；支持逗号分隔多值",
      "oneOf": [
        {
          "type": "string"
        },
        {
          "type": "array",
          "items": {
            "type": "string"
          },
          "uniqueItems": true
        }
      ]
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
| `reportDate` | 报表日期 | `String` | 否 | `XLSX.0.日期` | `2026-07-01` |
| `promoteSubjectId` | 推广主体 ID | `Number` | 否 | `XLSX.0.推广主体ID` | `625****657` (已脱敏) |
| `promoteSubjectTitle` | 推广主体标题 | `String` | 否 | `XLSX.0.推广主体标题` | `康尔****星级` (已脱敏) |
| `promoteSubjectCategory` | 推广主体类目 | `String` | 否 | `XLSX.0.推广主体类目` | `羽绒/羽毛被` |
| `impression` | 展现量 | `Number` | 否 | `XLSX.0.展现量` | `1841` |
| `click` | 点击量 | `Number` | 否 | `XLSX.0.点击量` | `84` |
| `cost` | 花费 | `Number` | 否 | `XLSX.0.花费` | `242.06` |
| `ctr` | 点击率 | `Number` | 否 | `XLSX.0.点击率` | `0.0456` |
| `cpc` | 平均点击花费 | `Number` | 否 | `XLSX.0.平均点击花费` | `2.88` |
| `cpm` | 千次展现花费 | `Number` | 否 | `XLSX.0.千次展现花费` | `131.48` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260724` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****4` (已脱敏) |

### 数据样例

```json
{
  "reportDate": "2026-07-01",
  "promoteSubjectId": "625****657",
  "promoteSubjectTitle": "康尔****星级",
  "promoteSubjectCategory": "羽绒/羽毛被",
  "impression": 1841,
  "click": 84,
  "cost": 242.06,
  "ctr": 0.0456,
  "cpc": 2.88,
  "cpm": 131.48,
  "bizDate": "20260724",
  "accountId": "1****4"
}
```

---

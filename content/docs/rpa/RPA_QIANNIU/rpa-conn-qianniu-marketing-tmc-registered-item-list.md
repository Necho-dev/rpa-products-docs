---
title: 营销-活动报名-已报商品列表
description: 按筛选条件采集千牛活动报名「已报商品」列表，营销场景固定淘宝直播；支持商品报名状态、完善状态、售卖模式及活动/报名时间等筛选，最多翻页 100 页
entry: rpa.conn.qianniu.marketing.tmc.registered.item.list
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  min: 2
module:
  group: marketing
---

| 属性             | 值                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                                            |
| **连接器名称**   | `ODS_营销活动已报商品明细表(千牛RPA)`                                                                   |
| **连接器代码**   | `rpa.conn.qianniu.marketing.tmc.registered.item.list`                                                   |
| **操作类型**     | `页面解析`                                                                                              |
| **目标网页**     | `https://qn.taobao.com/home.htm/starb/tmc-next/sale/seller/homepage.htm?tab=item`                       |
| **适用场景**     | 按筛选条件采集千牛活动报名「已报商品」列表，营销场景固定淘宝直播；支持商品报名状态、完善状态、售卖模式及活动/报名时间等筛选，最多翻页 100 页 |
| **数据表名**     | `ods_rpa_qianniu_marketing_tmc_registered_item_list_du`                                                 |
| **业务表名**     | `ODS_营销活动已报商品明细表(千牛RPA)`                                                                   |

### 目标页面

> **取数路径**：千牛后台—营销—活动报名—已报管理—已报商品
>
> **取数链接**：[https://qn.taobao.com/home.htm/starb/tmc-next/sale/seller/homepage.htm?tab=item](https://qn.taobao.com/home.htm/starb/tmc-next/sale/seller/homepage.htm?tab=item)

![千牛后台—营销—活动报名—已报商品列表](../_public/images/qianniu/marketing_tmc_registered_item_list_20260716.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `registration_status` | 商品报名状态 | `String` | 否 | — | 可选值：`DRAFT`（草稿）、`PENDING_REVIEW`（待审核）、`UNDER_REVIEW`（审核中）、`REVIEW_REJECTED`（审核不通过）、`REVIEW_PASSED`（审核通过(初审通过)）、`CANCELLED`（撤销报名）、`SCHEDULE_PENDING`（排期待确认）、`SCHEDULED`（已排期待发布(终审通过)）、`ABNORMAL`（异常）、`PUBLISHED`（已发布设定）、`IN_ACTIVITY`（活动中）、`ACTIVITY_ENDED`（活动结束）、`REMOVED`（清退） |
| `completion_status` | 商品完善状态 | `String` | 否 | — | 可选值：`COMPLETED`（已完善）、`INCOMPLETE`（待完善） |
| `sales_mode` | 售卖模式 | `String` | 否 | — | 可选值：`DEFAULT`（默认）、`PLAY`（玩法）、`MATERIAL`（素材）、`SHOP`（店铺）、`SPOT`（现货商品）、`PRESALE`（预售商品） |
| `item_id` | 商品 ID | `String` | 否 | — | 精确匹配商品 ID |
| `item_name` | 商品名称 | `String` | 否 | — | 模糊匹配商品名称 |
| `custom_activity_start_date` | 活动开始日期 | `String` | 否 | 当日 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`；与 `custom_activity_end_date` 均未传时，默认当日 |
| `custom_activity_end_date` | 活动结束日期 | `String` | 否 | 当日起未来 30 日 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`；与 `custom_activity_start_date` 均未传时，默认当日起未来 30 日 |
| `custom_sign_start_date` | 报名开始日期 | `String` | 否 | 当日 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`；与 `custom_sign_end_date` 均未传时，默认当日 |
| `custom_sign_end_date` | 报名结束日期 | `String` | 否 | 当日起未来 30 日 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`；与 `custom_sign_start_date` 均未传时，默认当日起未来 30 日 |

### 入参样例

使用全部默认条件（活动时间、报名时间默认当日 ~ 未来 30 日）：

```json
{}
```

按报名状态、完善状态与售卖模式筛选：

```json
{
  "registration_status": "PUBLISHED",
  "completion_status": "COMPLETED",
  "sales_mode": "DEFAULT"
}
```

指定活动/报名时间范围，并按商品 ID 筛选：

```json
{
  "item_id": "908269123456",
  "registration_status": "ACTIVITY_ENDED",
  "custom_activity_start_date": "20260601",
  "custom_activity_end_date": "20260630",
  "custom_sign_start_date": "20260501",
  "custom_sign_end_date": "20260630"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "千牛-活动报名已报商品列表 - 查询入参",
  "description": "按筛选条件采集千牛活动报名「已报商品」列表，营销场景固定淘宝直播；支持商品报名状态、完善状态、售卖模式及活动/报名时间等筛选，最多翻页 100 页",
  "type": "object",
  "properties": {
    "registration_status": {
      "type": "string",
      "description": "商品报名状态",
      "enum": [
        "DRAFT",
        "PENDING_REVIEW",
        "UNDER_REVIEW",
        "REVIEW_REJECTED",
        "REVIEW_PASSED",
        "CANCELLED",
        "SCHEDULE_PENDING",
        "SCHEDULED",
        "ABNORMAL",
        "PUBLISHED",
        "IN_ACTIVITY",
        "ACTIVITY_ENDED",
        "REMOVED"
      ]
    },
    "completion_status": {
      "type": "string",
      "description": "商品完善状态",
      "enum": ["COMPLETED", "INCOMPLETE"]
    },
    "sales_mode": {
      "type": "string",
      "description": "售卖模式",
      "enum": ["DEFAULT", "PLAY", "MATERIAL", "SHOP", "SPOT", "PRESALE"]
    },
    "item_id": {
      "type": "string",
      "description": "商品 ID"
    },
    "item_name": {
      "type": "string",
      "description": "商品名称"
    },
    "custom_activity_start_date": {
      "type": "string",
      "description": "活动开始日期，格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_activity_end_date": {
      "type": "string",
      "description": "活动结束日期，格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_sign_start_date": {
      "type": "string",
      "description": "报名开始日期，格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_sign_end_date": {
      "type": "string",
      "description": "报名结束日期，格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

### 数据字段

:::field-tree
@define 域信息
| `domainCode` | 域代码 | `String` | 是 | 页面解析 | `item` |
| `domainId` | 域 ID | `Number` | 否 | 页面解析 | `100****948` (已脱敏) |
| `parentDomainCode` | 父域代码 | `String` | 是 | 页面解析 | `act` |
| `parentDomainId` | 父域 ID | `Number` | 否 | 页面解析 | `686****196` (已脱敏) |
| `parentIdMap` | 父域 ID 映射 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `themisTemplateId` | 模板 ID | `Number` | 否 | 页面解析 | `2****2` (已脱敏) |

@define 活动标签项
| `color` | 标签颜色 | `String` | 是 | 页面解析 | `gray` |
| `text` | 标签文案 | `String` | 是 | 页面解析 | `淘宝直播` |

@define 操作按钮项
| `disabled` | 是否禁用 | `Boolean` | 否 | 页面解析 | `false` |
| `id` | 按钮 ID | `Number` | 否 | 页面解析 | `1****0` (已脱敏) |
| `name` | 按钮名称 | `String` | 否 | 页面解析 | `查看商品` |
| `simpleName` | 按钮简称 | `String` | 否 | 页面解析 | `查看` |
| `required` | 是否必选 | `Boolean` | 否 | 页面解析 | `false` |
| `disableMessage` | 禁用原因 | `String` | 是 | 页面解析 | `当前不允许撤销报名` |
| `url` | 操作链接 | `String` | 是 | 页面解析 | `/item/json/****` (已脱敏) |
| `meta` | 按钮元数据 | `Dict` | 是 | 页面解析 | 见数据样例 |

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `limitNum` | 限购 | `String` | 是 | 页面解析 | `不限购` |
| `themisInfo` @域信息 | 域信息 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `commonActivityTags` @活动标签项 | 活动标签 | `List[Dict]` | 是 | 页面解析 | 见数据样例 |
| `newItemPicMarkingStatusTips` | 主图打标提示 | `String` | 是 | 页面解析 | `商品主图已使用官方主图模板，可点击《编辑主图》进行修改。` |
| `signTime` | 报名时间戳 | `Number` | 是 | 页面解析 | `1782958919000` |
| `originalPrice` | 原价/一口价 | `String` | 是 | 页面解析 | `399` |
| `onlineStartTime` | 活动开始时间戳 | `Number` | 是 | 页面解析 | `1782835200000` |
| `onlineEndTime` | 活动结束时间戳 | `Number` | 是 | 页面解析 | `1783616400000` |
| `itemLink` | 商品链接 | `String` | 是 | 页面解析 | `//item.taobao.com/****` (已脱敏) |
| `activityName` | 活动名称 | `String` | 是 | 页面解析 | `店播日常闪降招商_____2026-7-1至2026-7-10（不锁库存）` |
| `buttonList` @操作按钮项 | 操作按钮 | `List[Dict]` | 是 | 页面解析 | 见数据样例 |
| `itemId` | 商品 ID | `String` | 是 | 页面解析 | `756****757` (已脱敏) |
| `itemName` | 商品名称 | `String` | 是 | 页面解析 | `3g连****黑特浓` (已脱敏) |
| `icStatusName` | 商品状态 | `String` | 是 | 页面解析 | `出售中` |
| `activityUrl` | 活动详情链接 | `String` | 是 | 页面解析 | `/sale/seller/****` (已脱敏) |
| `newItemPicMarkingStatusName` | 主图打标状态 | `String` | 是 | 页面解析 | `已打标` |
| `itemPic` | 商品主图 | `String` | 是 | 页面解析 | `https://img.alicdn.com/****` (已脱敏) |
| `juId` | 营销 ID | `String` | 是 | 页面解析 | `100****948` (已脱敏) |
| `statusName` | 商品报名状态 | `String` | 是 | 页面解析 | `活动结束` |
| `enableStructErrorMessage` | 结构错误提示开关 | `Boolean` | 是 | 页面解析 | `false` |
| `icStatus` | 商品状态码 | `Number` | 是 | 页面解析 | `0` |
| `newItemPicMarkingStatus` | 主图打标状态码 | `Number` | 是 | 页面解析 | `1` |
| `status` | 报名状态码 | `Number` | 是 | 页面解析 | `9` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260720` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****6` (已脱敏) |
| `taskId` | 任务 ID | `String` | 否 | 附加 | `dev****af7` (已脱敏) |
:::

### 数据样例

> 以下样例已对商品 ID、营销 ID、账号、链接、商品名称等敏感信息脱敏；时间戳、金额、状态码等按白名单保留原值。

```json
[
  {
    "limitNum": "不限购",
    "themisInfo": {
      "domainCode": "item",
      "domainId": "100****948",
      "parentDomainCode": "act",
      "parentDomainId": "686****196",
      "parentIdMap": {
        "act": "686****196",
        "icItem": "756****757"
      },
      "themisTemplateId": "2****2"
    },
    "commonActivityTags": [
      {
        "color": "gray",
        "text": "淘宝直播"
      }
    ],
    "newItemPicMarkingStatusTips": "商品主图已使用官方主图模板，可点击《编辑主图》进行修改。",
    "signTime": 1782958919000,
    "originalPrice": "399",
    "onlineStartTime": 1782835200000,
    "onlineEndTime": 1783616400000,
    "itemLink": "//item.taobao.com/****",
    "activityName": "店播日常闪降招商_____2026-7-1至2026-7-10（不锁库存）",
    "buttonList": [
      {
        "disabled": false,
        "id": "1****0",
        "meta": {
          "itemId": "756****757",
          "itemName": "3g连****黑特浓",
          "juId": "100****948",
          "querier": "juItemCompositeQuerier",
          "status": 8
        },
        "name": "查看商品",
        "required": false,
        "simpleName": "查看"
      },
      {
        "disabled": false,
        "id": "1****3",
        "meta": {
          "materialKey": "itemMainPic1",
          "bizType": "2****2",
          "domainType": "1****1",
          "dimList": [
            {
              "dimId": "100****948",
              "dimType": 1
            }
          ],
          "bizId": "4****6",
          "domainId": "756****757"
        },
        "name": "编辑主图",
        "required": false,
        "simpleName": "主图打标"
      },
      {
        "disableMessage": "当前不允许撤销报名",
        "disabled": true,
        "id": "1****2",
        "name": "撤销报名",
        "required": false,
        "simpleName": "撤销",
        "url": "/item/json/****"
      }
    ],
    "itemId": "756****757",
    "itemName": "3g连****黑特浓",
    "icStatusName": "出售中",
    "activityUrl": "/sale/seller/****",
    "newItemPicMarkingStatusName": "已打标",
    "itemPic": "https://img.alicdn.com/****",
    "juId": "100****948",
    "statusName": "活动结束",
    "enableStructErrorMessage": false,
    "icStatus": 0,
    "newItemPicMarkingStatus": 1.0,
    "status": 9,
    "bizDate": "20260720",
    "accountId": "1****6",
    "taskId": "dev****af7"
  }
]
```

---

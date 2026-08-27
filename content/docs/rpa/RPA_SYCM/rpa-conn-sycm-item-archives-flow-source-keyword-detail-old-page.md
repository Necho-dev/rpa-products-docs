---
title: 商品-商品360-流量来源-关键词详情(旧版)
description: 按商品 ID、统计时间与来源类型，在商品360旧版流量来源页采集指定来源详情弹窗中的关键词级流量指标
entry: rpa.conn.sycm.item.archives.flow.source.keyword.detail.old.page
badge:
  label: 待上线
  color: "#EA580C"
dataReady:
  time: "09:00:00"
  cycle: daily
  description: 生意参谋大部分核心数据模块（流量、商品、市场等）昨日数据在上午 9 点前完成更新
estimatedDuration:
  sec: 120
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响。
module:
  group: item
---

| 属性             | 值                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                            |
| **连接器名称**   | `ODS_商品360流量来源关键词详情旧版页面(生意参谋RPA)`                                    |
| **连接器代码**   | `rpa.conn.sycm.item.archives.flow.source.keyword.detail.old.page`                     |
| **操作类型**     | `页面解析`                                                                              |
| **目标网页**     | `https://sycm.taobao.com/cc/item_archives`                                              |
| **适用场景**     | 按商品 ID、统计时间与来源类型，在商品360旧版流量来源页采集指定来源详情弹窗中的关键词级流量指标 |
| **数据表名**     | `ods_rpa_sycm_item_archives_flow_source_keyword_detail_old_page_du`                   |
| **业务表名**     | `ODS_商品360流量来源关键词详情旧版页面(生意参谋RPA)`                                    |

### 目标页面

> **取数路径**：生意参谋—商品—商品360—流量来源—详情
>
> **取数链接**：[https://sycm.taobao.com/cc/item_archives](https://sycm.taobao.com/cc/item_archives?activeKey=flow)

![生意参谋—商品360—流量来源—关键词详情（旧版页）](../_public/images/sycm/item_archives_flow_source_keyword_detail_old_page_20260827.png)

![生意参谋—商品360—流量来源—关键词详情弹窗](../_public/images/sycm/item_archives_flow_source_keyword_detail_old_page_modal_20260827.png)


### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `item_id` | 商品 ID | `String` | 是 | — | 10~25 位数字字符串 |
| `date_type` | 统计时间类型 | `String` | 否 | `day` | 可选值：`today`（今天）/ `recent7`（7天）/ `recent30`（30天）/ `day`（日）/ `week`（周）/ `month`（月） |
| `biz_date` | 业务日期 | `String` | 条件必填 | `day` 都空则昨日 T-1 | 格式 `YYYYMMDD` 或 `YYYY-MM-DD`。`week`/`month` 必填；`today`/`recent7`/`recent30` 忽略本参数。日可选 T-800 ~ T-1；周须为已结束的完整自然周；月须为当年已结束的完整自然月 |
| `device_type` | 终端 | `String` | 否 | — | 可选值：`WIRELESS`（无线端）/ `PC`（PC端）。未传则保持页面默认 |
| `conversion_attribution` | 转化归属 | `String` | 否 | — | 可选值：`EVERY_VISIT`（每一次访问来源）/ `FIRST_VISIT`（第一次访问来源）/ `LAST_VISIT`（最后一次访问来源）。未传则保持页面默认 |
| `detail_metrics` | 详情指标 | `String` / `List[String]` | 否 | — | 最多 6 个，英文逗号分隔或 JSON 数组。未传则保持页面默认勾选。可选值：`UV`（访客数）/ `ORDER_BUYER_CNT`（下单买家数）/ `ORDER_CVR`（下单转化率）/ `PV`（浏览量（占比））/ `IN_STORE_JUMP_UV`（店内跳转人数）/ `BOUNCE_UV`（跳出本店人数）/ `FAVORITE_UV`（收藏人数）/ `ADD_CART_UV`（加购人数）/ `PAY_ITEM_CNT`（支付件数）/ `PAY_BUYER_CNT`（支付买家数）/ `PAY_CVR`（支付转化率）/ `DIRECT_PAY_BUYER_CNT`（直接支付买家数）/ `FAVORITE_PAY_BUYER_CNT`（收藏商品-支付买家数）/ `FAN_PAY_BUYER_CNT`（粉丝支付买家数）/ `ADD_CART_PAY_BUYER_CNT`（加购商品-支付买家数） |
| `traffic_source` | 来源类型 | `String` / `List[String]` | 是 | — | 最多 2 个，英文逗号分隔或 JSON 数组。可选值：`TAOBAO_SEARCH`（手淘搜索）/ `TAOBAO_SEARCH_PRODUCT_AND_OTHER`（手淘搜索-商品及其他）/ `TAOBAO_SEARCH_LIVE`（手淘搜索-直播）/ `TAOBAO_SEARCH_SHORT_VIDEO`（手淘搜索-短视频）/ `KEYWORD_PROMOTION`（关键词推广）/ `SHOP_SUPER_LINK`（店铺超链）/ `TAO_INTERNAL_UNCLASSIFIED`（淘内待分类） |

### 入参样例


```json
{
  "item_id": "947040935749",
  "date_type": "day",
  "traffic_source": ["TAOBAO_SEARCH", "KEYWORD_PROMOTION"]
}
```

指定自然月：

```json
{
  "item_id": "947040935749",
  "date_type": "month",
  "biz_date": "2026-01-27",
  "traffic_source": ["TAOBAO_SEARCH", "KEYWORD_PROMOTION"]
}
```

近 7 天：

```json
{
  "item_id": "947040935749",
  "date_type": "recent7",
  "traffic_source": "TAOBAO_SEARCH,KEYWORD_PROMOTION"
}
```

按周：

```json
{
  "item_id": "947040935749",
  "date_type": "week",
  "biz_date": "2026-01-26",
  "traffic_source": ["TAOBAO_SEARCH", "KEYWORD_PROMOTION"]
}
```


```json
{
  "item_id": "947040935749",
  "date_type": "today",
  "device_type": "WIRELESS",
  "conversion_attribution": "EVERY_VISIT",
  "detail_metrics": ["UV", "ADD_CART_UV", "PAY_BUYER_CNT"],
  "traffic_source": ["TAOBAO_SEARCH"]
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-商品360-流量来源-关键词详情（旧版页） - 查询入参",
  "description": "按商品 ID、统计时间与来源类型，在商品360旧版流量来源页采集指定来源详情弹窗中的关键词级流量指标",
  "type": "object",
  "$defs": {
    "trafficSourceCode": {
      "type": "string",
      "description": "来源类型 code",
      "enum": [
        "TAOBAO_SEARCH",
        "TAOBAO_SEARCH_PRODUCT_AND_OTHER",
        "TAOBAO_SEARCH_LIVE",
        "TAOBAO_SEARCH_SHORT_VIDEO",
        "KEYWORD_PROMOTION",
        "SHOP_SUPER_LINK",
        "TAO_INTERNAL_UNCLASSIFIED"
      ]
    },
    "detailMetricCode": {
      "type": "string",
      "description": "详情指标 code",
      "enum": [
        "UV",
        "ORDER_BUYER_CNT",
        "ORDER_CVR",
        "PV",
        "IN_STORE_JUMP_UV",
        "BOUNCE_UV",
        "FAVORITE_UV",
        "ADD_CART_UV",
        "PAY_ITEM_CNT",
        "PAY_BUYER_CNT",
        "PAY_CVR",
        "DIRECT_PAY_BUYER_CNT",
        "FAVORITE_PAY_BUYER_CNT",
        "FAN_PAY_BUYER_CNT",
        "ADD_CART_PAY_BUYER_CNT"
      ]
    }
  },
  "properties": {
    "item_id": {
      "type": "string",
      "description": "商品 ID，10~25 位数字字符串",
      "pattern": "^\\d{10,25}$"
    },
    "date_type": {
      "type": "string",
      "description": "统计时间类型，未传默认 day。可选值：today（今天）/ recent7（7天）/ recent30（30天）/ day（日）/ week（周）/ month（月）",
      "enum": ["today", "recent7", "recent30", "day", "week", "month"],
      "default": "day"
    },
    "biz_date": {
      "type": "string",
      "description": "业务日期；week/month 时必填；day 都空则昨日 T-1；today/recent7/recent30 时忽略。格式 YYYYMMDD 或 YYYY-MM-DD",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "device_type": {
      "type": "string",
      "description": "终端，未传则保持页面默认。可选值：WIRELESS（无线端）/ PC（PC端）",
      "enum": ["WIRELESS", "PC"]
    },
    "conversion_attribution": {
      "type": "string",
      "description": "转化归属，未传则保持页面默认。可选值：EVERY_VISIT（每一次访问来源）/ FIRST_VISIT（第一次访问来源）/ LAST_VISIT（最后一次访问来源）",
      "enum": ["EVERY_VISIT", "FIRST_VISIT", "LAST_VISIT"]
    },
    "detail_metrics": {
      "description": "详情弹窗指标，最多 6 个；英文逗号分隔字符串或 JSON 数组；未传则保持页面默认勾选",
      "oneOf": [
        {
          "type": "string",
          "minLength": 1,
          "description": "英文逗号分隔的指标 code，最多 6 个"
        },
        {
          "type": "array",
          "description": "指标 code 数组，最多 6 个",
          "items": {
            "$ref": "#/$defs/detailMetricCode"
          },
          "maxItems": 6,
          "uniqueItems": true
        }
      ]
    },
    "traffic_source": {
      "description": "来源类型，必填，最多 2 个；英文逗号分隔字符串或 JSON 数组",
      "oneOf": [
        {
          "type": "string",
          "minLength": 1,
          "description": "英文逗号分隔的来源 code，最多 2 个"
        },
        {
          "type": "array",
          "description": "来源 code 数组，1~2 个",
          "items": {
            "$ref": "#/$defs/trafficSourceCode"
          },
          "minItems": 1,
          "maxItems": 2,
          "uniqueItems": true
        }
      ]
    }
  },
  "required": ["item_id", "traffic_source"],
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
| ---- | -------- | -------- | ------ | -------- | ---- |
| `trafficSource` | 流量来源（关键词） | `String` | 否 | 页面解析 | `****` (已脱敏) |
| `uv` | 访客数 | `Number` | 是 | 页面解析 | `21` |
| `orderBuyerCnt` | 下单买家数 | `Number` | 是 | 页面解析 | — |
| `orderCvr` | 下单转化率 | `Number` | 是 | 页面解析 | — |
| `pv` | 浏览量（占比） | `Number` | 是 | 页面解析 | — |
| `inStoreJumpUv` | 店内跳转人数 | `Number` | 是 | 页面解析 | — |
| `bounceUv` | 跳出本店人数 | `Number` | 是 | 页面解析 | — |
| `favoriteUv` | 收藏人数 | `Number` | 是 | 页面解析 | — |
| `addCartUv` | 加购人数 | `Number` | 是 | 页面解析 | `0` |
| `payItemCnt` | 支付件数 | `Number` | 是 | 页面解析 | — |
| `payBuyerCnt` | 支付买家数 | `Number` | 是 | 页面解析 | `0` |
| `payCvr` | 支付转化率 | `Number` | 是 | 页面解析 | — |
| `directPayBuyerCnt` | 直接支付买家数 | `Number` | 是 | 页面解析 | — |
| `favoritePayBuyerCnt` | 收藏商品-支付买家数 | `Number` | 是 | 页面解析 | — |
| `fanPayBuyerCnt` | 粉丝支付买家数 | `Number` | 是 | 页面解析 | — |
| `addCartPayBuyerCnt` | 加购商品-支付买家数 | `Number` | 是 | 页面解析 | — |
| `trafficSourceType` | 流量来源类型 | `String` | 否 | 经来源类型枚举映射 | `TAOBAO_SEARCH` |
| `itemId` | 商品 ID | `String` | 否 | 附加，来自入参 | `947****749` (已脱敏) |
| `dateType` | 统计时间类型 | `String` | 否 | 附加，来自入参 `date_type` | `week` |
| `dateRangeStart` | 统计区间起始日 | `String` | 否 | 附加 | `2026-01-26` |
| `dateRangeEnd` | 统计区间结束日 | `String` | 否 | 附加 | `2026-02-01` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260827` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****8` (已脱敏) |


### 数据样例

```json
[
  {
    "trafficSource": "****",
    "uv": 21,
    "addCartUv": 0,
    "payBuyerCnt": 0,
    "trafficSourceType": "TAOBAO_SEARCH",
    "itemId": "947****749",
    "dateType": "week",
    "dateRangeStart": "2026-01-26",
    "dateRangeEnd": "2026-02-01",
    "bizDate": "20260827",
    "accountId": "1****8"
  }
]
```

---

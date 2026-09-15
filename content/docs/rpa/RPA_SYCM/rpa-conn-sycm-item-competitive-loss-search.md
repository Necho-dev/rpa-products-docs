---
title: 市场-竞品分析-竞品流失-搜索流失竞品推荐
description: 采集生意参谋市场竞品分析「竞品流失」中「搜索流失竞品推荐」列表，按统计时间与类目筛选，可只采流失竞品商品列表或展开采集商品子列表
entry: rpa.conn.sycm.item.competitive.loss.search
badge:
  label: 待上线
  color: "#EA580C"
estimatedDuration:
  sec: 120
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响。
category: item
---

| 属性             | 值                                                                 |
| ---------------- | ------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                       |
| **连接器名称**   | `ODS_市场竞品流失搜索推荐明细表(生意参谋RPA)`                       |
| **连接器代码**   | `rpa.conn.sycm.item.competitive.loss.search`                       |
| **操作类型**     | `页面解析`                                                         |
| **目标网页**     | `https://sycm.taobao.com/mc/free/ci_item`                          |
| **适用场景**     | 采集生意参谋市场竞品分析「竞品流失」中「搜索流失竞品推荐」列表，按统计时间与类目筛选，可只采流失竞品商品列表或展开采集商品子列表 |
| **数据表名**     | `ods_rpa_sycm_item_competitive_loss_search_du`                     |
| **业务表名**     | `ODS_市场竞品流失搜索推荐明细表(生意参谋RPA)`                       |

### 目标页面

> **取数路径**：生意参谋—市场—竞品分析—竞品流失—搜索流失竞品推荐
>
> **取数链接**：[https://sycm.taobao.com/mc/free/ci_item](https://sycm.taobao.com/mc/free/ci_item)

![生意参谋—市场竞品流失搜索流失竞品推荐](../_public/images/sycm/item_competitive_loss_search_20260914.png)

> 黄框为流失竞品商品展开后的商品子列表，由入参 `product_sublist` 控制是否采集。

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_type` | 时间类型 | `String` | 否 | `DAY` | 可选值：`LAST_7_DAYS`（7天）/ `LAST_30_DAYS`（30天）/ `DAY`（日）/ `WEEK`（周）/ `MONTH`（月）。 |
| `biz_date` | 统计日期 | `String` | 条件必填 | — | `date_type` 为 `WEEK` / `MONTH` / `DAY` 时必填。格式 `YYYYMMDD` 或 `YYYY-MM-DD`。日：昨天往前共 90 天。周：整周必须在90天内。月：当前月之前的三个完整自然月 |
| `category_level1` | 一级类目 | `String` | 是 | — | 类目树左栏全称，须与选项完全一致。找不到则失败，失败信息含当前可选一级类目及数量。一级无下级时忽略更深层入参并选中一级 |
| `category_level2` | 二级类目 | `String` | 条件必填 | — | 类目树中栏全称，须与选项完全一致。传入时必须同时传 `category_level1`。找不到则失败，失败信息含当前可选二级类目及数量。二级无三级面板时忽略 `category_level3` 并选中二级 |
| `category_level3` | 三级类目 | `String` | 条件必填 | — | 类目树右栏全称，须与选项完全一致。传入时必须同时传 `category_level1`、`category_level2`。找不到则失败，失败信息含当前可选三级类目及数量 |
| `indicator_type` | 指标选择 | `String` | 否 | `SE_GUIDE_UV` | 可选值：`SE_GUIDE_UV`（搜索引导访客数）/ `SE_GUIDE_CART_BYR_CNT`（搜索引导加购人数）/ `SE_GUIDE_PAY_BYR_CNT`（搜索引导支付买家数）/ `SE_GUIDE_PAY_RATE`（搜索引导支付转化率）。 |
| `product_sublist` | 是否采集商品子列表 | `String` | 否 | `FALSE` | 可选值：`TRUE`（采集上图黄框内商品子列表）/ `FALSE`（只采流失竞品商品列表） |
| `sort_field` | 流失竞品商品列表排序列 | `String` | 否 | — | 可选值：`SE_RIVAL_ITM_CNT`（搜索竞争商品数）/ `SELF_INDICATOR`（本店商品当前指标）/ `RIVAL_AVG_INDICATOR`（竞品平均当前指标）。不填则不点表头，保留页面默认排序 |
| `sort_order` | 排序方向 | `String` | 否 | — | 可选值：`DESC`（降序）/ `ASC`（升序）。有 `sort_field` 且未传时默认 `DESC` |
| `collect_limit` | 采集条数上限 | `Number` | 否 | — | 一律按**外层**流失竞品商品条数计，不含黄框内子列表条数。只采列表（`product_sublist=FALSE`）：范围 1～10000，超出则入参校验失败；不填则采全量（每页 100 条、最多 100 页）。采集子列表（`product_sublist=TRUE`）：范围 1～50，超出则入参校验失败；不填则最多展开 **50 条外层商品**；每条外层只采黄框内商品子列表当前页（每页 10 条、不翻页）。填了只采到该条数外层为止，实际不足时按实际条数返回 |

### 入参样例

仅填一级类目，其余按默认（日、搜索引导访客数、不展开商品子列表）：

```json
{
  "category_level1": "女鞋"
}
```

按日采集二级类目并展开黄框内商品子列表，最多展开 30 条流失竞品商品：

```json
{
  "date_type": "DAY",
  "category_level1": "女鞋",
  "category_level2": "帆布鞋",
  "indicator_type": "SE_GUIDE_UV",
  "product_sublist": "TRUE",
  "collect_limit": 30
}
```

近 7 天、选到三级类目、不展开商品子列表，按搜索竞争商品数降序：

```json
{
  "date_type": "LAST_7_DAYS",
  "category_level1": "女鞋",
  "category_level2": "时装单鞋",
  "category_level3": "高跟鞋",
  "sort_field": "SE_RIVAL_ITM_CNT",
  "sort_order": "DESC"
}
```

按周采集，`biz_date` 取该日所在整周：

```json
{
  "date_type": "WEEK",
  "biz_date": "20260907",
  "category_level1": "女鞋",
  "category_level2": "帆布鞋"
}
```

按月采集，`biz_date` 取 2026 年 8 月：

```json
{
  "date_type": "MONTH",
  "biz_date": "20260801",
  "category_level1": "女鞋"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-市场竞品流失搜索流失竞品推荐 - 查询入参",
  "description": "采集生意参谋市场竞品分析「竞品流失」中「搜索流失竞品推荐」列表，按统计时间与类目筛选，可只采流失竞品商品列表或展开采集商品子列表",
  "type": "object",
  "properties": {
    "date_type": {
      "type": "string",
      "description": "统计时间类型（可选）。可选值：LAST_7_DAYS（7天）/ LAST_30_DAYS（30天）/ DAY（日）/ WEEK（周）/ MONTH（月）。LAST_7_DAYS / LAST_30_DAYS 以昨天为终点自动取窗口，忽略 biz_date",
      "enum": ["LAST_7_DAYS", "LAST_30_DAYS", "DAY", "WEEK", "MONTH"],
      "default": "DAY"
    },
    "biz_date": {
      "type": "string",
      "description": "统计日期；date_type 为 WEEK / MONTH 时必填，为 DAY 时不传则用昨天。格式 YYYYMMDD 或 YYYY-MM-DD。日：昨天往前共 90 天（含昨天）。周：所在整周须落在该窗口内。月：仅能选当前月之前的三个完整自然月",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "category_level1": {
      "type": "string",
      "description": "一级类目（必填）。类目树左栏全称，须与选项完全一致；找不到则失败，失败信息含当前可选一级类目及数量。一级无下级时忽略更深层入参并选中一级",
      "minLength": 1
    },
    "category_level2": {
      "type": "string",
      "description": "二级类目（中栏）。传入时必须同时传 category_level1；须与选项完全一致。找不到则失败，失败信息含当前可选二级类目及数量。二级无三级面板时忽略 category_level3 并选中二级"
    },
    "category_level3": {
      "type": "string",
      "description": "三级类目（右栏）。传入时必须同时传 category_level1、category_level2；须与选项完全一致。找不到则失败，失败信息含当前可选三级类目及数量"
    },
    "indicator_type": {
      "type": "string",
      "description": "指标选择（可选）。可选值：SE_GUIDE_UV（搜索引导访客数）/ SE_GUIDE_CART_BYR_CNT（搜索引导加购人数）/ SE_GUIDE_PAY_BYR_CNT（搜索引导支付买家数）/ SE_GUIDE_PAY_RATE（搜索引导支付转化率）。流失竞品商品列表后两列表头随所选指标变化",
      "enum": ["SE_GUIDE_UV", "SE_GUIDE_CART_BYR_CNT", "SE_GUIDE_PAY_BYR_CNT", "SE_GUIDE_PAY_RATE"],
      "default": "SE_GUIDE_UV"
    },
    "product_sublist": {
      "type": "string",
      "description": "是否采集商品子列表（可选）。可选值：TRUE（采集上图黄框内商品子列表）/ FALSE（只采流失竞品商品列表）",
      "enum": ["TRUE", "FALSE"],
      "default": "FALSE"
    },
    "sort_field": {
      "type": "string",
      "description": "流失竞品商品列表排序列（可选）。可选值：SE_RIVAL_ITM_CNT（搜索竞争商品数）/ SELF_INDICATOR（本店商品当前指标）/ RIVAL_AVG_INDICATOR（竞品平均当前指标）。不填则不点表头，保留页面默认排序",
      "enum": ["SE_RIVAL_ITM_CNT", "SELF_INDICATOR", "RIVAL_AVG_INDICATOR"]
    },
    "sort_order": {
      "type": "string",
      "description": "排序方向（可选）。可选值：DESC（降序）/ ASC（升序）。有 sort_field 且未传时默认 DESC",
      "enum": ["DESC", "ASC"]
    },
    "collect_limit": {
      "type": "integer",
      "description": "采集条数上限（可选）。须为正整数，一律按外层流失竞品商品条数计，不含黄框内子列表条数。只采列表（product_sublist=FALSE）：范围 1～10000，不填则采全量（每页 100 条、最多 100 页）。采集子列表（product_sublist=TRUE）：范围 1～50，超出则入参校验失败；不填则最多展开 50 条外层商品；每条外层只采黄框内商品子列表当前页（每页 10 条、不翻页，可能不足）。填了只采到该条数外层为止，实际不足时按实际条数返回",
      "minimum": 1,
      "maximum": 10000
    }
  },
  "required": ["category_level1"],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "date_type": { "enum": ["WEEK", "MONTH"] }
        },
        "required": ["date_type"]
      },
      "then": {
        "required": ["biz_date"]
      }
    },
    {
      "if": {
        "properties": {
          "category_level2": { "type": "string", "minLength": 1 }
        },
        "required": ["category_level2"]
      },
      "then": {
        "required": ["category_level1"]
      }
    },
    {
      "if": {
        "properties": {
          "category_level3": { "type": "string", "minLength": 1 }
        },
        "required": ["category_level3"]
      },
      "then": {
        "required": ["category_level1", "category_level2"]
      }
    },
    {
      "if": {
        "properties": {
          "product_sublist": { "const": "TRUE" }
        },
        "required": ["product_sublist"]
      },
      "then": {
        "properties": {
          "collect_limit": {
            "maximum": 50
          }
        }
      }
    }
  ]
}
```

### 数据字段

:::field-tree
@define 商品信息
| `itemId` | 商品 ID | `String` | 否 | 页面解析 | `103****424` (已脱敏) |
| `pictUrl` | 商品主图 | `String` | 否 | 页面解析 | `//img.alicdn.com/****` (已脱敏) |
| `detailUrl` | 商品详情链接 | `String` | 否 | 页面解析 | `//sycm.taobao.com/****` (已脱敏) |
| `title` | 商品标题 | `String` | 否 | 页面解析 | `****` (已脱敏) |
| `userId` | 卖家用户 ID | `Number` | 是 | 页面解析 | `221****497` (已脱敏) |

@define 店铺信息
| `province` | 省份 | `String` | 是 | 页面解析 | `浙江省` |
| `city` | 城市 | `String` | 是 | 页面解析 | `金华市` |
| `pictureUrl` | 店铺头像 | `String` | 否 | 页面解析 | `//img.alicdn.com/****` (已脱敏) |
| `title` | 店铺名称 | `String` | 否 | 页面解析 | `****` (已脱敏) |
| `shopUrl` | 店铺链接 | `String` | 否 | 页面解析 | `//****.tmall.com` (已脱敏) |
| `userId` | 卖家用户 ID | `Number` | 否 | 页面解析 | `221****497` (已脱敏) |

@define 商品标识
| `value` | 商品 ID | `String` | 否 | 页面解析 | `103****424` (已脱敏) |

@define 取值指标
| `value` | 指标值 | `Number` | 是 | 页面解析 | `12` |

@define 取值区间
| `value` | 指标值 | `String` | 是 | 页面解析 | `10 ~ 50` |

@define 取值布尔
| `value` | 是否已监控 | `Boolean` | 否 | 页面解析 | `false` |

@define 商品子列表
| `itemId` @商品标识 | 商品 ID | `Dict` | 否 | 页面解析 | 见数据样例 |
| `item` @商品信息 | 商品对象 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `shop` @店铺信息 | 所属店铺 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `seRivalIndex` @取值指标 | 搜索竞争指数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `searchUv` @取值区间 | 搜索人气 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `seCltIndex` @取值指标 | 搜索收藏指数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `seCartIndex` @取值指标 | 搜索加购指数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `sePayAmtIndex` @取值指标 | 搜索交易指数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `isMonitored` @取值布尔 | 是否已监控 | `Dict` | 否 | 页面解析 | 见数据样例 |

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `itemId` @商品标识 | 商品 ID | `Dict` | 否 | 页面解析 | 见数据样例 |
| `item` @商品信息 | 商品对象 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `seRivalItmCnt` @取值指标 | 搜索竞争商品数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `seGuideUv` @取值指标 | 本店搜索引导访客数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `rivalItmAvgSeGuideUv` @取值指标 | 竞品平均搜索引导访客数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `seGuideCartByrCnt` @取值指标 | 本店搜索引导加购人数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `rivalItmAvgSeGuideCartByrCnt` @取值指标 | 竞品平均搜索引导加购人数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `seGuidePayByrCnt` @取值指标 | 本店搜索引导支付买家数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `rivalItmAvgSeGuidePayByrCnt` @取值指标 | 竞品平均搜索引导支付买家数 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `seGuidePayRate` @取值指标 | 本店搜索引导支付转化率 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `rivalItmAvgSeGuidePayRate` @取值指标 | 竞品平均搜索引导支付转化率 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `isMonitored` @取值布尔 | 是否已监控 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `product_sublist` @商品子列表 | 商品子列表 | `List[Dict]` | 是 | 页面解析 | 见数据样例 |
| `statDate` | 统计时间 | `String` | 否 | 页面统计时间 | `2026-09-09` |
| `categoryName` | 已选类目 | `String` | 否 | 页面已选类目 | `女鞋 > 帆布鞋` |
| `indicatorType` | 已选指标 | `String` | 否 | 页面已选指标 | `搜索引导访客数` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260910` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****7` (已脱敏) |
:::

### 数据样例

```json
[
  {
    "itemId": {
      "value": "103****424"
    },
    "item": {
      "itemId": "103****424",
      "pictUrl": "//img.alicdn.com/****",
      "detailUrl": "//sycm.taobao.com/****",
      "title": "****"
    },
    "seRivalItmCnt": {
      "value": 12
    },
    "seGuideUv": {
      "value": 8
    },
    "rivalItmAvgSeGuideUv": {
      "value": 5
    },
    "seGuideCartByrCnt": {
      "value": 1
    },
    "rivalItmAvgSeGuideCartByrCnt": {
      "value": 1
    },
    "seGuidePayByrCnt": {
      "value": 0
    },
    "rivalItmAvgSeGuidePayByrCnt": {
      "value": 0
    },
    "seGuidePayRate": {
      "value": 0.0
    },
    "rivalItmAvgSeGuidePayRate": {
      "value": 0.0347
    },
    "isMonitored": {
      "value": false
    },
    "product_sublist": [
      {
        "itemId": {
          "value": "914****967"
        },
        "item": {
          "itemId": "914****967",
          "pictUrl": "//img.alicdn.com/****",
          "detailUrl": "//sycm.taobao.com/****",
          "title": "****",
          "userId": "221****497"
        },
        "shop": {
          "pictureUrl": "//img.alicdn.com/****",
          "title": "****",
          "shopUrl": "//****.tmall.com",
          "userId": "221****497"
        },
        "seRivalIndex": {
          "value": 29.0009113855
        },
        "searchUv": {
          "value": "10 ~ 50"
        },
        "seCltIndex": {
          "value": 0.0
        },
        "seCartIndex": {
          "value": 36.9314718056
        },
        "sePayAmtIndex": {
          "value": 689.7092164996
        },
        "isMonitored": {
          "value": false
        }
      },
      {
        "itemId": {
          "value": "107****501"
        },
        "item": {
          "itemId": "107****501",
          "pictUrl": "//img.alicdn.com/****",
          "detailUrl": "//sycm.taobao.com/****",
          "title": "****",
          "userId": "203****798"
        },
        "shop": {
          "province": "浙江省",
          "city": "金华市",
          "pictureUrl": "//img.alicdn.com/****",
          "title": "****",
          "shopUrl": "//****.tmall.com",
          "userId": "203****798"
        },
        "seRivalIndex": {
          "value": 24.2206894995
        },
        "searchUv": {
          "value": "4"
        },
        "seCltIndex": {
          "value": 0.0
        },
        "seCartIndex": {
          "value": 36.9314718056
        },
        "sePayAmtIndex": {
          "value": 0.0
        },
        "isMonitored": {
          "value": false
        }
      }
    ],
    "bizDate": "20260910",
    "accountId": "1****7",
    "statDate": "2026-09-09",
    "categoryName": "女鞋 > 帆布鞋",
    "indicatorType": "搜索引导访客数"
  }
]
```
---
title: 达摩盘-竞争态势-竞争商品分析
description: 采集达摩盘竞争态势分析页中本品与竞品的基础分析（含竞争控比）、流量分析（付免/无界投资结构占比、广告域/全域归因渠道明细）及客群画像；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据
entry: rpa.conn.alimm.dmp.compete.situation.item
badge:
  label: 待上线
  color: "#EA580C"
---

| 属性            | 值                                                                          |
| ------------- | -------------------------------------------------------------------------- |
| **连接器类型**     | `RPA 连接器`                                                                  |
| **连接器代码**     | `rpa.conn.alimm.dmp.compete.situation.item`                                |
| **归属 PyPI 包** | `rpa-conn-alimm-all`                                                       |
| **操作类型**      | 浏览器自动化操作 + 网络请求监听                                                          |
| **目标网页**      | `https://dmp.taobao.com/index_new.html#!/compete/compete-situation`        |
| **适用场景**      | 采集达摩盘竞争态势分析页中本品与竞品的基础分析（含竞争控比）、流量分析（付免/无界投资结构占比、广告域/全域归因渠道明细）及客群画像；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据 |
| **预估耗时**      | `300s`                                                                      |


### 目标页面

> **路径**：阿里妈妈达摩盘—市场—竞争分析—竞争态势分析—竞争商品分析
>
> **网址**：[https://dmp.taobao.com/index_new.html#!/compete/compete-situation](https://dmp.taobao.com/index_new.html#!/compete/compete-situation)

![阿里妈妈达摩盘—竞争商品分析](../../public/images/alimm/dmp_compete_situation_item_20260626.png)

### 业务入参


| 字段                       | 中文释义     | 数据类型                    | 必填   | 默认值       | 说明                                                                                                               |
| ------------------------ | -------- | ----------------------- | ---- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `self_item_id`           | 本店商品 ID  | `String`                | 是    | —         | 不可与 `rival_item_ids` 中任一 ID 重复                                                                                   |
| `rival_item_ids`         | 竞争商品 ID  | `String \| List[String]` | 是    | —         | 英文逗号分隔字符串或 JSON 数组；中文逗号自动转换；最多 3 个；示例 `"123,456"` 或 `["123","456"]`                                              |
| `date_type`              | 分析周期类型   | `String`                | 否    | `recent7` | 可选值：`yesterday`（昨日）、`recent7`（近7天）、`recent30`（近30天）、`custom`（自定义）。快捷周期下结束日固定为昨日，对比周期为分析周期前一段等长区间（环比，与分析周期不重叠）    |
| `custom_start_date`      | 分析开始日期   | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内                                             |
| `custom_end_date`        | 分析结束日期   | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内；不可早于 `custom_start_date`                    |
| `custom_peer_start_date` | 对比周期开始日期 | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内                                             |
| `custom_peer_end_date`   | 对比周期结束日期 | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内；不可早于 `custom_peer_start_date`；分析周期与对比周期允许重叠 |
| `customer_time_window`   | 分析对象客群时间周期 | `String`            | 否    | `recent7` | 可选值：`recent7`（最近7天）、`recent15`（最近15天）、`recent30`（最近30天）、`recent90`（最近90天） |
| `compare_customer_time_window` | 对比对象客群时间周期 | `String`      | 否    | 同 `customer_time_window` | 可选值同上 |
| `customer_behavior_types` | 分析对象客群行为 | `String \| List[String]` | 否 | 全选 | 英文 code：`browse`（浏览）、`favorite`（收藏）、`add_cart`（加购）、`purchase`（购买）、`search`（搜索）；英文逗号或 JSON 数组 |
| `compare_customer_behavior_types` | 对比对象客群行为 | `String \| List[String]` | 否 | 全选 | 可选值同上 |


### 入参样例

```json
{
  "self_item_id": "897425691792",
  "rival_item_ids": "1057000824998,1044235732163,1019326026903",
  "date_type": "recent7"
}
```

```json
{
  "self_item_id": "897425691792",
  "rival_item_ids": ["1057000824998"],
  "date_type": "yesterday"
}
```

```json
{
  "self_item_id": "897425691792",
  "rival_item_ids": "1057000824998",
  "date_type": "custom",
  "custom_start_date": "2026-06-10",
  "custom_end_date": "2026-06-20",
  "custom_peer_start_date": "2026-06-05",
  "custom_peer_end_date": "2026-06-15"
}
```

```json
{
  "self_item_id": "897425691792",
  "rival_item_ids": "1057000824998",
  "date_type": "custom",
  "custom_start_date": "20260610",
  "custom_end_date": "20260620",
  "custom_peer_start_date": "20260605",
  "custom_peer_end_date": "20260615"
}
```

```json
{
  "self_item_id": "897425691792",
  "rival_item_ids": "1057000824998",
  "date_type": "recent7",
  "customer_time_window": "recent7",
  "customer_behavior_types": "browse",
  "compare_customer_behavior_types": "browse"
}
```

```json
{
  "self_item_id": "897425691792",
  "rival_item_ids": "1057000824998",
  "date_type": "recent7",
  "customer_behavior_types": ["browse", "favorite", "add_cart", "purchase", "search"]
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "阿里妈妈达摩盘-竞争商品分析 - 查询入参",
  "description": "采集达摩盘竞争态势分析页中本品与竞品的基础分析（含竞争控比）、流量分析（付免/无界投资结构占比、广告域/全域归因渠道明细）及客群画像；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据",
  "type": "object",
  "properties": {
    "self_item_id": {
      "type": "string",
      "description": "本店商品 ID；不可与 rival_item_ids 中任一 ID 重复"
    },
    "rival_item_ids": {
      "description": "竞争商品 ID；英文逗号分隔字符串或字符串数组；中文逗号自动转换；最多 3 个",
      "oneOf": [
        { "type": "string" },
        { "type": "array", "items": { "type": "string" }, "maxItems": 3 }
      ]
    },
    "date_type": {
      "type": "string",
      "description": "分析周期类型。可选值：yesterday（昨日）、recent7（近7天）、recent30（近30天）、custom（自定义）",
      "enum": ["yesterday", "recent7", "recent30", "custom"],
      "default": "recent7"
    },
    "custom_start_date": {
      "type": "string",
      "description": "分析开始日期；date_type=custom 时必填；支持 YYYYMMDD 或 YYYY-MM-DD；须在最近 90 天内且最晚为昨日",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "分析结束日期；date_type=custom 时必填；支持 YYYYMMDD 或 YYYY-MM-DD；须在最近 90 天内且最晚为昨日；不可早于 custom_start_date",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_peer_start_date": {
      "type": "string",
      "description": "对比周期开始日期；date_type=custom 时必填；支持 YYYYMMDD 或 YYYY-MM-DD；须在最近 90 天内且最晚为昨日",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_peer_end_date": {
      "type": "string",
      "description": "对比周期结束日期；date_type=custom 时必填；支持 YYYYMMDD 或 YYYY-MM-DD；须在最近 90 天内且最晚为昨日；不可早于 custom_peer_start_date",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "customer_time_window": {
      "type": "string",
      "description": "分析对象客群时间周期",
      "enum": ["recent7", "recent15", "recent30", "recent90"],
      "default": "recent7"
    },
    "compare_customer_time_window": {
      "type": "string",
      "description": "对比对象客群时间周期；默认与 customer_time_window 相同",
      "enum": ["recent7", "recent15", "recent30", "recent90"]
    },
    "customer_behavior_types": {
      "description": "分析对象客群行为；英文 code；英文逗号分隔或字符串数组；默认五行为全选",
      "oneOf": [
        { "type": "string" },
        {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["browse", "favorite", "add_cart", "purchase", "search"]
          },
          "minItems": 1
        }
      ]
    },
    "compare_customer_behavior_types": {
      "description": "对比对象客群行为；英文 code；英文逗号分隔或字符串数组；默认五行为全选",
      "oneOf": [
        { "type": "string" },
        {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["browse", "favorite", "add_cart", "purchase", "search"]
          },
          "minItems": 1
        }
      ]
    }
  },
  "required": ["self_item_id", "rival_item_ids"],
  "allOf": [
    {
      "if": {
        "properties": {
          "date_type": { "const": "custom" }
        },
        "required": ["date_type"]
      },
      "then": {
        "required": [
          "custom_start_date",
          "custom_end_date",
          "custom_peer_start_date",
          "custom_peer_end_date"
        ]
      }
    }
  ],
  "additionalProperties": false
}
```

### 数据字段

输出为 `data[0]` 单条聚合对象：**任务元数据 + `competeItems` + 八块映射数据（顶层平铺）**（含客群画像）。

:::field-tree
@define 竞争商品展示项
| `role` | 商品角色 | `String` | 否 | 页面顺序 + 入参角色 | `selfItem` / `rivalItem1`~`rivalItem3` |
| `itemId` | 商品 ID | `String` | 否 | 详情链接 URL | `897425691792` |
| `name` | 商品名称 | `String` | 否 | 链接 title 或文案 | `巴拉巴拉童装儿童短袖t恤...` |
| `url` | 商品详情页 URL | `String` | 否 | 页面链接 href | `https://detail.tmall.com/item.htm?id=897425691792` |
| `imageUrl` | 商品主图 URL | `String` | 是 | 页面 img src（竞品可能为 null） | 见数据样例 |

@define 竞品指标项
| `base` | 分析周期值 | `Number / String` | 是 | competitorList[].base | `372` |
| `basePeriod` | 对比周期值 | `Number / String` | 是 | competitorList[].basePeriod | `325` |
| `growthRate` | 环比增长率 | `Number / String` | 是 | competitorList[].growthRate | `-0.32` |
| `competitorId` | 商品 ID | `String` | 否 | competitorList[].competitorId | `897425691792` |

@define 单指标竞争对比
| `competitorList` @竞品指标项 | 本品/竞品对比列表 | `List[Dict]` | 是 | data.{metricKey}.competitorList | 见数据样例 |

@define 接口指标字典
| `{metricKey}` @单指标竞争对比 | 指标竞争对比 | `Dict` | 是 | indicator data.{metricKey} | 见数据样例 |

@define 渠道明细树节点
| `channelName` | 渠道名称 | `String` | 是 | flow/indicator list[].channelName | `关键词推广` |
| `channelId` | 渠道 ID | `String` | 是 | flow/indicator list[].channelId | `371` |
| `channelType` | 渠道类型 | `String` | 是 | flow/indicator list[].channelType | `ad` |
| `subChannels` | 子渠道列表 | `List[Dict]` | 是 | flow/indicator list[].subChannels（子节点字段同本层，可多级嵌套） | 见数据样例 |
| `{metricKey}` @单指标竞争对比 | 渠道指标 | `Dict` | 是 | flow/indicator list[].{metricKey} | 见数据样例 |

@define 流量结构节点
| `channelName` | 结构分类名称 | `String` | 是 | structural list[].channelName | `付费` |
| `clickRate` | 点击占比 | `Number` | 是 | structural list[].clickRate | `0.994017283403501` |
| `{metricKey}` | 其他指标 | `Number / String / Dict / List` | 是 | structural list[].{metricKey} | 见数据样例 |

@define 按商品流量结构
| `itemId` | 商品 ID | `String` | 否 | 请求体 competitorIds[0] | `897425691792` |
| `list` @流量结构节点 | 结构节点列表 | `List[Dict]` | 否 | data.list | 见数据样例 |

@define 客群画像行
| `targetRole` | 分析对象角色 | `String` | 否 | 采集上下文 | `selfItem`（分析对象）/ `compareItems`（对比对象） |
| `itemId` | 本店商品 ID | `String` | 是 | 分析对象时填 self_item_id | `897425691792` |
| `itemIds` | 竞品 ID 列表 | `List[String]` | 是 | 对比对象时填 rival_item_ids | `["1057000824998"]` |
| `behaviorTypes` | 客群行为 code 列表 | `List[String]` | 否 | 任务入参 behavior_types | `["browse","favorite"]` |
| `behaviorValues` | 行为 API values | `String` | 否 | tag/chart 请求体 303280 | `1,2,3,4,5` |
| `timeWindow` | 时间周期 code | `String` | 否 | 任务入参 time_window | `recent7` |
| `timeWindowDays` | 时间周期天数 | `Number` | 否 | recent7→7 / recent15→15 等 | `7` |
| `profileType` | 画像维度 code | `String` | 否 | 固定 6 维 | `gender` |
| `profileTagId` | 画像 tagId | `Number` | 否 | profile_type_map | `114554` |
| `profileLabel` | 画像维度名称 | `String` | 否 | profile_label_map | `用户性别` |
| `tagId` | 标签 ID | `String` | 否 | chartDataFull[].tagId | `114554` |
| `rate` | 占比（原始） | `String` | 是 | chartDataFull[].rate | `0.903125` |
| `ratio` | 占比（归一） | `String` | 是 | chartDataFull[].rate 或 ratio | `0.903125` |
| `optionValue` | 选项值 | `String` | 是 | chartDataFull[].optionValue | `0` |
| `tagOptionGroupId` | 选项组 ID | `String` | 是 | chartDataFull[].tagOptionGroupId | `12685` |
| `tagType` | 标签类型 | `String` | 是 | chartDataFull[].tagType | `CHECKBOX` |
| `optionId` | 选项 ID | `String` | 是 | chartDataFull[].optionId | `6087558` |
| `isHaveSubOption` | 是否有子选项 | `String` | 是 | chartDataFull[].isHaveSubOption | `false` |
| `optionName` | 选项名称 | `String` | 是 | chartDataFull[].optionName | `女性用户` |
| `tagName` | 标签名称 | `String` | 是 | chartDataFull[].tagName | `用户性别` |
| `optionNum` | 覆盖人数 | `String` | 是 | chartDataFull[].optionNum | `2023` |


| 字段                | 中文释义         | 数据类型     | 可为空 | 取数路径                                     | 示例              |
| ----------------- | ------------ | -------- | --- | ---------------------------------------- | --------------- |
| `selfItemId`      | 本店商品 ID      | `String` | 否   | 任务入参 self_item_id                        | `897425691792`  |
| `rivalItemId1`    | 竞争商品 ID（第一个） | `String` | 否   | rival_item_ids[0]                        | `1057000824998` |
| `rivalItemId2`    | 竞争商品 ID（第二个） | `String` | 是   | rival_item_ids[1]（不足时为 null）             | `1044235732163` |
| `rivalItemId3`    | 竞争商品 ID（第三个） | `String` | 是   | rival_item_ids[2]（不足时为 null）             | `1019326026903` |
| `dateType`        | 分析周期类型       | `String` | 否   | 任务入参 date_type                           | `custom`        |
| `beginDate`       | 分析开始日期       | `String` | 否   | 页面「分析周期」选择器实际展示的起始日（YYYY-MM-DD） | `2026-06-21`    |
| `endDate`         | 分析结束日期       | `String` | 否   | 页面「分析周期」选择器实际展示的结束日（结束日为昨日时页面可能显示「昨日」，已归一化为 YYYY-MM-DD） | `2026-06-28`    |
| `peerBeginDate`   | 对比周期开始日期     | `String` | 否   | 页面「对比周期」选择器实际展示的起始日（YYYY-MM-DD） | `2026-06-16`    |
| `peerEndDate`     | 对比周期结束日期     | `String` | 否   | 页面「对比周期」选择器实际展示的结束日（YYYY-MM-DD） | `2026-06-20`    |
| `customerTimeWindow` | 分析对象客群时间周期 | `String` | 否 | 任务入参 customer_time_window | `recent7` |
| `compareCustomerTimeWindow` | 对比对象客群时间周期 | `String` | 否 | 任务入参 compare_customer_time_window | `recent15` |
| `customerBehaviorTypes` | 分析对象客群行为 | `List[String]` | 否 | 任务入参 customer_behavior_types（英文 code 列表） | `["search"]` |
| `compareCustomerBehaviorTypes` | 对比对象客群行为 | `List[String]` | 否 | 任务入参 compare_customer_behavior_types（英文 code 列表） | `["search"]` |
| `competeItems` @竞争商品展示项 | 分析对象商品展示信息 | `List[Dict]` | 否 | 选品完成后页面「我的商品」展示区 | 见数据样例 |
| `baseData` @接口指标字典 | 基础分析·推广侧指标 | `Dict` | 否 | base/indicator data | 见数据样例 |
| `shopData` @接口指标字典 | 基础分析·店铺侧指标 | `Dict` | 否 | base/shop/indicator data | 见数据样例 |
| `controlRatioData` @接口指标字典 | 基础分析·竞争控比（仅 click/cartCnt/alipayCnt 有值，其余字段为 null） | `Dict` | 否 | base/control/ratio data | 见数据样例 |
| `flowPaidFreeData` @按商品流量结构 | 流量分析·付免流量结构（渠道结构占比） | `List[Dict]` | 否 | paid_free/structural | 见数据样例 |
| `flowInvestorData` @按商品流量结构 | 流量分析·无界投资结构 | `List[Dict]` | 否 | investor/structural | 见数据样例 |
| `flowAdData` @渠道明细树节点 | 流量分析·广告域归因渠道明细 | `List[Dict]` | 否 | flow/indicator（attributionScale=2）data.list | 见数据样例 |
| `flowFullData` @渠道明细树节点 | 流量分析·全域归因渠道明细 | `List[Dict]` | 否 | flow/indicator（attributionScale=1）data.list | 见数据样例 |
| `customerProfile` @客群画像行 | 客群分析画像行列表 | `List[Dict]` | 否 | tag/chart chartDataFull + 采集上下文 | 见数据样例 |
| `bizDate`         | 业务日期         | `String` | 否   | 附加                                       |                 |
| `accountId`       | 授权 ID        | `String` | 否   | 附加                                       |                 |
:::


### 取数说明

`beginDate` / `endDate` / `peerBeginDate` / `peerEndDate` 为日期面板操作完成后页面选择器实际展示值，非入参推算值。

`competeItems[]` 按页面「我的商品」展示区顺序排列：首项为本品（`role=selfItem`），后续为竞品（`rivalItem1`~`rivalItem3`）；含商品名称、详情页 URL 及主图 URL。

所有「本品 / 竞品 × 指标 × 三口径（当前 / 对比 / 环比）」均来自 `competitorList`：在对应 `{metricKey}.competitorList` 中按 `competitorId` 匹配 `selfItemId` 或 `rivalItemIdN`，读取 `base` / `basePeriod` / `growthRate`。

`controlRatioData` 虽与 `baseData` 共用字段名 schema，但接口仅返回 `click`、`cartCnt`、`alipayCnt` 三项控比，其余 metricKey 均为 `null`。

流量结构类数据（付免/无界）按 `flowPaidFreeData[]` / `flowInvestorData[]` 中 `itemId` 定位商品，再读 `list[]` 下各 `channelName` 的 `clickRate`（小数，展示时 ×100 为百分比）。

客群画像按 `customerProfile[]` 行读取：`targetRole` 区分分析对象/对比对象；6 个 `profileType` 固定为 `gender`（用户性别）、`age`（用户年龄）、`purchasing_power`（消费能力等级）、`city_level`（城市等级）、`monthly_purchase_freq`（月均消费频次）、`fmcg_strategy_crowd`（大快消策略人群）。


| 页面区块        | 页面指标           | 数据路径                   | 接口 metricKey / 字段                          | 说明                                     |
| ----------- | -------------- | ---------------------------- | ------------------------------------- | -------------------------------------- |
| 设置分析对象 | 本品/竞品名称、链接、主图 | `competeItems[]` | `role` / `itemId` / `name` / `url` / `imageUrl` | 选品完成后从页面展示区抓取 |
| 基础分析 · 竞争控比 | 点击量控比 | `controlRatioData.click` | `click` | 0~1 份额，非绝对点击量；仅此项及 cartCnt、alipayCnt 有值 |
| 基础分析 · 竞争控比 | 加购量控比 | `controlRatioData.cartCnt` | `cartCnt` | 同上 |
| 基础分析 · 竞争控比 | 成交笔数控比 | `controlRatioData.alipayCnt` | `alipayCnt` | 同上 |
| 基础分析 · 流量转化 | 整体 IPV（点击量） | `shopData.click`             | `click`                               | 页面「整体 IPV」对应 shop 侧点击量，非 `pv`          |
| 基础分析 · 流量转化 | 整体加购率          | `shopData.cartRate`          | `cartRate`                            | 小数，展示时 ×100 为百分比                       |
| 基础分析 · 流量转化 | 整体成交转化率        | `shopData.alipayConversion`  | `alipayConversion`                    | 同上                                     |
| 基础分析 · 成交表现 | 整体成交笔数         | `shopData.alipayCnt`         | `alipayCnt`                           | 可为数值或平台脱敏值如 `"<10"`                    |
| 基础分析 · 成交表现 | 整体笔单价          | `shopData.averageOrderValue` | `averageOrderValue`                   | 同上                                     |
| 基础分析 · 推广表现 | 付费点击量          | `baseData.clickAd`           | `clickAd`                             | 推广侧指标在 base/indicator；无推广数据时可能为 null |
| 基础分析 · 推广表现 | 单次点击成本         | `baseData.clickCost`         | `clickCost`                           | 同上                                     |
| 基础分析 · 推广表现 | 当天引导 ROI       | `baseData.roi1d`             | `roi1d`                               | 同上                                     |
| 基础分析 · 推广表现 | 当天引导成交笔数       | `baseData.alipayCnt1d`       | `alipayCnt1d`                         | 同上                                     |
| 基础分析 · 推广表现 | 当天引导加购率       | `baseData.cartRate1d`        | `cartRate1d`                          | 同上                                     |
| 基础分析 · 推广表现 | 当天引导成交转化率     | `baseData.alipayConversion1d` | `alipayConversion1d`                 | 同上                                     |
| 基础分析 · 推广表现 | 广告点击率         | `baseData.paidClickRate`     | `paidClickRate`                       | 同上                                     |
| 基础分析 · 推广表现 | 广告当天引导 ROI     | `baseData.roi1dAd`           | `roi1dAd`                             | 同上                                     |
| 流量分析 · 渠道结构 | 付费/免费搜索/免费推荐/免费其他占比 | `flowPaidFreeData[].list` | `clickRate` + `channelName` | 页面「渠道结构」区块下「付免流量结构」Tab；每商品 4 项 |
| 流量分析 · 无界投资结构 | 投资结构占比 | `flowInvestorData[].list` | `clickRate` + `channelName` | 无数据时 `list` 为空数组 |
| 流量分析 · 核心指标对比 | 全站/关键词/人群推广各指标 | `flowAdData[]`               | 按 channelId/Name 定位节点后读 `{metricKey}` | 广告域归因渠道明细树；无推广时可能为空数组 |
| 流量分析 · 核心指标对比 | 搜索/推荐/私域等      | `flowFullData[]`             | 按 channelName 定位一级节点后读 `{metricKey}`  | 全域归因渠道明细树；需递归 `subChannels` 取子渠道           |
| 流量分析 · 核心指标对比 | 点击量/当天引导指标等（分渠道） | `flowAdData[]` / `flowFullData[]` | `click` / `alipayCnt1d` / `cartRate1d` / `alipayConversion1d` 等 | 与基础分析同 metricKey，按渠道节点读取 |
| 客群分析 | 6 维画像选项分布 | `customerProfile[]` | `profileType` + `optionName` + `ratio` | 分析对象与对比对象各采集一行/选项；见 `@define 客群画像行` |

**`flowFullData` 一级渠道（全域归因，常见 7 项）：**

| channelName | channelType | 说明 |
| ----------- | ----------- | ---- |
| 淘宝私域 | organic | 含 11 个子渠道（我的淘宝、购物车等） |
| 淘宝推荐 | organic | — |
| 淘宝搜索 | organic | — |
| 淘宝客 | organic | — |
| 淘宝其他 | organic | 含 14 个子渠道 |
| 淘宝直播 | organic | — |
| 流量宝 | brand_ad | — |



### 数据样例


```json
[
  {
    "bizDate": "20260630",
    "accountId": "120",
    "selfItemId": "897425691792",
    "rivalItemId1": "1057000824998",
    "rivalItemId2": "1044235732163",
    "rivalItemId3": "1019326026903",
    "dateType": "custom",
    "beginDate": "2026-06-21",
    "endDate": "2026-06-28",
    "peerBeginDate": "2026-06-16",
    "peerEndDate": "2026-06-20",
    "customerTimeWindow": "recent7",
    "compareCustomerTimeWindow": "recent15",
    "customerBehaviorTypes": ["search"],
    "compareCustomerBehaviorTypes": ["search"],
    "competeItems": [
      {
        "role": "selfItem",
        "itemId": "897425691792",
        "name": "巴拉巴拉童装儿童短袖t恤男童打底衫女童夏款上衣速干纯棉宽松型",
        "url": "https://detail.tmall.com/item.htm?id=897425691792",
        "imageUrl": "https://img.alicdn.com/imgextra/i2/4132408402/O1CN01lzGoIS2BwAs0ewyeK_!!4611686018427382866-0-item_pic.jpg"
      },
      {
        "role": "rivalItem1",
        "itemId": "1057000824998",
        "name": "女童精致短袖t恤2026夏天新款洋气短款上衣小女孩独特漂亮夏季薄",
        "url": "https://detail.tmall.com/item.htm?id=1057000824998",
        "imageUrl": "https://img.alicdn.com/imgextra/i4/2213282449358/O1CN01QWNIMC2J01WUHzVp8_!!4611686018427381710-0-item_pic.jpg"
      }
    ],
    "controlRatioData": {
      "click": {
        "competitorList": [
          {
            "base": 0.9845457383702778,
            "basePeriod": 0.9968047669422915,
            "growthRate": -0.012259028572013664,
            "competitorId": "897425691792"
          }
        ]
      }
    },
    "flowPaidFreeData": [
      {
        "itemId": "897425691792",
        "list": [
          { "channelName": "付费", "clickRate": 0.0 },
          { "channelName": "免费搜索", "clickRate": 0.0031021493463328164 },
          { "channelName": "免费推荐", "clickRate": 0.0028805672501661865 },
          { "channelName": "免费其他", "clickRate": 0.994017283403501 }
        ]
      }
    ],
    "flowInvestorData": [
      {
        "itemId": "897425691792",
        "list": []
      }
    ],
    "shopData": {
      "click": {
        "competitorList": [
          {
            "base": 6307,
            "basePeriod": 46709,
            "growthRate": -0.86,
            "competitorId": "897425691792"
          }
        ]
      }
    },
    "flowFullData": [
      {
        "channelId": "private",
        "channelName": "淘宝私域",
        "channelType": "organic",
        "click": {
          "competitorList": [
            {
              "base": 1663,
              "basePeriod": 9658,
              "growthRate": -0.83,
              "competitorId": "897425691792"
            }
          ]
        },
        "subChannels": []
      }
    ],
    "customerProfile": [
      {
        "targetRole": "selfItem",
        "itemId": "897425691792",
        "itemIds": null,
        "behaviorTypes": ["search"],
        "behaviorValues": "5",
        "timeWindow": "recent7",
        "timeWindowDays": 7,
        "profileType": "gender",
        "profileTagId": 114554,
        "profileLabel": "用户性别",
        "tagId": "114554",
        "rate": "0.903125",
        "ratio": "0.903125",
        "optionValue": "0",
        "optionName": "女性用户",
        "tagName": "用户性别",
        "optionNum": "2023"
      }
    ]
  }
]
```

---

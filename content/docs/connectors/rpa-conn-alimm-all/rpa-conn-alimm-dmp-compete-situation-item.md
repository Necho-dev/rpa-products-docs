---
title: 达摩盘-竞争态势-竞争商品分析
description: 采集达摩盘竞争态势分析页中本品与竞品的「基础分析 + 流量分析（广告域/全域归因）」指标；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据
entry: rpa.conn.alimm.dmp.compete.situation.item
badge:
  label: 待上线
  color: "#EA580C"
---

| 属性             | 值                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                            |
| **连接器代码**   | `rpa.conn.alimm.dmp.compete.situation.item`                                             |
| **归属 PyPI 包** | `rpa-conn-alimm-all`                                                                    |
| **操作类型**     | 浏览器自动化操作 + 网络请求监听                                                         |
| **目标网页**     | `https://dmp.taobao.com/index_new.html#!/compete/compete-situation`                     |
| **适用场景**     | 采集达摩盘竞争态势分析页中本品与竞品的「基础分析 + 流量分析（广告域/全域归因）」指标；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据 |
| **预估耗时**     | `90s`                                                                                   |

### 目标页面

> **路径**：阿里妈妈达摩盘—市场—竞争分析—竞争态势分析—竞争商品分析
>
> **网址**：[https://dmp.taobao.com/index_new.html#!/compete/compete-situation](https://dmp.taobao.com/index_new.html#!/compete/compete-situation)

![阿里妈妈达摩盘—竞争商品分析](../../public/images/alimm/dmp_compete_situation_item_20260626.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `self_item_id` | 本店商品 ID | `String` | 是 | — | 不可与 `rival_item_ids` 中任一 ID 重复 |
| `rival_item_ids` | 竞争商品 ID | `String \| List[String]` | 是 | — | 英文逗号分隔字符串或 JSON 数组；中文逗号自动转换；最多 3 个；示例 `"123,456"` 或 `["123","456"]` |
| `date_type` | 分析周期类型 | `String` | 否 | `recent7` | 可选值：`yesterday`（昨日）、`recent7`（近7天）、`recent30`（近30天）、`custom`（自定义）。快捷周期下结束日固定为昨日，对比周期为分析周期前一段等长区间（环比，与分析周期不重叠） |
| `custom_start_date` | 分析开始日期 | `String` | 条件必填 | — | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内 |
| `custom_end_date` | 分析结束日期 | `String` | 条件必填 | — | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内；不可早于 `custom_start_date` |
| `custom_peer_start_date` | 对比周期开始日期 | `String` | 条件必填 | — | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内 |
| `custom_peer_end_date` | 对比周期结束日期 | `String` | 条件必填 | — | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内；不可早于 `custom_peer_start_date`；分析周期与对比周期允许重叠 |

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

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "阿里妈妈达摩盘-竞争商品分析 - 查询入参",
  "description": "采集达摩盘竞争态势分析页中本品与竞品的「基础分析 + 流量分析（广告域/全域归因）」指标；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据",
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

输出为 `data[0]` 单条聚合对象，包含任务元数据、汇总分析、原始映射数据与数据质量信息。

:::field-tree
@define 竞品指标项
| `base` | 分析周期值 | `Number / String` | 是 | competitorList[].base | `372` |
| `basePeriod` | 对比周期值 | `Number / String` | 是 | competitorList[].basePeriod | `325` |
| `growthRate` | 环比增长率 | `Number / String` | 是 | competitorList[].growthRate | `0.15` |
| `competitorId` | 商品 ID | `String` | 否 | competitorList[].competitorId | `897425691792` |

@define 单指标竞争对比
| `competitorList` @竞品指标项 | 本品/竞品对比列表 | `List[Dict]` | 是 | data.{metric}.competitorList | 见数据样例 |

@define 接口指标字典
| `{metricKey}` @单指标竞争对比 | 指标竞争对比 | `Dict` | 是 | base/shop indicator data.{metricKey} | 见数据样例 |

@define 渠道树节点
| `channelName` | 渠道名称 | `String` | 是 | flow/indicator list[].channelName | `关键词推广` |
| `channelId` | 渠道 ID | `String` | 是 | flow/indicator list[].channelId | `371` |
| `channelType` | 渠道类型 | `String` | 是 | flow/indicator list[].channelType | `ad` |
| `subChannels` | 子渠道列表 | `List[Dict]` | 是 | flow/indicator list[].subChannels（子节点字段同本层，可多级嵌套） | 见数据样例 |
| `{metricKey}` @单指标竞争对比 | 渠道指标 | `Dict` | 是 | flow/indicator list[].{metricKey} | 见数据样例 |

@define 原始映射数据
| `baseData` @接口指标字典 | 基础分析原始指标 | `Dict` | 否 | base/indicator data | 见数据样例 |
| `shopData` @接口指标字典 | 店铺分析原始指标 | `Dict` | 否 | base/shop/indicator data | 见数据样例 |
| `flowAdData` @渠道树节点 | 广告域归因渠道树 | `List[Dict]` | 否 | flow/indicator（广告域）list | 见数据样例 |
| `flowFullData` @渠道树节点 | 全域归因渠道树 | `List[Dict]` | 否 | flow/indicator（全域）list | 见数据样例 |

@define 基础分析指标块
| `ipv` | 浏览量 | `Number / String` | 是 | 经 base/shop 指标 competitorList.basePeriod / growthRate | — |
| `cartRate` | 加购率 | `Number / String` | 是 | 经 base/shop 指标 competitorList.basePeriod / growthRate | — |
| `conversionRate` | 成交转化率 | `Number / String` | 是 | 经 base/shop 指标 competitorList.basePeriod / growthRate | — |
| `orderCount` | 成交笔数 | `Number / String` | 是 | 经 base/shop 指标 competitorList.basePeriod / growthRate | — |
| `avgOrderValue` | 笔单价 | `Number / String` | 是 | 经 base/shop 指标 competitorList.basePeriod / growthRate | — |
| `paidClickCount` | 付费点击量 | `Number / String` | 是 | 经 base 指标 competitorList.basePeriod / growthRate | — |
| `clickCost` | 点击成本 | `Number / String` | 是 | 经 base 指标 competitorList.basePeriod / growthRate | — |
| `roi1d` | 当天引导 ROI | `Number / String` | 是 | 经 base 指标 competitorList.basePeriod / growthRate | — |
| `guidedOrderCount1d` | 当天引导成交笔数 | `Number / String` | 是 | 经 base 指标 competitorList.basePeriod / growthRate | — |

@define 基础分析条目
| `itemRole` | 商品角色 | `String` | 否 | 经入参映射 | `selfItem` |
| `itemId` | 商品 ID | `String` | 否 | 经入参映射 | `897425691792` |
| `ipv` | 浏览量 | `Number / String` | 是 | 经 base/shop 指标汇总 | — |
| `cartRate` | 加购率 | `Number / String` | 是 | 经 base/shop 指标汇总 | — |
| `conversionRate` | 成交转化率 | `Number / String` | 是 | 经 base/shop 指标汇总 | — |
| `orderCount` | 成交笔数 | `Number / String` | 是 | 经 base/shop 指标汇总 | — |
| `avgOrderValue` | 笔单价 | `Number / String` | 是 | 经 base/shop 指标汇总 | — |
| `paidClickCount` | 付费点击量 | `Number / String` | 是 | 经 base 指标汇总 | — |
| `clickCost` | 点击成本 | `Number / String` | 是 | 经 base 指标汇总 | — |
| `roi1d` | 当天引导 ROI | `Number / String` | 是 | 经 base 指标汇总 | — |
| `guidedOrderCount1d` | 当天引导成交笔数 | `Number / String` | 是 | 经 base 指标汇总 | — |
| `basePeriod` @基础分析指标块 | 对比周期指标 | `Dict` | 否 | 经 base/shop 指标 competitorList.basePeriod 汇总 | 见数据样例 |
| `growthRate` @基础分析指标块 | 环比增长率指标 | `Dict` | 否 | 经 base/shop 指标 competitorList.growthRate 汇总 | 见数据样例 |

@define 效果广告汇总
| `wholeNetworkClickCount` | 全站推广点击量 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `wholeNetworkCartRate1d` | 全站推广当天引导加购率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `wholeNetworkClickRate1d` | 全站推广当天引导点击率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `wholeNetworkConversionRate1d` | 全站推广当天引导成交转化率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `wholeNetworkRoi1d` | 全站推广当天引导 ROI | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `keywordClickCount` | 关键词推广点击量 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `keywordCartRate1d` | 关键词推广当天引导加购率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `keywordClickRate1d` | 关键词推广当天引导点击率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `keywordConversionRate1d` | 关键词推广当天引导成交转化率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `keywordRoi1d` | 关键词推广当天引导 ROI | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `audienceClickCount` | 人群推广点击量 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `audienceCartRate1d` | 人群推广当天引导加购率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `audienceClickRate1d` | 人群推广当天引导点击率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `audienceConversionRate1d` | 人群推广当天引导成交转化率 | `Number / String` | 是 | 经广告域渠道汇总 | — |
| `audienceRoi1d` | 人群推广当天引导 ROI | `Number / String` | 是 | 经广告域渠道汇总 | — |

@define 非广告汇总
| `recommendClickCount` | 淘宝推荐点击量 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `recommendCartRate1d` | 淘宝推荐当天引导加购率 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `recommendConversionRate1d` | 淘宝推荐当天引导成交转化率 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `searchClickCount` | 淘宝搜索点击量 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `searchCartRate1d` | 淘宝搜索当天引导加购率 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `searchConversionRate1d` | 淘宝搜索当天引导成交转化率 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `liveClickCount` | 淘宝直播点击量 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `liveCartRate1d` | 淘宝直播当天引导加购率 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |
| `liveConversionRate1d` | 淘宝直播当天引导成交转化率 | `Number / String` | 是 | 经全域归因一级渠道汇总 | — |

@define 流量分析条目
| `itemRole` | 商品角色 | `String` | 否 | 经入参映射 | `selfItem` |
| `itemId` | 商品 ID | `String` | 否 | 经入参映射 | `897425691792` |
| `adEffect` @效果广告汇总 | 效果广告汇总 | `Dict` | 否 | 经广告域渠道汇总 | 见数据样例 |
| `nonAd` @非广告汇总 | 非广告渠道汇总 | `Dict` | 否 | 经全域归因一级渠道汇总 | 见数据样例 |

@define 流量渠道明细指标块
| `clickCount` | 点击量 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `cartRate` | 加购率 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `cartRate1d` | 当天引导加购率 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `conversionRate1d` | 当天引导成交转化率 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `conversionRate` | 成交转化率 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `orderCount1d` | 当天引导成交笔数 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `orderCount` | 成交笔数 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `clickRate` | 点击率 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `roi1d` | 当天引导 ROI | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `clickCost` | 点击成本 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `cost` | 花费 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |
| `avgOrderValue` | 笔单价 | `Number / String` | 是 | 渠道节点 metric 汇总 | — |

@define 流量渠道明细
| `itemRole` | 商品角色 | `String` | 否 | 经入参映射 | `selfItem` |
| `itemId` | 商品 ID | `String` | 否 | 经入参映射 | `897425691792` |
| `sourceType` | 归因类型 | `String` | 否 | ad=广告域，full=全域归因 | `ad` |
| `parentChannelName` | 父渠道名称 | `String` | 是 | 上级渠道 channelName | — |
| `channelName` | 渠道名称 | `String` | 是 | 渠道树节点 channelName | `关键词推广` |
| `channelId` | 渠道 ID | `String` | 是 | 渠道树节点 channelId | `371` |
| `channelType` | 渠道类型 | `String` | 是 | 渠道树节点 channelType | `ad` |
| `level` | 渠道层级 | `Number` | 否 | 递归展开层级 | `1` |
| `clickCount` | 点击量 | `Number / String` | 是 | 当前周期指标 | — |
| `cartRate` | 加购率 | `Number / String` | 是 | 当前周期指标 | — |
| `cartRate1d` | 当天引导加购率 | `Number / String` | 是 | 当前周期指标 | — |
| `conversionRate1d` | 当天引导成交转化率 | `Number / String` | 是 | 当前周期指标 | — |
| `conversionRate` | 成交转化率 | `Number / String` | 是 | 当前周期指标 | — |
| `orderCount1d` | 当天引导成交笔数 | `Number / String` | 是 | 当前周期指标 | — |
| `orderCount` | 成交笔数 | `Number / String` | 是 | 当前周期指标 | — |
| `clickRate` | 点击率 | `Number / String` | 是 | 当前周期指标 | — |
| `roi1d` | 当天引导 ROI | `Number / String` | 是 | 当前周期指标 | — |
| `clickCost` | 点击成本 | `Number / String` | 是 | 当前周期指标 | — |
| `cost` | 花费 | `Number / String` | 是 | 当前周期指标 | — |
| `avgOrderValue` | 笔单价 | `Number / String` | 是 | 当前周期指标 | — |
| `basePeriod` @流量渠道明细指标块 | 对比周期指标 | `Dict` | 否 | 对比周期 competitorList 汇总 | 见数据样例 |
| `growthRate` @流量渠道明细指标块 | 环比增长率指标 | `Dict` | 否 | growthRate competitorList 汇总 | 见数据样例 |

@define 缺失字段记录
| `field` | 缺失字段名 | `String` | 否 | flowAnalysis 汇总输出字段 key | `wholeNetworkClickCount` |
| `scope` | 缺失范围 | `String` | 否 | `flowAnalysis.adEffect` 或 `flowAnalysis.nonAd` | `flowAnalysis.adEffect` |
| `reason` | 缺失原因 | `String` | 否 | 页面未展示对应渠道 | 见数据样例 |

@define 数据质量摘要
| `flowSourceDetailCount` | 渠道明细行数 | `Number` | 否 | flowSourceDetails 统计 | — |
| `fullChannelNodeCount` | 全域归因渠道节点数 | `Number` | 否 | 全域渠道树统计 | — |
| `adChannelNodeCount` | 广告域渠道节点数 | `Number` | 否 | 广告域渠道树统计 | — |
| `currentValueCount` | 当前周期非空值数 | `Number` | 否 | flowSourceDetails 当前周期指标统计 | — |
| `basePeriodValueCount` | 对比周期非空值数 | `Number` | 否 | flowSourceDetails.basePeriod 统计 | — |
| `growthRateValueCount` | 增长率非空值数 | `Number` | 否 | flowSourceDetails.growthRate 统计 | — |
| `summaryFieldCount` | 基础分析非空值数 | `Number` | 否 | basicAnalysis 汇总字段非空统计 | — |
| `note` | 说明 | `String` | 否 | 固定说明文案 | 见数据样例 |

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `selfItemId` | 本店商品 ID | `String` | 否 | 任务入参 self_item_id | `897425691792` |
| `rivalItemId1` | 竞争商品 ID（第一个） | `String` | 否 | `rival_item_ids[0]` | `1057000824998` |
| `rivalItemId2` | 竞争商品 ID（第二个） | `String` | 是 | `rival_item_ids[1]`（不足时为 null） | `1044235732163` |
| `rivalItemId3` | 竞争商品 ID（第三个） | `String` | 是 | `rival_item_ids[2]`（不足时为 null） | `1019326026903` |
| `dateType` | 分析周期类型 | `String` | 否 | 任务入参 date_type | `recent7` |
| `beginDate` | 分析开始日期 | `String` | 否 | 快捷周期自动计算；custom 取 `custom_start_date` | `2026-06-18` |
| `endDate` | 分析结束日期 | `String` | 否 | 快捷周期自动计算；custom 取 `custom_end_date` | `2026-06-24` |
| `peerBeginDate` | 对比周期开始日期 | `String` | 否 | 快捷周期环比推算；custom 取 `custom_peer_start_date` | `2026-06-11` |
| `peerEndDate` | 对比周期结束日期 | `String` | 否 | 快捷周期环比推算；custom 取 `custom_peer_end_date` | `2026-06-17` |
| `basicAnalysis` @基础分析条目 | 基础分析汇总 | `List[Dict]` | 否 | base/shop indicator 汇总 | 见数据样例 |
| `flowAnalysis` @流量分析条目 | 流量分析汇总 | `List[Dict]` | 否 | flow/indicator 汇总 | 见数据样例 |
| `flowSourceDetails` @流量渠道明细 | 全渠道递归明细 | `List[Dict]` | 否 | 广告域+全域渠道树展开 | 见数据样例 |
| `rawFlowSourceTree` @渠道树节点 | 映射后全域归因渠道树 | `List[Dict]` | 否 | flow/indicator（全域）映射后 list | 见数据样例 |
| `rawData` @原始映射数据 | 映射后原始接口数据 | `Dict` | 否 | base/shop/flow 接口 data 映射 | 见数据样例 |
| `missingFields` @缺失字段记录 | 汇总字段缺失清单 | `List[Dict]` | 否 | 汇总字段空值统计 | 见数据样例 |
| `dataQuality` @数据质量摘要 | 数据质量统计 | `Dict` | 否 | 渠道树与汇总字段统计 | 见数据样例 |
| `bizDate` | 业务日期 | `String` | 否 | 附加 |  |
| `accountId` | 授权 ID | `String` | 否 | 附加 |  |
:::

### 数据样例

> 数据来源：账号 120 / `date_type=recent7` / 阶段 C 验收（2026-06-29）

> 以下为代表性摘录：`basicAnalysis` 展示 2/4 条、`flowSourceDetails` 展示 2/132 条、`rawFlowSourceTree` 展示 1 个根节点（不含子渠道）、`missingFields` 展示 3/10 条；`dataQuality` 为完整统计。

```json
[
  {
    "bizDate": "20260629",
    "accountId": "120",
    "selfItemId": "897425691792",
    "rivalItemId1": "1057000824998",
    "rivalItemId2": "1044235732163",
    "rivalItemId3": "1019326026903",
    "dateType": "recent7",
    "beginDate": "2026-06-22",
    "endDate": "2026-06-28",
    "peerBeginDate": "2026-06-15",
    "peerEndDate": "2026-06-21",
    "basicAnalysis": [
      {
        "itemRole": "selfItem",
        "itemId": "897425691792",
        "ipv": null,
        "cartRate": 0.18170287,
        "conversionRate": 0.03535754,
        "orderCount": 223,
        "avgOrderValue": 35.4573991,
        "paidClickCount": null,
        "clickCost": null,
        "roi1d": null,
        "guidedOrderCount1d": null,
        "basePeriod": {
          "ipv": null,
          "cartRate": 0.26874906,
          "conversionRate": 0.07446102,
          "orderCount": 3478,
          "avgOrderValue": 34.47849339,
          "paidClickCount": null,
          "clickCost": null,
          "roi1d": null,
          "guidedOrderCount1d": null
        },
        "growthRate": {
          "ipv": null,
          "cartRate": -0.32,
          "conversionRate": -0.53,
          "orderCount": -0.94,
          "avgOrderValue": 0.03,
          "paidClickCount": null,
          "clickCost": null,
          "roi1d": null,
          "guidedOrderCount1d": null
        }
      },
      {
        "itemRole": "rivalItem1",
        "itemId": "1057000824998",
        "ipv": null,
        "cartRate": null,
        "conversionRate": null,
        "orderCount": "<10",
        "avgOrderValue": null,
        "paidClickCount": null,
        "clickCost": null,
        "roi1d": null,
        "guidedOrderCount1d": null,
        "basePeriod": {
          "ipv": null,
          "cartRate": null,
          "conversionRate": null,
          "orderCount": "<10",
          "avgOrderValue": null,
          "paidClickCount": null,
          "clickCost": null,
          "roi1d": null,
          "guidedOrderCount1d": null
        },
        "growthRate": {
          "ipv": null,
          "cartRate": null,
          "conversionRate": null,
          "orderCount": null,
          "avgOrderValue": null,
          "paidClickCount": null,
          "clickCost": null,
          "roi1d": null,
          "guidedOrderCount1d": null
        }
      }
    ],
    "flowAnalysis": [
      {
        "itemRole": "selfItem",
        "itemId": "897425691792",
        "adEffect": {
          "wholeNetworkClickCount": null,
          "wholeNetworkCartRate1d": null,
          "wholeNetworkClickRate1d": null,
          "wholeNetworkConversionRate1d": null,
          "wholeNetworkRoi1d": null,
          "keywordClickCount": null,
          "keywordCartRate1d": null,
          "keywordClickRate1d": null,
          "keywordConversionRate1d": null,
          "keywordRoi1d": null,
          "audienceClickCount": null,
          "audienceCartRate1d": null,
          "audienceClickRate1d": null,
          "audienceConversionRate1d": null,
          "audienceRoi1d": null
        },
        "nonAd": {
          "recommendClickCount": 13,
          "recommendCartRate1d": 0.07692308,
          "recommendConversionRate1d": 0.15384615,
          "searchClickCount": 14,
          "searchCartRate1d": null,
          "searchConversionRate1d": null,
          "liveClickCount": 107,
          "liveCartRate1d": 0.21495327,
          "liveConversionRate1d": 0.09345794
        }
      }
    ],
    "flowSourceDetails": [
      {
        "itemRole": "selfItem",
        "itemId": "897425691792",
        "sourceType": "full",
        "level": 1,
        "channelId": "private",
        "channelName": "淘宝私域",
        "channelType": "organic",
        "parentChannelName": null,
        "clickCount": 1663,
        "cartRate": 0.00180397,
        "cartRate1d": 0.00180397,
        "conversionRate1d": 0.00060132,
        "conversionRate": 0.00060132,
        "orderCount1d": 1,
        "orderCount": 1,
        "clickRate": null,
        "roi1d": null,
        "clickCost": null,
        "cost": null,
        "avgOrderValue": null,
        "basePeriod": {
          "clickCount": 9658,
          "cartRate": 0.00124249,
          "cartRate1d": 0.00124249,
          "conversionRate1d": null,
          "conversionRate": null,
          "orderCount1d": 0,
          "orderCount": 0,
          "clickRate": null,
          "roi1d": null,
          "clickCost": null,
          "cost": null,
          "avgOrderValue": null
        },
        "growthRate": {
          "clickCount": -0.83,
          "cartRate": 0.45,
          "cartRate1d": 0.45,
          "conversionRate1d": null,
          "conversionRate": null,
          "orderCount1d": null,
          "orderCount": null,
          "clickRate": null,
          "roi1d": null,
          "clickCost": null,
          "cost": null,
          "avgOrderValue": null
        }
      },
      {
        "itemRole": "rivalItem1",
        "itemId": "1057000824998",
        "sourceType": "full",
        "level": 1,
        "channelId": "private",
        "channelName": "淘宝私域",
        "channelType": "organic",
        "parentChannelName": null,
        "clickCount": null,
        "cartRate": null,
        "cartRate1d": null,
        "conversionRate1d": null,
        "conversionRate": null,
        "orderCount1d": null,
        "orderCount": null,
        "clickRate": null,
        "roi1d": null,
        "clickCost": null,
        "cost": null,
        "avgOrderValue": null,
        "basePeriod": {
          "clickCount": "<10",
          "cartRate": null,
          "cartRate1d": null,
          "conversionRate1d": null,
          "conversionRate": null,
          "orderCount1d": null,
          "orderCount": null,
          "clickRate": null,
          "roi1d": null,
          "clickCost": null,
          "cost": null,
          "avgOrderValue": null
        },
        "growthRate": {
          "clickCount": null,
          "cartRate": null,
          "cartRate1d": null,
          "conversionRate1d": null,
          "conversionRate": null,
          "orderCount1d": null,
          "orderCount": null,
          "clickRate": null,
          "roi1d": null,
          "clickCost": null,
          "cost": null,
          "avgOrderValue": null
        }
      }
    ],
    "rawFlowSourceTree": [
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
            },
            {
              "base": null,
              "basePeriod": "<10",
              "growthRate": null,
              "competitorId": "1057000824998"
            },
            {
              "base": "10~30",
              "basePeriod": "10~30",
              "growthRate": -0.31,
              "competitorId": "1044235732163"
            },
            {
              "base": null,
              "basePeriod": "<10",
              "growthRate": null,
              "competitorId": "1019326026903"
            }
          ]
        },
        "subChannels": []
      }
    ],
    "rawData": {
      "baseData": {
        "cartRate": null
      },
      "shopData": {
        "cartRate": {
          "competitorList": [
            {
              "base": 0.18170287,
              "basePeriod": 0.26874906,
              "growthRate": -0.32,
              "competitorId": "897425691792"
            },
            {
              "base": "3%~5%",
              "basePeriod": "5%~7%",
              "growthRate": -0.45,
              "competitorId": "1044235732163"
            },
            {
              "base": null,
              "basePeriod": null,
              "growthRate": null,
              "competitorId": "1057000824998"
            },
            {
              "base": null,
              "basePeriod": "7%~9%",
              "growthRate": null,
              "competitorId": "1019326026903"
            }
          ]
        }
      },
      "flowAdData": [],
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
              },
              {
                "base": null,
                "basePeriod": "<10",
                "growthRate": null,
                "competitorId": "1057000824998"
              },
              {
                "base": "10~30",
                "basePeriod": "10~30",
                "growthRate": -0.31,
                "competitorId": "1044235732163"
              },
              {
                "base": null,
                "basePeriod": "<10",
                "growthRate": null,
                "competitorId": "1019326026903"
              }
            ]
          }
        }
      ]
    },
    "missingFields": [
      {
        "field": "wholeNetworkClickCount",
        "scope": "flowAnalysis.adEffect",
        "reason": "广告域归因页面未展示渠道「wholeNetwork」，无对应数据"
      },
      {
        "field": "wholeNetworkCartRate1d",
        "scope": "flowAnalysis.adEffect",
        "reason": "广告域归因页面未展示渠道「wholeNetwork」，无对应数据"
      },
      {
        "field": "wholeNetworkClickRate1d",
        "scope": "flowAnalysis.adEffect",
        "reason": "广告域归因页面未展示渠道「wholeNetwork」，无对应数据"
      }
    ],
    "dataQuality": {
      "flowSourceDetailCount": 132,
      "fullChannelNodeCount": 33,
      "adChannelNodeCount": 0,
      "currentValueCount": 112,
      "basePeriodValueCount": 160,
      "growthRateValueCount": 90,
      "summaryFieldCount": 10,
      "note": "字段计数基于 flowSourceDetails 与 basicAnalysis 的非空值统计"
    }
  }
]
```

---

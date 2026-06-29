---

## title: 达摩盘-竞争态势-竞争商品分析
description: 采集达摩盘竞争态势分析页中本品与竞品的「基础分析 + 流量分析（广告域/全域归因）」指标；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据
entry: rpa.conn.alimm.dmp.compete.situation.item
badge:
  label: 待上线
  color: "#EA580C"


| 属性            | 值                                                                          |
| ------------- | -------------------------------------------------------------------------- |
| **连接器类型**     | `RPA 连接器`                                                                  |
| **连接器代码**     | `rpa.conn.alimm.dmp.compete.situation.item`                                |
| **归属 PyPI 包** | `rpa-conn-alimm-all`                                                       |
| **操作类型**      | 浏览器自动化操作 + 网络请求监听                                                          |
| **目标网页**      | `https://dmp.taobao.com/index_new.html#!/compete/compete-situation`        |
| **适用场景**      | 采集达摩盘竞争态势分析页中本品与竞品的「基础分析 + 流量分析（广告域/全域归因）」指标；支持快捷周期与自定义四段日期；本品或竞品未搜到时返回空数据 |
| **预估耗时**      | `90s`                                                                      |


### 目标页面

> **路径**：阿里妈妈达摩盘—市场—竞争分析—竞争态势分析—竞争商品分析
>
> **网址**：[https://dmp.taobao.com/index_new.html#!/compete/compete-situation](https://dmp.taobao.com/index_new.html#!/compete/compete-situation)

阿里妈妈达摩盘—竞争商品分析

### 业务入参


| 字段                       | 中文释义     | 数据类型                    | 必填   | 默认值       | 说明                                                                                                               |
| ------------------------ | -------- | ----------------------- | ---- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `self_item_id`           | 本店商品 ID  | `String`                | 是    | —         | 不可与 `rival_item_ids` 中任一 ID 重复                                                                                   |
| `rival_item_ids`         | 竞争商品 ID  | `String | List[String]` | 是    | —         | 英文逗号分隔字符串或 JSON 数组；中文逗号自动转换；最多 3 个；示例 `"123,456"` 或 `["123","456"]`                                              |
| `date_type`              | 分析周期类型   | `String`                | 否    | `recent7` | 可选值：`yesterday`（昨日）、`recent7`（近7天）、`recent30`（近30天）、`custom`（自定义）。快捷周期下结束日固定为昨日，对比周期为分析周期前一段等长区间（环比，与分析周期不重叠）    |
| `custom_start_date`      | 分析开始日期   | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内                                             |
| `custom_end_date`        | 分析结束日期   | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内；不可早于 `custom_start_date`                    |
| `custom_peer_start_date` | 对比周期开始日期 | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内                                             |
| `custom_peer_end_date`   | 对比周期结束日期 | `String`                | 条件必填 | —         | `date_type=custom` 时必填；支持格式：YYYYMMDD、YYYY-MM-DD；须在「最近 90 天、最晚至昨日」窗口内；不可早于 `custom_peer_start_date`；分析周期与对比周期允许重叠 |


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

输出为 `data[0]` 单条聚合对象：**任务元数据 + `rawData` 四块映射数据**。连接器不做二次汇总（无 `basicAnalysis` / `flowAnalysis` / `flowSourceDetails`），下游按 `competitorList` 自行取数。

:::field-tree
@define 竞品指标项
| `base` | 分析周期值 | `Number / String` | 是 | competitorList[].base | `372` |
| `basePeriod` | 对比周期值 | `Number / String` | 是 | competitorList[].basePeriod | `325` |
| `growthRate` | 环比增长率 | `Number / String` | 是 | competitorList[].growthRate | `-0.32` |
| `competitorId` | 商品 ID | `String` | 否 | competitorList[].competitorId | `897425691792` |

@define 单指标竞争对比
| `competitorList` @竞品指标项 | 本品/竞品对比列表 | `List[Dict]` | 是 | data.{metricKey}.competitorList | 见数据样例 |

@define 接口指标字典
| `{metricKey}` @单指标竞争对比 | 指标竞争对比 | `Dict` | 是 | indicator data.{metricKey} | 见数据样例 |

@define 渠道树节点
| `channelName` | 渠道名称 | `String` | 是 | flow/indicator list[].channelName | `关键词推广` |
| `channelId` | 渠道 ID | `String` | 是 | flow/indicator list[].channelId | `371` |
| `channelType` | 渠道类型 | `String` | 是 | flow/indicator list[].channelType | `ad` |
| `subChannels` | 子渠道列表 | `List[Dict]` | 是 | flow/indicator list[].subChannels（子节点字段同本层，可多级嵌套） | 见数据样例 |
| `{metricKey}` @单指标竞争对比 | 渠道指标 | `Dict` | 是 | flow/indicator list[].{metricKey} | 见数据样例 |

@define 原始映射数据
| `baseData` @接口指标字典 | 基础分析·推广侧指标 | `Dict` | 否 | competition/analysis/base/indicator data | 见数据样例 |
| `shopData` @接口指标字典 | 基础分析·店铺侧指标 | `Dict` | 否 | competition/analysis/base/shop/indicator data | 见数据样例 |
| `flowAdData` @渠道树节点 | 流量分析·广告域归因渠道树 | `List[Dict]` | 否 | flow/indicator（attributionScale=2）data.list | 见数据样例 |
| `flowFullData` @渠道树节点 | 流量分析·全域归因渠道树 | `List[Dict]` | 否 | flow/indicator（attributionScale=1）data.list | 见数据样例 |


| 字段                | 中文释义         | 数据类型     | 可为空 | 取数路径                                     | 示例              |
| ----------------- | ------------ | -------- | --- | ---------------------------------------- | --------------- |
| `selfItemId`      | 本店商品 ID      | `String` | 否   | 任务入参 self_item_id                        | `897425691792`  |
| `rivalItemId1`    | 竞争商品 ID（第一个） | `String` | 否   | rival_item_ids[0]                        | `1057000824998` |
| `rivalItemId2`    | 竞争商品 ID（第二个） | `String` | 是   | rival_item_ids[1]（不足时为 null）             | `1044235732163` |
| `rivalItemId3`    | 竞争商品 ID（第三个） | `String` | 是   | rival_item_ids[2]（不足时为 null）             | `1019326026903` |
| `dateType`        | 分析周期类型       | `String` | 否   | 任务入参 date_type                           | `recent7`       |
| `beginDate`       | 分析开始日期       | `String` | 否   | 快捷周期自动计算；custom 取 custom_start_date      | `2026-06-22`    |
| `endDate`         | 分析结束日期       | `String` | 否   | 快捷周期自动计算；custom 取 custom_end_date        | `2026-06-28`    |
| `peerBeginDate`   | 对比周期开始日期     | `String` | 否   | 快捷周期环比推算；custom 取 custom_peer_start_date | `2026-06-15`    |
| `peerEndDate`     | 对比周期结束日期     | `String` | 否   | 快捷周期环比推算；custom 取 custom_peer_end_date   | `2026-06-21`    |
| `rawData` @原始映射数据 | 映射后原始接口数据    | `Dict`   | 否   | 四接口 field_map 映射结果                       | 见数据样例           |
| `bizDate`         | 业务日期         | `String` | 否   | 附加                                       |                 |
| `accountId`       | 授权 ID        | `String` | 否   | 附加                                       |                 |
| :::               |              |          |     |                                          |                 |


### 取数说明

所有「本品 / 竞品 × 指标 × 三口径（当前 / 对比 / 环比）」均来自 `**competitorList`**：在对应 `{metricKey}.competitorList` 中按 `competitorId` 匹配 `selfItemId` 或 `rivalItemIdN`，读取 `base` / `basePeriod` / `growthRate`。


| 页面区块        | 页面指标           | rawData 路径                   | 接口 metricKey                          | 说明                                     |
| ----------- | -------------- | ---------------------------- | ------------------------------------- | -------------------------------------- |
| 基础分析 · 流量转化 | 整体 IPV         | `shopData.click`             | `click`                               | 页面「整体 IPV」对应 shop 侧点击量，非 `pv`          |
| 基础分析 · 流量转化 | 整体加购率          | `shopData.cartRate`          | `cartRate`                            | 小数，展示时 ×100 为百分比                       |
| 基础分析 · 流量转化 | 整体成交转化率        | `shopData.alipayConversion`  | `alipayConversion`                    | 同上                                     |
| 基础分析 · 成交表现 | 整体成交笔数         | `shopData.alipayCnt`         | `alipayCnt`                           | 可为数值或平台脱敏值如 `"<10"`                    |
| 基础分析 · 成交表现 | 整体笔单价          | `shopData.averageOrderValue` | `averageOrderValue`                   | 同上                                     |
| 基础分析 · 推广表现 | 付费点击量          | `baseData.clickAd`           | `clickAd`                             | 推广侧指标在 base/indicator                  |
| 基础分析 · 推广表现 | 单次点击成本         | `baseData.clickCost`         | `clickCost`                           | 同上                                     |
| 基础分析 · 推广表现 | 当天引导 ROI       | `baseData.roi1d`             | `roi1d`                               | 同上                                     |
| 基础分析 · 推广表现 | 当天引导成交笔数       | `baseData.alipayCnt1d`       | `alipayCnt1d`                         | 同上                                     |
| 流量分析 · 效果广告 | 全站/关键词/人群推广各指标 | `flowAdData[]`               | 按 channelId/Name 定位节点后读 `{metricKey}` | 广告域归因树；channelId 371=关键词、372=人群、435=全站 |
| 流量分析 · 非广告  | 搜索/推荐/直播等      | `flowFullData[]`             | 按 channelName 定位一级节点后读 `{metricKey}`  | 全域归因树；需递归 `subChannels` 取子渠道           |



### 数据样例

> 数据来源：账号 120 / `date_type=recent7` / 阶段 C 验收（2026-06-29）

> 以下为代表性摘录：`shopData` 展示基础分析相关 metricKey；`flowFullData` 展示 1 个根节点；`flowAdData` 在该账号为空数组。

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
    "rawData": {
      "baseData": {
        "clickAd": null,
        "clickCost": {
          "competitorList": [
            {
              "base": null,
              "basePeriod": null,
              "growthRate": null,
              "competitorId": "897425691792"
            }
          ]
        },
        "roi1d": {
          "competitorList": [
            {
              "base": null,
              "basePeriod": null,
              "growthRate": null,
              "competitorId": "897425691792"
            }
          ]
        }
      },
      "shopData": {
        "click": {
          "competitorList": [
            {
              "base": 6307,
              "basePeriod": 46709,
              "growthRate": -0.86,
              "competitorId": "897425691792"
            },
            {
              "base": "<10",
              "basePeriod": "<10",
              "growthRate": -0.87,
              "competitorId": "1057000824998"
            }
          ]
        },
        "cartRate": {
          "competitorList": [
            {
              "base": 0.18170287,
              "basePeriod": 0.26874906,
              "growthRate": -0.32,
              "competitorId": "897425691792"
            }
          ]
        },
        "alipayConversion": {
          "competitorList": [
            {
              "base": 0.03535754,
              "basePeriod": 0.07446102,
              "growthRate": -0.53,
              "competitorId": "897425691792"
            }
          ]
        },
        "alipayCnt": {
          "competitorList": [
            {
              "base": 223,
              "basePeriod": 3478,
              "growthRate": -0.94,
              "competitorId": "897425691792"
            }
          ]
        },
        "averageOrderValue": {
          "competitorList": [
            {
              "base": 35.4573991,
              "basePeriod": 34.47849339,
              "growthRate": 0.03,
              "competitorId": "897425691792"
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
              }
            ]
          },
          "subChannels": []
        }
      ]
    }
  }
]
```

---
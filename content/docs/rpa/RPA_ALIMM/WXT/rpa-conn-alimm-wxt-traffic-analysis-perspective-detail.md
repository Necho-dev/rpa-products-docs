---
title: 万相台-流量分析-关键词竞争透视明细
description: 采集万相台关键词流量分析页竞争流量透视数据，按行业类目拆分竞争透视、搜索时段分布、地域分布与流量透视
entry: rpa.conn.alimm.wxt.traffic.analysis.perspective.detail
badge:
  label: 待上线
  color: "#EA580C"
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响。
category: insight
---

| 属性             | 值                                                                 |
| ---------------- | ------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                       |
| **连接器名称**   | `ODS_万相台关键词流量分析透视明细(阿里妈妈RPA)`                     |
| **连接器代码**   | `rpa.conn.alimm.wxt.traffic.analysis.perspective.detail`           |
| **操作类型**     | `页面解析`                                                         |
| **目标网页**     | `https://one.alimama.com/index.html#!/insight/search/traffic-analysis/index` |
| **适用场景**     | 采集万相台关键词流量分析页竞争流量透视数据，按行业类目拆分竞争透视、搜索时段分布、地域分布与流量透视 |
| **数据表名**     | `ods_rpa_alimm_wxt_traffic_analysis_perspective_detail_du`           |
| **业务表名**     | `ODS_万相台关键词流量分析透视明细(阿里妈妈RPA)`                     |

### 目标页面

> **取数路径**：阿里妈妈—万相台—流量解析—关键词流量分析—竞争流量透视
>
> **取数链接**：[https://one.alimama.com/index.html#!/insight/search/traffic-analysis/index](https://one.alimama.com/index.html#!/insight/search/traffic-analysis/index)

![阿里妈妈—万相台关键词流量分析竞争透视](../../_public/images/alimm/wxt_traffic_analysis_perspective_detail_20260827.png)


### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `key_word` | 关键词 | `String` | 是 | — | 流量分析页搜索关键词，不能为空 |
| `date_type` | 统计周期 | `String` | 否 | `LAST_7_DAYS` | 可选值：`DAY_BEFORE_YESTERDAY`（前天）/ `LAST_7_DAYS`（过去7天（日均））/ `LAST_14_DAYS`（过去14天（日均）） |

### 入参样例

```json
{
  "key_word": "示例关键词",
  "date_type": "LAST_7_DAYS"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "阿里妈妈-万相台关键词竞争透视明细 - 查询入参",
  "description": "采集万相台关键词流量分析页竞争流量透视数据，按行业类目拆分竞争透视、搜索时段分布、地域分布与流量透视",
  "type": "object",
  "properties": {
    "key_word": {
      "type": "string",
      "description": "流量分析页搜索关键词，不能为空",
      "minLength": 1
    },
    "date_type": {
      "type": "string",
      "description": "统计周期。可选值：DAY_BEFORE_YESTERDAY（前天）/ LAST_7_DAYS（过去7天（日均））/ LAST_14_DAYS（过去14天（日均））",
      "enum": ["DAY_BEFORE_YESTERDAY", "LAST_7_DAYS", "LAST_14_DAYS"],
      "default": "LAST_7_DAYS"
    }
  },
  "required": ["key_word"],
  "additionalProperties": false
}
```

### 数据字段

:::field-tree
@define 竞争透视明细
| `priceInterval` | 价格区间 | `Number` | 否 | 页面解析 | `0.05` |
| `impressionIndex` | 展现指数 | `Number` | 否 | 页面解析 | `8694.25` |
| `competition` | 竞争指数 | `Number` | 否 | 页面解析 | `2333.87` |
| `adgroupCntIndex` | 推广单元数指数 | `Number` | 否 | 页面解析 | `2333.87` |

@define 搜索时段分布明细
| `time` | 小时 | `Number` | 否 | 页面解析 | `0` |
| `visitorNum` | 访客指数 | `Number` | 否 | 页面解析 | `14112.06` |
| `ctr` | 点击率 | `Number` | 否 | 页面解析 | `0.044` |

@define 地域分布明细
| `provinceName` | 省份 | `String` | 否 | 页面解析 | `广东` |
| `provinceId` | 省份 ID | `Number` | 否 | 页面解析 | `68` |
| `coordinate` | 坐标 | `String` | 是 | 页面解析 | `113.14,23.08` |
| `impressionIndex` | 展现指数 | `Number` | 否 | 页面解析 | `51542.08` |
| `clickIndex` | 点击指数 | `Number` | 否 | 页面解析 | `2418.41` |
| `ctrIndex` | 点击率 | `Number` | 否 | 页面解析 | `0.044` |
| `cvrIndex` | 点击转化率 | `Number` | 否 | 页面解析 | `0.047` |
| `cpcIndex` | 平均点击单价 | `Number` | 否 | 页面解析 | `0.66` |
| `competition` | 竞争指数 | `Number` | 否 | 页面解析 | `12046.49` |
| `cost` | 花费 | `Number` | 否 | 页面解析 | `187580.57` |
| `alipayDirCnt` | 直接成交笔数 | `Number` | 否 | 页面解析 | `98.14` |
| `alipayDirAmt` | 直接成交金额 | `Number` | 否 | 页面解析 | `483718.57` |
| `alipayIndirCnt` | 间接成交笔数 | `Number` | 否 | 页面解析 | `36.14` |
| `alipayIndirAmt` | 间接成交金额 | `Number` | 否 | 页面解析 | `246890.14` |
| `itemcollCnt` | 收藏宝贝数 | `Number` | 否 | 页面解析 | `24.0` |
| `shopcollCnt` | 收藏店铺数 | `Number` | 否 | 页面解析 | `5.0` |

@define 流量透视明细
| `pvName` | 核心流量来源 | `String` | 否 | 页面解析 | `手淘` |
| `pvtypeId` | 流量来源类型 ID | `Number` | 否 | 页面解析 | `1` |
| `impressionIndex` | 展现指数 | `Number` | 否 | 页面解析 | `353906.77` |
| `clickIndex` | 点击指数 | `Number` | 否 | 页面解析 | `16747.68` |
| `ctrIndex` | 点击率 | `Number` | 否 | 页面解析 | `0.044` |
| `cvrIndex` | 点击转化率 | `Number` | 否 | 页面解析 | `0.052` |
| `avgPrice` | 市场均价 | `Number` | 否 | 页面解析 | `0.86` |
| `competition` | 竞争指数 | `Number` | 否 | 页面解析 | `28890.28` |
| `impression` | 展现量 | `Number` | 否 | 页面解析 | `459339` |
| `click` | 点击量 | `Number` | 否 | 页面解析 | `20426` |

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `key_word` | 关键词 | `String` | 否 | 页面解析 | `****` (已脱敏) |
| `categoryName` | 行业类目 | `String` | 否 | 页面解析 | `童装/婴儿装/亲子装 裤子（新）` |
| `dateType` | 统计周期 | `String` | 否 | 页面解析 | `LAST_7_DAYS` |
| `competitionPerspective` | 竞争透视明细 | `List[Dict]` | 否 | 页面解析 | 见 @竞争透视明细 |
| `searchTimeDistribution` | 搜索时段分布明细 | `List[Dict]` | 否 | 页面解析 | 见 @搜索时段分布明细 |
| `regionDistribution` | 地域分布明细 | `List[Dict]` | 否 | 页面解析 | 见 @地域分布明细 |
| `trafficPerspective` | 流量透视明细 | `List[Dict]` | 否 | 页面解析 | 见 @流量透视明细 |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260827` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****8` (已脱敏) |
:::


### 数据样例

```json
{
  "key_word": "****",
  "categoryName": "童装/婴儿装/亲子装 裤子（新）",
  "dateType": "LAST_7_DAYS",
  "competitionPerspective": [
    {
      "priceInterval": 0.05,
      "impressionIndex": 8694.25,
      "competition": 2333.87,
      "adgroupCntIndex": 2333.87
    },
    {
      "priceInterval": 0.1,
      "impressionIndex": 8904.89,
      "competition": 1839.56,
      "adgroupCntIndex": 1839.56
    }
  ],
  "searchTimeDistribution": [
    { "time": 0, "visitorNum": 14112.06, "ctr": 0.044 },
    { "time": 1, "visitorNum": 6251.8, "ctr": 0.046 },
    { "time": 21, "visitorNum": 35127.84, "ctr": 0.042 },
    { "time": 22, "visitorNum": 33874.05, "ctr": 0.043 }
  ],
  "regionDistribution": [
    {
      "provinceName": "广东",
      "provinceId": 68,
      "coordinate": "113.14,23.08",
      "impressionIndex": 51542.08,
      "clickIndex": 2418.41,
      "ctrIndex": 0.044,
      "cvrIndex": 0.047,
      "cpcIndex": 0.66,
      "competition": 12046.49,
      "cost": 187580.57,
      "alipayDirCnt": 98.14,
      "alipayDirAmt": 483718.57,
      "alipayIndirCnt": 36.14,
      "alipayIndirAmt": 246890.14,
      "itemcollCnt": 24.0,
      "shopcollCnt": 5.0
    },
    {
      "provinceName": "江苏",
      "provinceId": 255,
      "coordinate": "118.46,32.03",
      "impressionIndex": 48310.79,
      "clickIndex": 2527.05,
      "ctrIndex": 0.049,
      "cvrIndex": 0.049,
      "cpcIndex": 0.94,
      "competition": 11587.85,
      "cost": 279885.86,
      "alipayDirCnt": 94.57,
      "alipayDirAmt": 649878.86,
      "alipayIndirCnt": 50.0,
      "alipayIndirAmt": 371457.86,
      "itemcollCnt": 27.86,
      "shopcollCnt": 8.57
    }
  ],
  "trafficPerspective": [
    {
      "pvName": "手淘",
      "pvtypeId": 1,
      "impressionIndex": 353906.77,
      "clickIndex": 16747.68,
      "ctrIndex": 0.044,
      "cvrIndex": 0.052,
      "avgPrice": 0.86,
      "competition": 28890.28,
      "impression": 459339,
      "click": 20426
    },
    {
      "pvName": "天猫",
      "pvtypeId": 3,
      "impressionIndex": 2296.35,
      "clickIndex": 88.42,
      "ctrIndex": 0.036,
      "cvrIndex": 0.122,
      "avgPrice": 1.58,
      "competition": 1354.59,
      "impression": 2690,
      "click": 97
    }
  ],
  "bizDate": "20260827",
  "accountId": "1****8"
}
```

---

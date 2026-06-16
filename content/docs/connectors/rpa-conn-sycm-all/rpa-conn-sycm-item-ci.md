---
title: 市场-竞争-竞品对比
description: 按本店与竞品商品 ID 采集生意参谋竞品对比页的销售分析、来源渠道与客群分析数据
entry: rpa.conn.sycm.item.ci
badge:
  label: 待上线
  color: "#EA580C"
---

| 属性             | 值                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                       |
| **连接器代码**   | `rpa.conn.sycm.item.ci`                                                            |
| **归属 PyPI 包** | `rpa-conn-sycm-all`                                                                |
| **操作类型**     | 浏览器自动化操作 + 网络请求监听                                                    |
| **目标网页**     | `https://sycm.taobao.com/mc/free/ci_item`                                          |
| **适用场景**     | 按本店与竞品商品 ID 采集生意参谋竞品对比页的销售分析、来源渠道与客群分析数据       |
| **预估耗时**     | `120s`                                                                             |

### 目标页面

> **路径**：生意参谋—市场—竞争—竞品对比
>
> **网址**：[https://sycm.taobao.com/mc/free/ci_item](https://sycm.taobao.com/mc/free/ci_item)

![生意参谋—市场—竞争—竞品对比](../../public/images/sycm/item_ci_20260615.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `self_item_id` | 本店商品 ID | `string` | 是 | — | 本店参与对比的商品 ID |
| `rival_item_id_1` | 竞品商品 ID（第一个） | `string` | 是 | — | 第一个竞品商品 ID |
| `rival_item_id_2` | 竞品商品 ID（第二个） | `string` | 否 | — | 第二个竞品商品 ID；不传则不采集竞品 2 相关数据 |
| `date_type` | 销售/来源统计周期类型 | `string` | 否 | 实时 | 允许值：`实时`/`today`（今日）、`recent7`（近 7 天）、`recent30`（近 30 天）、`day`（指定日）、`week`（指定周）、`month`（指定月） |
| `stat_date` | 销售/来源统计日期 | `string` | 条件必填 | — | 当 `date_type` 为 `day`/`week`/`month` 时必填；格式 `YYYYMMDD` 或 `YYYY-MM-DD` |
| `customer_date_type` | 客群分析统计周期类型 | `string` | 否 | `day` | 允许值：`day`（指定日）、`month`（指定月） |
| `customer_stat_date` | 客群分析统计日期 | `string` | 条件必填 | 昨天 | 当 `customer_date_type=month` 时必填；`day` 时未传则默认昨天；格式 `YYYYMMDD` 或 `YYYY-MM-DD`；日粒度范围为近 90 天（不含今天），月粒度仅支持过去 3 个完整月 |

> 三个商品 ID（`self_item_id` / `rival_item_id_1` / `rival_item_id_2`）不允许重复。执行前会在页面商品选择框中搜索校验 ID 是否可命中；未搜到则返回空数据。

### 入参样例

```json
{
    "self_item_id": "975048717355",
    "rival_item_id_1": "638281143270",
    "date_type": "week",
    "stat_date": "2026-04-14",
    "customer_date_type": "month",
    "customer_stat_date": "2026-05-14"
}
```

### 数据字段

每条任务输出 **1 条聚合记录**（`data[0]`），各模块以数组内嵌，非行级平铺。

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `selfItemId` | 本店商品 ID | `string` | 否 | 来自入参 | `975048717355` |
| `rivalItemId1` | 竞品 1 商品 ID | `string` | 否 | 来自入参 | `638281143270` |
| `rivalItemId2` | 竞品 2 商品 ID | `string` | 是 | 来自入参 | `null` |
| `dateType` | 销售/来源统计周期类型 | `string` | 否 | 由入参 `date_type` 映射 | `week` |
| `dateRangeStart` | 销售/来源统计区间起始日 | `string` | 否 | 由入参与周期类型计算 | `2026-04-13` |
| `dateRangeEnd` | 销售/来源统计区间结束日 | `string` | 否 | 由入参与周期类型计算 | `2026-04-19` |
| `keyMetrics` | 关键指标对比 | `List[Dict]` | 是 | 见下方「关键指标对比」 | 见数据样例 `keyMetrics` |
| `skuAnalysis` | SKU 分析 | `List[Dict]` | 是 | 见下方「SKU 分析」 | 见数据样例 `skuAnalysis` |
| `attributeAnalysis` | 属性分析 | `List[Dict]` | 是 | 见下方「属性分析」 | 见数据样例 `attributeAnalysis` |
| `saleStatTime` | 销售分析实际统计时间 | `Dict` | 是 | 见下方「统计时间对象」 | 见数据样例 `saleStatTime` |
| `searchWords` | 入店搜索词 | `List[Dict]` | 是 | 见下方「入店搜索词」 | 见数据样例 `searchWords` |
| `flowSource` | 入店来源 | `List[Dict]` | 是 | 见下方「入店来源」 | 见数据样例 `flowSource` |
| `bizAdvantage` | 经营优势 | `List[Dict]` | 是 | 见下方「经营优势」 | 见数据样例 `bizAdvantage` |
| `flowStatTime` | 来源渠道实际统计时间 | `Dict` | 是 | 见下方「统计时间对象」 | 见数据样例 `flowStatTime` |
| `customerProfile` | 客群画像 | `List[Dict]` | 是 | 见下方「客群画像」 | 见数据样例 `customerProfile` |
| `customerStatTime` | 客群分析实际统计时间 | `Dict` | 是 | 见下方「统计时间对象」 | 见数据样例 `customerStatTime` |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |

#### 统计时间对象（saleStatTime / flowStatTime / customerStatTime）

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `*.dateType` | 实际统计周期类型 | `string` | 否 | 对应模块接口请求 URL 中的 `dateType` | `week` |
| `*.dateRangeStart` | 实际统计区间起始日 | `string` | 否 | 对应模块接口请求 URL 中的 `dateRange` 起始 | `2026-04-13` |
| `*.dateRangeEnd` | 实际统计区间结束日 | `string` | 否 | 对应模块接口请求 URL 中的 `dateRange` 结束 | `2026-04-19` |

#### 关键指标对比（keyMetrics[]）

每个参与对比的商品（本店 / 竞品 1 / 竞品 2）各输出一行。

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `keyMetrics[].itemId` | 商品 ID | `number` | 否 | `itemId` | `975048717355` |
| `keyMetrics[].itemTitle` | 商品标题 | `string` | 是 | `itemTitle` | `null` |
| `keyMetrics[].itemRole` | 商品角色 | `string` | 否 | 由接口 role 映射 | `selfItem` |
| `keyMetrics[].uv` | 访客数 | `number` / `string` | 是 | `uv` | `286971` |
| `keyMetrics[].payBuyerCnt` | 支付买家数 | `number` / `string` | 是 | `payByrCnt` | `12764` |
| `keyMetrics[].payRate` | 支付转化率 | `number` / `string` | 是 | `payRate` | `0.04447836192507257` |
| `keyMetrics[].cartBuyerCnt` | 加购人数 | `number` / `string` | 是 | `cartByrCnt` | `11284` |
| `keyMetrics[].collectBuyerCnt` | 收藏人数 | `number` / `string` | 是 | `cltByrCnt` | `891` |
| `keyMetrics[].payAmt` | 支付金额 | `number` / `string` | 是 | `payAmt` | `null` |
| `keyMetrics[].payItemQty` | 支付件数 | `number` / `string` | 是 | `payItemQty` | `null` |

> 竞品侧部分指标为区间脱敏值（如 `1万 ~ 2.5万`），本店侧为精确数值。

#### SKU 分析（skuAnalysis[]）

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `skuAnalysis[].itemId` | 商品 ID | `string` | 否 | 来自入参 | `975048717355` |
| `skuAnalysis[].itemRole` | 商品角色 | `string` | 否 | 由表格列映射 | `selfItem` |
| `skuAnalysis[].skuId` | SKU ID | `string` | 否 | `skuId` | `6093008626514` |
| `skuAnalysis[].skuName` | SKU 名称 | `string` | 否 | `skuName` | `颜色分类:【朱迪款】儿童防蛀抗糖牙膏-葡萄味 40g` |
| `skuAnalysis[].payBuyerCntRatioMkt` | 支付买家数占比 | `number` | 是 | `payByrCntRatioMkt` | `0.5346` |
| `skuAnalysis[].page` | 分页页码 | `number` | 否 | 分页序号 | `1` |

#### 属性分析（attributeAnalysis[]）

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `attributeAnalysis[].itemId` | 商品 ID | `string` | 否 | 来自入参 | `975048717355` |
| `attributeAnalysis[].itemRole` | 商品角色 | `string` | 否 | 由表格列映射 | `selfItem` |
| `attributeAnalysis[].attrName` | 属性维度名称 | `string` | 否 | 接口请求 `attrName` 参数 | `颜色分类` |
| `attributeAnalysis[].attrValue` | 属性值 | `string` | 否 | `attrValue` | `【朱迪款】儿童防蛀抗糖牙膏-葡萄味 40g` |
| `attributeAnalysis[].payBuyerCntRatioMkt` | 支付买家数占比 | `number` | 是 | `payByrCntRatioMkt` | `0.5374` |
| `attributeAnalysis[].page` | 分页页码 | `number` | 否 | 分页序号 | `1` |

#### 入店搜索词（searchWords[]）

按指标 Tab（访客数 / 支付买家数 / 支付转化率）分别采集；`date_type=today` 时仅采集访客数 Tab。

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `searchWords[].itemId` | 商品 ID | `string` | 否 | 来自入参 | `975048717355` |
| `searchWords[].itemRole` | 商品角色 | `string` | 否 | 由接口 role 映射 | `selfItem` |
| `searchWords[].metricTab` | 指标 Tab | `string` | 否 | 由页面 Tab 映射 | `uv` |
| `searchWords[].keyword` | 搜索关键词 | `string` | 否 | `keyword` | `儿童牙膏` |
| `searchWords[].uv` | 访客数 | `number` / `string` | 是 | `uv` | `1369` |
| `searchWords[].payBuyerCnt` | 支付买家数 | `number` / `string` | 是 | `payByrCnt` | `341` |
| `searchWords[].payRate` | 支付转化率 | `number` / `string` | 是 | `payRate` | `0.2491` |

#### 入店来源（flowSource[]）

树形结构按节点展开，子节点带 `parentSourceName`；按指标 Tab 分别采集。

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `flowSource[].itemId` | 商品 ID | `string` | 否 | 来自入参 | `975048717355` |
| `flowSource[].itemRole` | 商品角色 | `string` | 否 | 由接口 role 映射 | `selfItem` |
| `flowSource[].metricTab` | 指标 Tab | `string` | 否 | 由页面 Tab 映射 | `uv` |
| `flowSource[].sourceName` | 来源名称 | `string` | 否 | `pageName` / `sourceName` | `主动回访` |
| `flowSource[].parentSourceName` | 上级来源名称 | `string` | 是 | 树形父节点名称 | `主动回访` |
| `flowSource[].uv` | 访客数 | `number` / `string` | 是 | `{role}Uv` | `11176` |
| `flowSource[].payBuyerCnt` | 支付买家数 | `number` / `string` | 是 | `{role}PayByrCnt` | `1704` |
| `flowSource[].payRate` | 支付转化率 | `number` / `string` | 是 | `{role}PayRate` | `0.15246957766642805` |

#### 经营优势（bizAdvantage[]）

横向对比本店与竞品，非按 `itemRole` 展开；`tabType` 区分来源渠道与专项优势。

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `bizAdvantage[].tabType` | 模块类型 | `string` | 否 | 固定枚举 | `sourceChannel` |
| `bizAdvantage[].sourceName` | 来源名称 | `string` | 否 | `pageName` / `sourceName` | `搜索` |
| `bizAdvantage[].parentSourceName` | 上级来源名称 | `string` | 是 | 树形父节点名称 | `付费推广` |
| `bizAdvantage[].selfUv` | 本店访客数 | `number` / `string` | 是 | `selfItemUv` | `4876` |
| `bizAdvantage[].selfPayBuyerCnt` | 本店支付买家数 | `number` / `string` | 是 | `selfItemPayByrCnt` | `967` |
| `bizAdvantage[].selfPayRate` | 本店支付转化率 | `number` / `string` | 是 | `selfItemPayRate` | `0.198318293683347` |
| `bizAdvantage[].rival1Uv` | 竞品 1 访客数 | `number` / `string` | 是 | `rivalItem1Uv` | `1万 ~ 2.5万` |
| `bizAdvantage[].rival1PayBuyerCnt` | 竞品 1 支付买家数 | `number` / `string` | 是 | `rivalItem1PayByrCnt` | `1000 ~ 2500` |
| `bizAdvantage[].rival1PayRate` | 竞品 1 支付转化率 | `number` / `string` | 是 | `rivalItem1PayRate` | `15% ~ 20%` |
| `bizAdvantage[].rival2Uv` | 竞品 2 访客数 | `number` / `string` | 是 | `rivalItem2Uv` | — |
| `bizAdvantage[].rival2PayBuyerCnt` | 竞品 2 支付买家数 | `number` / `string` | 是 | `rivalItem2PayByrCnt` | — |
| `bizAdvantage[].rival2PayRate` | 竞品 2 支付转化率 | `number` / `string` | 是 | `rivalItem2PayRate` | — |

> `tabType` 允许值：`sourceChannel`（来源渠道）、`specialAdvantage`（专项优势）。`rival2*` 字段仅在入参传入 `rival_item_id_2` 时输出。

#### 客群画像（customerProfile[]）

覆盖搜索人群 / 访问人群 / 支付人群三个 Tab，每个 Tab 下含性别、年龄等 7 种画像维度。

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `customerProfile[].itemId` | 商品 ID | `string` | 否 | 来自入参 | `975048717355` |
| `customerProfile[].itemRole` | 商品角色 | `string` | 否 | 由接口 role 映射 | `selfItem` |
| `customerProfile[].crowdsType` | 人群类型代码 | `string` | 否 | 接口 `crowdsType` | `appSearchUv` |
| `customerProfile[].crowdsLabel` | 人群类型名称 | `string` | 否 | 页面 Tab 文案 | `搜索人群` |
| `customerProfile[].profileType` | 画像维度 | `string` | 否 | 接口 `profileType` | `gender` |
| `customerProfile[].attrValue` | 画像属性值 | `string` | 否 | `attrValue` | `女` |
| `customerProfile[].ratio` | 占比 | `number` | 是 | `{crowdsType}.ratio` | `0.8717` |

> `profileType` 允许值：`gender`（性别）、`age`（年龄）、`crowd`（人群标签）、`brand_prefer`（品牌偏好）、`cate_prefer`（类目偏好）、`city`（城市）、`province`（省份）。

### 数据样例

```json
{
    "accountId": "108",
    "bizDate": "20260615",
    "selfItemId": "975048717355",
    "rivalItemId1": "638281143270",
    "rivalItemId2": null,
    "dateType": "week",
    "dateRangeStart": "2026-04-13",
    "dateRangeEnd": "2026-04-19",
    "keyMetrics": [
        {
            "itemId": 975048717355,
            "itemRole": "selfItem",
            "uv": 286971,
            "payBuyerCnt": 12764,
            "payRate": 0.04447836192507257,
            "cartBuyerCnt": 11284,
            "collectBuyerCnt": 891
        },
        {
            "itemId": 638281143270,
            "itemRole": "rivalItem1",
            "uv": "75万 ~ 100万",
            "payBuyerCnt": "1万 ~ 2.5万",
            "payRate": "1% ~ 2.5%"
        }
    ],
    "skuAnalysis": [
        {
            "itemId": "975048717355",
            "itemRole": "selfItem",
            "skuId": "6093008626514",
            "skuName": "颜色分类:【朱迪款】儿童防蛀抗糖牙膏-葡萄味 40g",
            "payBuyerCntRatioMkt": 0.5346,
            "page": 1
        }
    ],
    "attributeAnalysis": [
        {
            "attrName": "颜色分类",
            "attrValue": "【朱迪款】儿童防蛀抗糖牙膏-葡萄味 40g",
            "itemId": "975048717355",
            "itemRole": "selfItem",
            "payBuyerCntRatioMkt": 0.5374,
            "page": 1
        }
    ],
    "saleStatTime": {
        "dateType": "week",
        "dateRangeStart": "2026-04-13",
        "dateRangeEnd": "2026-04-19"
    },
    "searchWords": [
        {
            "itemId": "975048717355",
            "itemRole": "selfItem",
            "keyword": "儿童牙膏",
            "metricTab": "uv",
            "payBuyerCnt": 341,
            "payRate": 0.2491,
            "uv": 1369
        }
    ],
    "flowSource": [
        {
            "itemId": "975048717355",
            "itemRole": "selfItem",
            "metricTab": "uv",
            "sourceName": "主动回访",
            "payBuyerCnt": 1704,
            "payRate": 0.15246957766642805,
            "uv": 11176
        },
        {
            "itemId": "975048717355",
            "itemRole": "selfItem",
            "metricTab": "uv",
            "parentSourceName": "主动回访",
            "sourceName": "站内沟通",
            "payBuyerCnt": 1679,
            "payRate": 0.23306496390893947,
            "uv": 7204
        }
    ],
    "bizAdvantage": [
        {
            "rival1PayBuyerCnt": "1000 ~ 2500",
            "rival1PayRate": "15% ~ 20%",
            "rival1Uv": "1万 ~ 2.5万",
            "selfPayBuyerCnt": 967,
            "selfPayRate": 0.198318293683347,
            "selfUv": 4876,
            "sourceName": "搜索",
            "tabType": "sourceChannel"
        },
        {
            "parentSourceName": "付费推广",
            "rival1PayBuyerCnt": "750 ~ 1000",
            "rival1PayRate": "20% ~ 25%",
            "rival1Uv": "2500 ~ 5000",
            "selfPayBuyerCnt": 269,
            "selfPayRate": 0.3237063778580024,
            "selfUv": 831,
            "sourceName": "淘宝客",
            "tabType": "specialAdvantage"
        }
    ],
    "flowStatTime": {
        "dateType": "week",
        "dateRangeStart": "2026-04-13",
        "dateRangeEnd": "2026-04-19"
    },
    "customerProfile": [
        {
            "attrValue": "女",
            "crowdsLabel": "搜索人群",
            "crowdsType": "appSearchUv",
            "itemId": "975048717355",
            "itemRole": "selfItem",
            "profileType": "gender",
            "ratio": 0.8717
        }
    ],
    "customerStatTime": {
        "dateType": "month",
        "dateRangeStart": "2026-05-01",
        "dateRangeEnd": "2026-05-31"
    }
}
```

### 运行时配置

```json
{
    "name": "rpa.conn.sycm.item.ci",
    "package": "rpa-conn-sycm-all",
    "version": null,
    "mode": "Eager"
}
```

---

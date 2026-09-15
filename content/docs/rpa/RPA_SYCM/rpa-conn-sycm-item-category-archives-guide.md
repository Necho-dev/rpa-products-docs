---
title: 商品-品类360-导购类目
description: 采集生意参谋品类360页「品类排行」下导购类目 Tab 的访客、加购、下单、支付及转化等指标
entry: rpa.conn.sycm.item.category.archives.guide
badge:
  label: 已上线
  color: "#16A34A"
dataReady:
  time: 09:00:00
  cycle: daily
  description: 生意参谋大部分核心数据模块（流量、商品、市场等）昨日数据在上午 9 点前完成更新
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响。
category: item
---

| 属性             | 值                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                             |
| **连接器名称**   | `ODS_商品品类360导购类目明细表(生意参谋RPA)`                                             |
| **连接器代码**   | `rpa.conn.sycm.item.category.archives.guide`                                             |
| **操作类型**     | `文件导出`                                                                               |
| **目标网页**     | `https://sycm.taobao.com/cc/new_cate_archives`                                           |
| **适用场景**     | 采集生意参谋品类360页「品类排行」模块下 **导购类目** Tab 的访客、加购、下单、支付及转化等指标 |
| **数据表名**     | `ods_rpa_sycm_item_category_archives_guide_du`                                           |
| **业务表名**     | `ODS_商品品类360导购类目明细表(生意参谋RPA)`                                             |

### 目标页面

> **取数路径**：生意参谋—商品—品类360—品类排行—导购类目
>
> **取数链接**：[https://sycm.taobao.com/cc/new_cate_archives](https://sycm.taobao.com/cc/new_cate_archives)

**采集范围**：仅 **导购类目** Tab，浏览器下载 xls 全量导出。

不纳入采集范围：**标准类目**、**自定义类目**、**我关注的类目**、**品类诊断** 及页面其他模块。

![生意参谋—商品—品类360—导购类目](../_public/images/sycm/item_category_archives_guide_20260810.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_type` | 统计时间类型 | `String` | 是 | `-` | 允许值：`LAST_7_DAYS`（近 7 天）/ `LAST_30_DAYS`（近 30 天）/ `DAY`（按日）/ `WEEK`（自然周）/ `MONTH`（自然月） |
| `biz_date` | 业务日期 | `String` | 条件必填 | `-` | `date_type` 为 `DAY`/`WEEK`/`MONTH` 时必填；始终填一天，格式 `YYYYMMDD` 或 `YYYY-MM-DD`；`LAST_7_DAYS`/`LAST_30_DAYS` 时忽略。`DAY` 不可选今日及以后；`WEEK`/`MONTH` 用这一天定位所在周/月，不可选本周/本月的日期；最早约 2024-07-01 |

### 入参样例

近 7 天：

```json
{
  "date_type": "LAST_7_DAYS"
}
```

近 30 天：

```json
{
  "date_type": "LAST_30_DAYS"
}
```

指定自然日（`YYYYMMDD`）：

```json
{
  "date_type": "DAY",
  "biz_date": "20260905"
}
```

指定自然日（`YYYY-MM-DD`）：

```json
{
  "date_type": "DAY",
  "biz_date": "2026-08-05"
}
```

按周：

```json
{
  "date_type": "WEEK",
  "biz_date": "2026-08-31"
}
```

按月：

```json
{
  "date_type": "MONTH",
  "biz_date": "2026-08-01"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "生意参谋-商品-品类360-导购类目 - 查询入参",
  "description": "采集生意参谋品类360页「品类排行」下导购类目 Tab 的访客、加购、下单、支付及转化等指标",
  "type": "object",
  "properties": {
    "date_type": {
      "type": "string",
      "description": "统计时间类型。允许值：LAST_7_DAYS（近 7 天）/ LAST_30_DAYS（近 30 天）/ DAY（按日）/ WEEK（自然周）/ MONTH（自然月）",
      "enum": ["LAST_7_DAYS", "LAST_30_DAYS", "DAY", "WEEK", "MONTH"]
    },
    "biz_date": {
      "type": "string",
      "description": "业务日期；date_type 为 DAY/WEEK/MONTH 时必填；始终填一天；LAST_7_DAYS/LAST_30_DAYS 时忽略。格式 YYYYMMDD 或 YYYY-MM-DD；DAY 不可选今日及以后；WEEK/MONTH 用这一天定位所在周/月，不可选本周/本月的日期；最早约 2024-07-01",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": ["date_type"],
  "additionalProperties": false,
  "allOf": [
    {
      "if": {
        "properties": {
          "date_type": {
            "enum": ["DAY", "WEEK", "MONTH"]
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

每条任务按类目行输出多条记录，数据来自导购类目导出表格。导购导出列可能少于标准类目，未出现的指标字段不会输出。

:::field-tree
| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `statDate` | 统计日期 | `String` | 是 | `XLS.0.统计日期` | `2026-06-30` |
| `level1CategoryName` | 一级类目名称 | `String` | 是 | `XLS.0.一级类目名称` | `2026夏新品（大类）` |
| `level2CategoryName` | 二级类目名称 | `String` | 是 | `XLS.0.二级类目名称` | `2026夏新品（大类）` |
| `categoryName` | 类目名称 | `String` | 是 | `XLS.0.类目名称` | `2026夏新品（大类）` |
| `itemUv` | 商品访客数 | `String` | 是 | `XLS.0.商品访客数` | `937,312` |
| `itemPv` | 商品浏览量 | `String` | 是 | `XLS.0.商品浏览量` | `12,118,028` |
| `visitItemCnt` | 有访客商品数 | `String` / `Number` | 是 | `XLS.0.有访客商品数` | `267` |
| `payItemCnt` | 有支付商品数 | `String` / `Number` | 是 | `XLS.0.有支付商品数` | `260` |
| `itemCartBuyerCnt` | 商品加购人数 | `String` | 是 | `XLS.0.商品加购人数` | `68,269` |
| `itemCartCnt` | 商品加购件数 | `String` | 是 | `XLS.0.商品加购件数` | `282,372` |
| `itemCollectBuyerCnt` | 商品收藏人数 | `String` | 是 | `XLS.0.商品收藏人数` | `11,680` |
| `visitCollectRate` | 访问收藏转化率 | `String` | 是 | `XLS.0.访问收藏转化率` | `1.25%` |
| `visitCartRate` | 访问加购转化率 | `String` | 是 | `XLS.0.访问加购转化率` | `7.28%` |
| `orderBuyerCnt` | 下单买家数 | `String` | 是 | `XLS.0.下单买家数` | `16,974` |
| `orderItemCnt` | 下单件数 | `String` | 是 | `XLS.0.下单件数` | `57,354` |
| `orderAmt` | 下单金额 | `String` | 是 | `XLS.0.下单金额` | `16,845,181.26` |
| `orderConvertRate` | 下单转化率 | `String` | 是 | `XLS.0.下单转化率` | `1.81%` |
| `payBuyerCnt` | 支付买家数 | `String` | 是 | `XLS.0.支付买家数` | `16,041` |
| `payQty` | 支付件数 | `String` | 是 | `XLS.0.支付件数` | `53,225` |
| `payAmt` | 支付金额 | `String` | 是 | `XLS.0.支付金额` | `15,525,067.70` |
| `payRate` | 支付转化率 | `String` | 是 | `XLS.0.支付转化率` | `1.71%` |
| `monthPayAmt` | 月累计支付金额 | `String` | 是 | `XLS.0.月累计支付金额` | `-` |
| `categoryType` | 类目类型代码 | `String` | 否 | 固定值 | `guide` |
| `categoryTypeName` | 类目类型名称 | `String` | 否 | 固定值 | `导购类目` |
| `statTime` | 统计时间区间文案 | `String` | 否 | 根据入参统计周期派生 | `2026-06-01 ~ 2026-06-30` |
| `statDateStart` | 统计起始日 | `String` | 否 | 根据入参统计周期派生 | `2026-06-01` |
| `statDateEnd` | 统计结束日 | `String` | 否 | 根据入参统计周期派生 | `2026-06-30` |
| `dateType` | 统计时间类型 | `String` | 否 | 根据入参 `date_type` 派生 | `MONTH` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260810` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****6` (已脱敏) |
:::

### 数据样例

```json
[
  {
    "statDate": "2026-06-30",
    "level1CategoryName": "2026夏新品（大类）",
    "level2CategoryName": "2026夏新品（大类）",
    "categoryName": "2026夏新品（大类）",
    "itemUv": "937,312",
    "itemPv": "12,118,028",
    "visitItemCnt": 267,
    "payItemCnt": 260,
    "itemCartBuyerCnt": "68,269",
    "itemCartCnt": "282,372",
    "itemCollectBuyerCnt": "11,680",
    "visitCollectRate": "1.25%",
    "visitCartRate": "7.28%",
    "orderBuyerCnt": "16,974",
    "orderItemCnt": "57,354",
    "orderAmt": "16,845,181.26",
    "orderConvertRate": "1.81%",
    "payBuyerCnt": "16,041",
    "payQty": "53,225",
    "payAmt": "15,525,067.70",
    "payRate": "1.71%",
    "monthPayAmt": "-",
    "categoryType": "guide",
    "categoryTypeName": "导购类目",
    "statTime": "2026-06-01 ~ 2026-06-30",
    "statDateStart": "2026-06-01",
    "statDateEnd": "2026-06-30",
    "dateType": "MONTH",
    "bizDate": "20260810",
    "accountId": "1****6",
    "taskId": "dev****01"
  }
]
```

---

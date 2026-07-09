---
title: 店铺-推广平台-财务流水日账单
description: 按日期范围、资金类型、流水类型、交易金额范围导出推广平台财务流水日账单明细数据
entry: rpa.conn.pinduoduo.shop.daily.invoice
badge:
  label: 已上线
  color: "#16A34A"
---

| 属性             | 值                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                                               |
| **连接器代码**   | `rpa.conn.pinduoduo.shop.daily.invoice`                                                    |
| **操作类型**     | `文件导出`                                                            |
| **目标网页**     | `https://yingxiao.pinduoduo.com/mains/account/report`                                      |
| **适用场景**     | 按日期范围、资金类型、流水类型、交易金额范围导出推广平台财务流水日账单明细数据              |

### 目标页面

> **路径**：拼多多推广平台—账户—财务流水
>
> **网址**：[https://yingxiao.pinduoduo.com/mains/account/report](https://yingxiao.pinduoduo.com/mains/account/report)

![拼多多推广平台—财务流水日账单](../../public/images/pinduoduo/shop_daily_invoice_20260601.png)

### 业务入参

| 字段                | 中文释义     | 数据类型 | 必填 | 默认值 | 说明                                                                 |
| ------------------- | ------------ | -------- | ---- | ------ | -------------------------------------------------------------------- |
| `custom_start_date` | 开始日期     | `string` | 否   | 页面默认（T-29） | 格式：`YYYYMMDD`；需与 `custom_end_date` 同时传入，不能早于前推 6 个月；不传则使用页面默认日期（T-29，起止同一天） |
| `custom_end_date`   | 结束日期     | `string` | 否   | 页面默认（T-29） | 格式：`YYYYMMDD`；需与 `custom_start_date` 同时传入，不能晚于当天     |
| `fund_type`         | 资金类型     | `string` | 否   | —      | 可选值：`CASH`（现金）/ `RED_PACKET`（红包）/ `VIRTUAL_GOLD`（虚拟金）/ `SUBSIDY`（津贴） |
| `flow_type`         | 流水类型     | `string` | 否   | —      | 可选值：`INCOME`（收入）/ `EXPENSE`（支出）                          |
| `min_amount`        | 最小交易金额 | `string` | 否   | —      | 有效数字，不能大于 `max_amount`                                      |
| `max_amount`        | 最大交易金额 | `string` | 否   | —      | 有效数字                                                             |

### 入参样例

```json
{
    "custom_start_date": "20260501",
    "custom_end_date": "20260531",
    "fund_type": "CASH",
    "flow_type": "EXPENSE"
}
```

### 数据字段

| 字段           | 中文释义 | 数据类型 | 可为空 | 取数路径       | 示例                                                                         |
| -------------- | -------- | -------- | ------ | -------------- | ---------------------------------------------------------------------------- |
| `tradeTime`    | 交易时间 | `string` | 否     | `XLS.0.时间`       | 2026-05-31 23:59:59                                                          |
| `fundType`     | 资金类型 | `string` | 否     | `XLS.0.资金类型`   | 现金                                                                         |
| `flowType`     | 流水类型 | `string` | 否     | `XLS.0.流水类型`   | 支出                                                                         |
| `shopName`     | 店铺名称 | `string` | 否     | `XLS.0.店铺名称`   | 王小卤旗舰店                                                                 |
| `tradeAmount`  | 交易金额 | `number` | 否     | `XLS.0.交易金额`   | 5789.02                                                                      |
| `balance`      | 余额     | `number` | 否     | `XLS.0.余额`       | 22232.02                                                                     |
| `tradeSummary` | 交易摘要 | `string` | 是     | `XLS.0.交易摘要`   | 推广支出： 明星店铺1100.13元； 商品推广4688.89元；                           |
| `bizDate`      | 业务日期 | `string` | 否     | 附加           |                                                                              |
| `accountId`    | 授权 ID  | `string` | 否     | 附加           |                                                                              |
| `taskId`       | 任务 ID  | `string` | 否     | 附加           |                                                                              |

### 数据样例

```json
[
  {
    "tradeTime": "2026-05-31 23:59:59",
    "fundType": "现金",
    "flowType": "支出",
    "shopName": "王小卤旗舰店",
    "tradeAmount": 5789.02,
    "balance": 22232.02,
    "tradeSummary": "推广支出： 明星店铺1100.13元； 商品推广4688.89元；",
    "bizDate": "20260601",
    "accountId": "102",
    "taskId": "dev-0-efe4cdcb"
  }
]
```

---

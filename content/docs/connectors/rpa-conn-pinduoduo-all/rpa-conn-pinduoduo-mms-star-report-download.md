---
title: 推广平台-明星店铺-数据汇总报表下载
description: 从拼多多推广平台下载「明星店铺-数据汇总」分天数据报表，支持快捷日期与自定义日期范围
entry: rpa.conn.pinduoduo.promotion.star.report.download
---

| 属性             | 值                                                                |
| ---------------- | ----------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                      |
| **连接器代码**   | `rpa.conn.pinduoduo.promotion.star.report.download`                     |
| **归属 PyPI 包** | `rpa-conn-pinduoduo-all`                                          |
| **操作类型**     | 浏览器自动化操作 + XLSX 文件导出                                  |
| **目标网页**     | `https://yingxiao.pinduoduo.com/tools/report/download`            |
| **适用场景**     | 从拼多多推广平台下载「明星店铺-数据汇总」分天数据报表，支持快捷日期与自定义日期范围 |

### 目标页面

> **路径**：拼多多推广平台—工具—报表下载
>
> **网址**：[https://yingxiao.pinduoduo.com/tools/report/download](https://yingxiao.pinduoduo.com/tools/report/download)

![拼多多推广平台—明星店铺-数据汇总报表下载](../../public/images/pinduoduo/star_report_download_20260429.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_range` | 日期范围 | `string` | 否 | `"7d"` | 可选值：`today`(今日) / `yesterday`(昨日) / `7d`(近7日) / `30d`(近30日) / `90d`(近90日) / `custom`(自定义) |
| `custom_start_date` | 自定义开始日期 | `string` | 否 | — | 格式 YYYYMMDD，`date_range="custom"` 时必填 |
| `custom_end_date` | 自定义结束日期 | `string` | 否 | — | 格式 YYYYMMDD，`date_range="custom"` 时必填 |

### 入参样例

```json
{
    "date_range": "7d"
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `date` | 日期 | `string` | 否 | `XLSX.0.日期` | 2026-04-25 |
| `cost` | 花费(元) | `number` | 是 | `XLSX.0.花费(元)` | 145.46 |
| `trade_amount` | 交易额(元) | `number` | 是 | `XLSX.0.交易额(元)` | 1549.4 |
| `roi` | 投入产出比 | `number` | 是 | `XLSX.0.投入产出比` | 10.65 |
| `deal_count` | 成交笔数 | `number` | 是 | `XLSX.0.成交笔数` | 29 |
| `store_follow_count` | 店铺关注量 | `number` | 是 | `XLSX.0.店铺关注量` | 8 |
| `cpm` | 千次曝光花费(元) | `number` | 是 | `XLSX.0.千次曝光花费(元)` | 93.72 |
| `impressions` | 曝光量 | `number` | 是 | `XLSX.0.曝光量` | 1552 |
| `clicks` | 点击量 | `number` | 是 | `XLSX.0.点击量` | 313 |
| `cost_per_deal` | 每笔成交花费(元) | `number` | 是 | `XLSX.0.每笔成交花费(元)` | 5.02 |
| `amount_per_deal` | 每笔成交金额(元) | `number` | 是 | `XLSX.0.每笔成交金额(元)` | 53.43 |
| `goods_favorite_count` | 商品收藏量 | `number` | 是 | `XLSX.0.商品收藏量` | 48 |
| `taskId` | 任务 ID | `string` | 否 | 附加 | dev-0-b917e3b4 |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |

### 数据样例

```json
[
  {
    "date": "2026-04-25",
    "cost": 145.46,
    "trade_amount": 1549.4,
    "roi": 10.65,
    "deal_count": 29,
    "store_follow_count": 8,
    "cpm": 93.72,
    "impressions": 1552,
    "clicks": 313,
    "cost_per_deal": 5.02,
    "amount_per_deal": 53.43,
    "goods_favorite_count": 48,
    "taskId": "dev-0-b917e3b4",
    "bizDate": "20260429",
    "accountId": "104"
  }
]
```

### 运行时配置

```json
{
    "name": "rpa.conn.pinduoduo.promotion.star.report.download",
    "package": "rpa-conn-pinduoduo-all",
    "version": null,
    "mode": "Eager"
}
```

---

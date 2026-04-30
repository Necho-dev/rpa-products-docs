---
title: 物流-包裹中心-异常包裹监控
description: 导出包裹中心异常包裹（支付超时未发货等）监控数据，支持按时间范围、交易单号、商品 ID 筛选
entry: rpa.conn.qianniu.logistics.delivery.warning
---

| 属性             | 值                                                                              |
| ---------------- | ------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                    |
| **连接器代码**   | `rpa.conn.qianniu.logistics.delivery.warning`                                   |
| **归属 PyPI 包** | `rpa-conn-qianniu-all`                                                          |
| **操作类型**     | 浏览器自动化操作 + XLSX 文件导出                                                |
| **目标网页**     | `https://myseller.taobao.com/home.htm/package-center/packageMonitor`            |
| **适用场景**     | 导出包裹中心异常包裹（支付超时未发货等）监控数据，支持按时间范围、交易单号、商品 ID 筛选 |

### 目标页面

> **路径**：千牛后台—物流—包裹中心—异常包裹
>
> **网址**：[https://myseller.taobao.com/home.htm/package-center/packageMonitor](https://myseller.taobao.com/home.htm/package-center/packageMonitor)

![千牛后台—物流—包裹中心—异常包裹监控](../../public/images/qianniu/delivery_warning_20260430.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_start` | 起始日期 | `string` | 否 | `""` | 格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm:ss`；与 `date_end` 必须同时传入；不得早于 30 天前 |
| `date_end` | 结束日期 | `string` | 否 | `""` | 格式 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm:ss`；与 `date_start` 必须同时传入；不得晚于今天 |
| `trade_no` | 交易单号 | `string` | 否 | `""` | — |
| `item_id` | 商品 ID | `string` | 否 | `""` | — |

### 入参样例

```json
{
    "date_start": "2026-04-01",
    "date_end": "2026-04-30",
    "trade_no": "",
    "item_id": ""
}
```

### 数据字段

`bizDate` 格式为 `YYYYMMDD`。

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `交易单号` | 交易单号 | `number` | 否 | 文件导出 | 3298228971421000296 |
| `子交易单号` | 子交易单号 | `number` | 否 | 文件导出 | 3298228971421000296 |
| `超时类型` | 超时类型 | `string` | 否 | 文件导出 | 支付超24h |
| `支付时间` | 支付时间 | `string` | 否 | 文件导出 | 2026-04-27 15:29:01 |
| `应揽收时间` | 应揽收时间 | `string` | 否 | 文件导出 | 2026-05-05 23:59:59 |
| `异常类型` | 异常类型 | `string` | 否 | 文件导出 | 支付-发货 |
| `买家姓名` | 买家姓名 | `string` | 否 | 文件导出 | 柚* |
| `买家电话` | 买家电话 | `string` | 否 | 文件导出 | 1*********5 |
| `买家地址` | 买家地址 | `string` | 否 | 文件导出 | 河南省新乡市长垣市蒲西街道 *********************** |
| `订单服务` | 订单服务 | `string` | 否 | 文件导出 | 优+订单 |
| `商品名称` | 商品名称 | `string` | 否 | 文件导出 | 【优惠价】松下小型洗衣机婴儿迷你家用宝宝儿童专用全自动高温除螨抗菌波轮 |
| `备注信息` | 备注信息 | `string` | 是 | 文件导出 | — |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |
| `taskId` | 任务 ID | `string` | 否 | 附加 |  |

### 数据样例

```json
[
    {
        "交易单号": 3298228971421000296,
        "子交易单号": 3298228971421000296,
        "超时类型": "支付超24h",
        "支付时间": "2026-04-27 15:29:01",
        "应揽收时间": "2026-05-05 23:59:59",
        "异常类型": "支付-发货",
        "买家姓名": "柚*",
        "买家电话": "1*********5",
        "买家地址": "河南省新乡市长垣市蒲西街道 ***********************",
        "订单服务": "优+订单",
        "商品名称": "【优惠价】松下小型洗衣机婴儿迷你家用宝宝儿童专用全自动高温除螨抗菌波轮",
        "备注信息": null,
        "bizDate": "20260430",
        "accountId": "101",
        "taskId": "dev-0-6a703e4f"
    }
]
```

### 运行时配置

```json
{
    "name": "rpa.conn.qianniu.logistics.delivery.warning",
    "package": "rpa-conn-qianniu-all",
    "version": null,
    "mode": "Eager"
}
```

---

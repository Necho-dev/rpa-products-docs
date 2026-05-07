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
| `trade_no` | 交易单号 | `number` | 否 | `XLSX.0.交易单号` | 3299290141862016288 |
| `sub_trade_no` | 子交易单号 | `number` | 否 | `XLSX.0.子交易单号` | 3299290141862016288 |
| `timeout_type` | 超时类型 | `string` | 否 | `XLSX.0.超时类型` | 支付超24h |
| `pay_time` | 支付时间 | `string` | 否 | `XLSX.0.支付时间` | 2026-04-30 20:28:04 |
| `expected_pickup_time` | 应揽收时间 | `string` | 否 | `XLSX.0.应揽收时间` | 2026-06-01 23:59:59 |
| `exception_type` | 异常类型 | `string` | 否 | `XLSX.0.异常类型` | 支付-发货 |
| `buyer_name` | 买家姓名 | `string` | 否 | `XLSX.0.买家姓名` | 豆* |
| `buyer_phone` | 买家电话 | `string` | 否 | `XLSX.0.买家电话` | 1\*\*\*\*\*\*\*\*\*8 |
| `buyer_address` | 买家地址 | `string` | 否 | `XLSX.0.买家地址` | 浙江省杭州市余杭区良渚街道 \*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\* |
| `order_service` | 订单服务 | `string` | 否 | `XLSX.0.订单服务` | 无 |
| `goods_name` | 商品名称 | `string` | 否 | `XLSX.0.商品名称` | 【优惠价】松下滚筒壁挂全自动洗衣机小型迷你内衣婴儿懒人洗衣机家用洗衣机 |
| `remark` | 备注信息 | `string` | 是 | `XLSX.0.备注信息` | — |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |
| `taskId` | 任务 ID | `string` | 否 | 附加 |  |

### 数据样例

```json
[
    {
        "trade_no": 3299290141862016288,
        "sub_trade_no": 3299290141862016288,
        "timeout_type": "支付超24h",
        "pay_time": "2026-04-30 20:28:04",
        "expected_pickup_time": "2026-06-01 23:59:59",
        "exception_type": "支付-发货",
        "buyer_name": "豆*",
        "buyer_phone": "1*********8",
        "buyer_address": "浙江省杭州市余杭区良渚街道 ******************",
        "order_service": "无",
        "goods_name": "【优惠价】松下滚筒壁挂全自动洗衣机小型迷你内衣婴儿懒人洗衣机家用洗衣机",
        "remark": null,
        "bizDate": "20260507",
        "accountId": "101",
        "taskId": "dev-0-fbbba48f"
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

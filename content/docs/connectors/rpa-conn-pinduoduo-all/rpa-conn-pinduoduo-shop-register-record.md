---
title: 店铺-营销活动-报名记录
description: 采集拼多多商家后台营销活动报名记录数据，支持按状态、商品ID、提交时间筛选
entry: rpa.conn.pinduoduo.shop.register.record
---

| 属性             | 值                                                                      |
| ---------------- | ----------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                            |
| **连接器代码**   | `rpa.conn.pinduoduo.shop.register.record`                               |
| **归属 PyPI 包** | `rpa-conn-pinduoduo-all`                                                |
| **操作类型**     | 浏览器自动化操作 + 网络请求监听                                         |
| **目标网页**     | `https://mms.pinduoduo.com/act/register_record`                         |
| **适用场景**     | 采集拼多多商家后台营销活动报名记录数据，支持按状态、商品ID、提交时间筛选 |

### 目标页面

> **路径**：拼多多商家后台—营销活动—报名记录
>
> **网址**：[https://mms.pinduoduo.com/act/register_record](https://mms.pinduoduo.com/act/register_record)

![拼多多—营销活动报名记录](../../public/images/pinduoduo/register_record_20260508.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `status_tab` | 状态标签 | `string` | 否 | `全部` | 可选值：全部/待处理/审核中/活动中/已结束 |
| `goods_id` | 商品ID | `string` | 否 | `""` | 多个之间用空格分隔 |
| `submit_time_start` | 提交开始时间 | `string` | 否 | `""` | 格式：yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss（不传时分秒时自动补 00:00:00）；与 submit_time_end 成对使用，范围不超过 30 天 |
| `submit_time_end` | 提交结束时间 | `string` | 否 | `""` | 格式：yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss（不传时分秒时自动补 00:00:00）；与 submit_time_start 成对使用，范围不超过 30 天 |

### 入参样例

```json
{
    "status_tab": "活动中",
    "goods_id": "781634232288",
    "submit_time_start": "2026-04-01 00:00:00",
    "submit_time_end": "2026-04-30 23:59:59"
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `activityGoodsId` | 报名记录ID | `number` | 否 | `result.result.activity_goods_id` | 11278861375712 |
| `activityId` | 活动ID | `number` | 否 | `result.result.activity_id` | 22660 |
| `activityName` | 活动名称 | `string` | 否 | `result.result.activity_name` | 【免审】限时秒杀外场通道 |
| `activityType` | 活动类型 | `number` | 否 | `result.result.activity_type` | 101 |
| `businessTypeStr` | 活动类型描述 | `string` | 否 | `result.result.business_type_str` | 限时秒杀 |
| `goodsId` | 商品ID | `number` | 否 | `result.result.goods_id` | 781634232288 |
| `goodsName` | 商品名称 | `string` | 否 | `result.result.goods_name` | 连咖啡燃燃咖黑咖啡粉2.1g*30袋… |
| `thumbUrl` | 商品缩略图 | `string` | 否 | `result.result.thumb_url` | https://img.pddpic.com/… |
| `status` | 状态码 | `number` | 否 | `result.result.status` | 702 |
| `finalStatusName` | 状态描述 | `string` | 否 | `result.result.final_status_name` | 活动下线 |
| `activityStatus` | 活动状态码 | `number` | 否 | `result.result.activity_status` | 101 |
| `enrollTime` | 报名时间 | `number` | 否 | `result.result.enroll_time` | 1777548063239 |
| `enrollStartTime` | 活动报名开始时间 | `number` | 否 | `result.result.enroll_start_time` | 1681203898000 |
| `enrollEndTime` | 活动报名结束时间 | `number` | 否 | `result.result.enroll_end_time` | 1903795199000 |
| `refuseReason` | 驳回原因 | `string` | 是 | `result.result.refuse_reason` | — |
| `cancelReason` | 取消原因 | `string` | 是 | `result.result.cancel_reason` | — |
| `goodsQuantity` | 商品库存 | `number` | 否 | `result.result.goods_quantity` | 4986 |
| `soldQuantity` | 已售数量 | `number` | 否 | `result.result.sold_quantity` | 1014 |
| `activityGoodsTimeList` | 活动时间段列表 | `List[Dict]` | 是 | `result.result.activity_goods_time_list` | 见数据样例 `activityGoodsTimeList` |
| `activitySkuInfo` | SKU活动信息 | `List[Dict]` | 是 | `result.result.activity_sku_info` | 见数据样例 `activitySkuInfo` |
| `minOnSaleGroupPrice` | 最低拼团价(分) | `number` | 是 | `result.result.min_on_sale_group_price` | 3290 |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |
| `taskId` | 任务 ID | `string` | 否 | 附加 |  |

### 数据样例

```json
{
  "activityGoodsId": 11278861375712,
  "activityId": 22660,
  "activityName": "【免审】限时秒杀外场通道",
  "activityType": 101,
  "businessTypeStr": "限时秒杀",
  "goodsId": 781634232288,
  "goodsName": "连咖啡燃燃咖黑咖啡粉2.1g*30袋椰子油茉莉风味熬夜办公提神美式",
  "thumbUrl": "https://img.pddpic.com/gaudit-image/2025-07-18/5ad40cf05ba8194041dc05bfd228b57d.jpeg",
  "status": 702,
  "finalStatusName": "活动下线",
  "activityStatus": 101,
  "enrollTime": 1777548063239,
  "enrollStartTime": 1681203898000,
  "enrollEndTime": 1903795199000,
  "refuseReason": null,
  "cancelReason": null,
  "goodsQuantity": 4986,
  "soldQuantity": 1014,
  "activityGoodsTimeList": [
    {
      "activity_goods_start_time": 1777548063000,
      "activity_goods_end_time": 1777807263000,
      "activity_goods_event_id": 11278716990688,
      "event_type": 5,
      "max_activity_sku_price": 2980,
      "min_activity_sku_price": 1980,
      "activity_quantity": 3000
    }
  ],
  "activitySkuInfo": [
    {
      "sku_id": 1761318107957,
      "sku_name": "【3盒】椰子油12条+茉莉山茶油6条",
      "goods_id": 781634232288,
      "activity_price": 1980,
      "cost_price": null,
      "is_on_sale": true
    },
    {
      "sku_id": 1761318107958,
      "sku_name": "【3盒】椰子油6条+山茶油6条+牛油果6条",
      "goods_id": 781634232288,
      "activity_price": 1980,
      "cost_price": null,
      "is_on_sale": true
    }
  ],
  "minOnSaleGroupPrice": 3290,
  "bizDate": "20260508",
  "accountId": "102"
}
```

### 运行时配置

```json
{
    "name": "rpa.conn.pinduoduo.shop.register.record",
    "package": "rpa-conn-pinduoduo-all",
    "version": null,
    "mode": "Eager"
}
```

---

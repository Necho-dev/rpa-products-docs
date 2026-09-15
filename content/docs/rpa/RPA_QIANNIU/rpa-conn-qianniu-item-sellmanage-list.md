---
title: 商品-商品管理-我的商品-全部
description: 采集千牛商品管理列表（出售中/仓库中/已售完等状态），支持按标题、商品ID搜索及自定义排序，自动翻页最多100页
entry: rpa.conn.qianniu.item.sellmanage.list
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  sec: 90
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响
category: item
---

| 属性             | 值                                                                          |
| ---------------- | --------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_店铺商品列表(千牛RPA)`|
| **连接器代码**   | `rpa.conn.qianniu.item.sellmanage.list`|
| **操作类型**     | `页面解析`|
| **目标网页**     | `https://myseller.taobao.com/home.htm/SellManage/all`|
| **适用场景**     | 采集千牛商品管理列表（出售中/仓库中/已售完等状态），支持按标题、商品ID搜索及自定义排序，自动翻页最多100页|
| **数据表名**     | `ods_rpa_qianniu_item_sellmanage_list_du`|
| **业务表名**     | `ODS_店铺商品列表(千牛RPA)`|

### 目标页面

> **取数路径**：千牛商家工作台—商品—商品管理
>
> **取数链接**：[https://myseller.taobao.com/home.htm/SellManage/all](https://myseller.taobao.com/home.htm/SellManage/all)

![千牛—商品管理列表](../_public/images/qianniu/sellmanage_list_20260509.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `item_status` | 商品状态 | `String` | 否 | `-` | 允许值：`ALL`（全部）/ `ON_SALE`（出售中）/ `IN_STOCK`（仓库中）/ `SOLD_OUT`（已售空） |
| `query_title` | 商品标题搜索 | `String` | 否 | `-` | 关键词模糊搜索 |
| `query_item_id` | 商品 ID 搜索 | `String` / `List[String]` | 否 | `-` | 英文逗号或字符串数组；中文逗号改英文 |
| `sort_field` | 排序字段 | `String` | 条件必填 | `-` | 允许值：`PRICE`（价格）/ `STOCK`（库存）/ `CUMULATIVE_SALES`（累计销量）/ `LAST_30_DAYS_SALES`（30日销量）/ `CREATE_TIME`（创建时间）；与 `sort_order` 须同时传入 |
| `sort_order` | 排序方向 | `String` | 条件必填 | `-` | 允许值：`ASC`（升序）/ `DESC`（降序）；与 `sort_field` 须同时传入 |

### 入参样例

```json
{
  "item_status": "",
  "query_title": "",
  "query_item_id": "",
  "sort_field": "",
  "sort_order": ""
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "千牛-商品-商品管理-我的商品-全部 - 查询入参",
  "description": "item_status 允许值 ALL（全部）/ ON_SALE（出售中）/ IN_STOCK（仓库中）/ SOLD_OUT（已售空）；sort_field / sort_order 须同时传入",
  "type": "object",
  "required": [],
  "additionalProperties": false,
  "properties": {
    "item_status": {
      "type": "string",
      "description": "商品状态；允许值：ALL（全部）/ ON_SALE（出售中）/ IN_STOCK（仓库中）/ SOLD_OUT（已售空）",
      "enum": ["ALL", "ON_SALE", "IN_STOCK", "SOLD_OUT"]
    },
    "query_title": {
      "type": "string",
      "description": "商品标题搜索；关键词模糊搜索"
    },
    "query_item_id": {
      "description": "商品 ID 搜索；英文逗号或字符串数组；中文逗号改英文",
      "oneOf": [
        { "type": "string" },
        { "type": "array", "items": { "type": "string" } }
      ]
    },
    "sort_field": {
      "type": "string",
      "description": "排序字段；允许值：PRICE（价格）/ STOCK（库存）/ CUMULATIVE_SALES（累计销量）/ LAST_30_DAYS_SALES（30日销量）/ CREATE_TIME（创建时间）；与 sort_order 须同时传入",
      "enum": ["PRICE", "STOCK", "CUMULATIVE_SALES", "LAST_30_DAYS_SALES", "CREATE_TIME"]
    },
    "sort_order": {
      "type": "string",
      "description": "排序方向；允许值：ASC（升序）/ DESC（降序）；与 sort_field 须同时传入",
      "enum": ["ASC", "DESC"]
    }
  },
  "dependentRequired": {
    "sort_field": ["sort_order"],
    "sort_order": ["sort_field"]
  }
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `itemId` | 商品ID | `string` | 否 | `data.result.data.table.dataSource[*].itemId` | `804921098992` |
| `catId` | 类目ID | `number` | 是 | `data.result.data.table.dataSource[*].catId` | `50023725` |
| `itemDesc` | 商品描述信息 | `Dict` | 否 | `data.result.data.table.dataSource[*].itemDesc` | 见数据样例 `itemDesc` |
| `managerPrice` | 价格信息 | `Dict` | 是 | `data.result.data.table.dataSource[*].managerPrice` | 见数据样例 `managerPrice` |
| `managerQuantityNew` | 库存信息 | `Dict` | 是 | `data.result.data.table.dataSource[*].managerQuantityNew` | 见数据样例 `managerQuantityNew` |
| `soldQuantity_m` | 累计销量 | `number` | 是 | `data.result.data.table.dataSource[*].soldQuantity_m` | `101` |
| `monthlySoldQuantity` | 30日销量 | `Dict` | 是 | `data.result.data.table.dataSource[*].monthlySoldQuantity` | 见数据样例 `monthlySoldQuantity` |
| `diagnoseInfoV3` | 诊断/质量分信息 | `Dict` | 是 | `data.result.data.table.dataSource[*].diagnoseInfoV3` | 见数据样例 `diagnoseInfoV3` |
| `upShelfDate_m` | 上架日期与状态 | `Dict` | 是 | `data.result.data.table.dataSource[*].upShelfDate_m` | 见数据样例 `upShelfDate_m` |
| `endDate_m` | 下架时间 | `Dict` | 是 | `data.result.data.table.dataSource[*].endDate_m` | `null` |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |
| `taskId` | 任务 ID | `string` | 否 | 附加 |  |

### 数据样例

```json
{
  "itemId": "804921098992",
  "catId": 50023725,
  "itemDesc": {
    "img": "//img.alicdn.com/imgextra/i3/2215841747888/O1CN01Vudmh5288l8BLAM7D_!!0-item_pic.jpg_100x100xz",
    "imgLink": {
      "href": "https://detail.tmall.com/item.htm?id=804921098992",
      "target": "_blank",
      "noParams": true
    },
    "imgStyle": {
      "width": 80,
      "height": 80
    },
    "desc": [
      {
        "uiType": "link",
        "text": "Panasonic/松下壁挂洗衣机专属 拍1元免费上门服务 拍前联系客服",
        "style": {
          "fontSize": 12,
          "fontWeight": "normal",
          "color": "#333333"
        },
        "hasCopy": true,
        "copyText": "Panasonic/松下壁挂洗衣机专属 拍1元免费上门服务 拍前联系客服",
        "copyIcon": "copy",
        "href": "https://detail.tmall.com/item.htm?id=804921098992",
        "target": "_blank"
      },
      {
        "uiType": "text",
        "text": "ID:804921098992",
        "style": {
          "fontSize": 12,
          "fontWeight": "normal",
          "color": "#999999"
        },
        "hasCopy": true,
        "copyText": "804921098992",
        "copyIcon": "copy"
      }
    ],
    "iconList": [
      {
        "uiType": "qrCode",
        "name": "qrCodeDouble",
        "qrCodeImgUrl": "https://sell.publish.tmall.com/tmall/manager/qrcode.do?itemId=804921098992",
        "downloadUrl": "https://sell.publish.tmall.com/tmall/manager/qrcode.do?itemId=804921098992&activity=download",
        "itemUrl": "https://detail.tmall.com/item.htm?id=804921098992"
      }
    ]
  },
  "managerPrice": {
    "currentPrice": "¥ 1.00"
  },
  "managerQuantityNew": {
    "text": 99763
  },
  "soldQuantity_m": 101,
  "monthlySoldQuantity": {
    "value": "11",
    "empty": false
  },
  "diagnoseInfoV3": {
    "ysbTaskStatus": "WHITE"
  },
  "upShelfDate_m": {
    "value": "2024-06-11 14:07",
    "status": {
      "text": "出售中",
      "type": "success"
    }
  },
  "endDate_m": null,
  "bizDate": "20260509",
  "accountId": "101"
}
```

---

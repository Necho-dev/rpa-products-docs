---
title: 商品管理-评价管理-评价详情
description: 按时间/评分/内容类型/回复状态/活动/订单/商品/关键词获取商品评价明细数据
entry: rpa.conn.pinduoduo.shop.comment.list
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响
category: shop
---

| 属性             | 值                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_商品评价管理(拼多多RPA)`|
| **连接器代码**   | `rpa.conn.pinduoduo.shop.comment.list`|
| **操作类型**     | `页面解析`|
| **目标网页**     | `https://mms.pinduoduo.com/goods/evaluation/index?msfrom=mms_sidenav`|
| **适用场景**     | 按时间/评分/内容类型/回复状态/活动/订单/商品/关键词获取商品评价明细数据；默认配置最大翻页次数 100|
| **数据表名**     | `ods_rpa_pinduoduo_shop_comment_list_du`|
| **业务表名**     | `ODS_商品评价管理(拼多多RPA)`|

### 目标页面

> **取数路径**：拼多多商家后台—商品管理—评价管理—评价列表
>
> **取数链接**：[https://mms.pinduoduo.com/goods/evaluation/index](https://mms.pinduoduo.com/goods/evaluation/index?msfrom=mms_sidenav)

![拼多多商家后台—评价管理—评价列表](../_public/images/pinduoduo/shop_comment_list_20260521.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `date_type` | 评价时间范围 | `String` | 是 | `-` | 允许值：`LAST_30_DAYS`（近 30 天）/ `LAST_90_DAYS`（近 90 天）/ `LAST_180_DAYS`（近 180 天）/ `CUSTOM`（自定义区间） |
| `custom_start_date` | 自定义开始日期 | `String` | 条件必填 | `-` | `date_type` 为 `CUSTOM` 时必填；格式 `YYYYMMDD` / `YYYY-MM-DD`；最早约 today 往前 24 个自然月 |
| `custom_end_date` | 自定义结束日期 | `String` | 条件必填 | `-` | `date_type` 为 `CUSTOM` 时必填；格式 `YYYYMMDD` / `YYYY-MM-DD`；不可晚于今天 |
| `eval_tags` | 评价标签 | `String \| List[String]` | 否 | `-` | 填写页面下拉中的选项原文，选项不存在返回所有可选项 |
| `user_scores` | 用户评分 | `List[Integer]` | 否 | `-` | 允许值：`1` / `2` / `3` / `4` / `5` |
| `content_types` | 评价内容筛选 | `String \| List[String]` | 否 | `-` | 允许值：`HAS_IMAGE`（有图片）/ `HAS_VIDEO`（有视频）/ `MAIN_REVIEW_HAS_TEXT`（主评有文字）/ `HAS_APPEND`（有追加评价）/ `REPORTED`（已举报） |
| `reply_status` | 商家回复筛选 | `String \| List[String]` | 否 | `-` | 允许值：`REPLIED`（已回复）/ `UNREPLIED`（未回复） |
| `activity` | 参与活动筛选 | `String \| List[String]` | 否 | `-` | 允许值：`REVIEW_GIFT`（评价有礼） |
| `order_sn` | 订单编号 | `String` | 否 | `-` | — |
| `goods_id` | 商品 ID | `String` | 否 | `-` | 纯数字 |
| `keyword` | 关键词 | `String` | 否 | `-` | — |

### 入参样例

近 30 天：

```json
{
  "date_type": "LAST_30_DAYS",
  "custom_start_date": "",
  "custom_end_date": "",
  "eval_tags": [],
  "user_scores": [],
  "content_types": [],
  "reply_status": [],
  "activity": []
}
```

自定义区间（两种日期格式均可）：

```json
{
  "date_type": "CUSTOM",
  "custom_start_date": "20260901",
  "custom_end_date": "2026-09-07"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "拼多多-商品管理-评价管理-评价详情 - 查询入参",
  "description": "date_type 必填；允许值 LAST_30_DAYS（近 30 天）/ LAST_90_DAYS（近 90 天）/ LAST_180_DAYS（近 180 天）/ CUSTOM（自定义区间）；CUSTOM 时起止条件必填；最早约 today 往前 24 个自然月；不可晚于今天",
  "type": "object",
  "required": ["date_type"],
  "additionalProperties": false,
  "properties": {
    "date_type": {
      "type": "string",
      "description": "评价时间范围；允许值：LAST_30_DAYS（近 30 天）/ LAST_90_DAYS（近 90 天）/ LAST_180_DAYS（近 180 天）/ CUSTOM（自定义区间）",
      "enum": ["LAST_30_DAYS", "LAST_90_DAYS", "LAST_180_DAYS", "CUSTOM"]
    },
    "custom_start_date": {
      "type": "string",
      "description": "自定义开始日期；date_type 为 CUSTOM 时必填；格式 YYYYMMDD / YYYY-MM-DD；最早约 today 往前 24 个自然月",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "自定义结束日期；date_type 为 CUSTOM 时必填；格式 YYYYMMDD / YYYY-MM-DD；不可晚于今天",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "eval_tags": {
      "type": "array",
      "description": "评价标签；填写页面下拉中的选项原文，选项不存在返回所有可选项",
      "items": { "type": "string" }
    },
    "user_scores": {
      "type": "array",
      "description": "用户评分；允许值 1 / 2 / 3 / 4 / 5",
      "items": { "type": "integer", "enum": [1, 2, 3, 4, 5] }
    },
    "content_types": {
      "type": "array",
      "description": "评价内容筛选；允许值 HAS_IMAGE（有图片）/ HAS_VIDEO（有视频）/ MAIN_REVIEW_HAS_TEXT（主评有文字）/ HAS_APPEND（有追加评价）/ REPORTED（已举报）",
      "items": {
        "type": "string",
        "enum": ["HAS_IMAGE", "HAS_VIDEO", "MAIN_REVIEW_HAS_TEXT", "HAS_APPEND", "REPORTED"]
      }
    },
    "reply_status": {
      "type": "array",
      "description": "商家回复筛选；允许值 REPLIED（已回复）/ UNREPLIED（未回复）",
      "items": { "type": "string", "enum": ["REPLIED", "UNREPLIED"] }
    },
    "activity": {
      "type": "array",
      "description": "参与活动筛选；允许值 REVIEW_GIFT（评价有礼）",
      "items": { "type": "string", "enum": ["REVIEW_GIFT"] }
    },
    "order_sn": { "type": "string", "description": "订单编号" },
    "goods_id": { "type": "string", "description": "商品 ID；纯数字" },
    "keyword": { "type": "string", "description": "关键词" }
  },
  "allOf": [
    {
      "if": {
        "properties": { "date_type": { "const": "CUSTOM" } },
        "required": ["date_type"]
      },
      "then": {
        "required": ["custom_start_date", "custom_end_date"]
      }
    }
  ]
}
```

### 数据字段

| 字段               | 中文释义               | 数据类型        | 可为空 | 取数路径        | 示例 |
| ------------------ | ---------------------- | --------------- | ------ | --------------- | ---- |
| `reviewId`         | 评价 ID                | `string`        | 否     | `data[].reviewId` | 747883323036505742 |
| `userId`           | 用户 ID                | `number`           | 否     | `data[].userId` | 9895799943 |
| `goodsId`          | 商品 ID                | `number`           | 否     | `data[].goodsId` | 930005554830 |
| `orderId`          | 订单 ID                | `string`        | 否     | `data[].orderId` | 3282662259689903207 |
| `orderSn`          | 订单编号               | `string`        | 否     | `data[].orderSn` | 260410-662259689903207 |
| `score`            | 综合评分               | `number`           | 否     | `data[].score` | 0 |
| `descScore`        | 描述评分               | `number`           | 否     | `data[].descScore` | 5 |
| `logisticsScore`   | 物流评分               | `number`           | 否     | `data[].logisticsScore` | 5 |
| `serviceScore`     | 服务评分               | `number`           | 否     | `data[].serviceScore` | 5 |
| `comment`          | 评价内容               | `string`        | 是     | `data[].comment` | 牙膏非常好，推荐购买，很喜欢，还会回购，很喜欢[大爱][大爱][大爱][大爱] |
| `goodsName`        | 商品名称               | `string`        | 否     | `data[].goodsName` | 【抖音爆款】兔头妈妈儿童牙膏抗糖防蛀宝宝学生专研牙膏水果味 |
| `specs`            | 规格 JSON 字符串       | `string`        | 是     | `data[].specs` | 见数据样例 `specs` |
| `createTime`       | 评价时间（Unix 秒）   | `number`           | 否     | `data[].createTime` | 1776665876 |
| `anonymous`        | 是否匿名（1=是）       | `number`           | 否     | `data[].anonymous` | 1 |
| `append`           | 是否有追评（1=是）     | `number`           | 否     | `data[].append` | 0 |
| `appendNum`        | 追评次数               | `number`           | 否     | `data[].appendNum` | 0 |
| `reply`            | 商家回复内容           | `string`        | 是     | `data[].reply` | 兔头妈妈抗糖牙膏采用三重酶解抗糖配方，轻松应对多种糖分残留... |
| `replyTime`        | 回复时间（Unix 秒）   | `number` | 是     | `data[].replyTime` | 1776669842 |
| `replyStatus`      | 回复状态（1=已回复）  | `number`           | 否     | `data[].replyStatus` | 1 |
| `keywords`         | 评价关键词             | `List`          | 否     | `data[].keywords` | [] |
| `userName`         | 用户名（脱敏）         | `string`        | 否     | `data[].userName` | 阿*** |
| `thumbUrl`         | 用户头像 URL           | `string`        | 是     | `data[].thumbUrl` | https://img.pddpic.com/gaudit-image/2026-03-30/6bb9906a8b6938721d81ccb27240a85f.jpeg |
| `favorCount`       | 点赞数                 | `number`           | 否     | `data[].favorCount` | 0 |
| `replyCount`       | 回复数                 | `number`           | 否     | `data[].replyCount` | 1 |
| `status`           | 评价状态               | `number`           | 否     | `data[].status` | 2 |
| `pictureUrls`      | 评价图片 URL 列表     | `List[string]`  | 否     | `data[].pictureUrls` | 见数据样例 `pictureUrls` |
| `pictureCount`     | 图片数量               | `number`           | 否     | `data[].pictureCount` | 3 |
| `hasVideo`         | 是否有视频（1=是）     | `number`           | 否     | `data[].hasVideo` | 0 |
| `snapshotSpec`     | 下单规格快照           | `string`        | 是     | `data[].snapshotSpec` | 【抗糖防蛀水果味】,葡萄味60g*1支+蜜瓜味60g*1支+蜜桃牙膏10g*2支 |
| `snapshotGoodsName`| 下单商品名快照         | `string`        | 是     | `data[].snapshotGoodsName` | 【抖音爆款】兔头妈妈儿童牙膏抗糖防蛀宝宝学生专研牙膏水果味 |
| `appendComment`    | 追评内容               | `string`        | 是     | `data[].appendComment` | "" |
| `appendCreateTime` | 追评时间（Unix 秒）   | `number`  | 是     | `data[].appendCreateTime` | null |
| `reportStatus`     | 举报状态               | `number` | 是     | `data[].reportStatus` | 99 |
| `reportDesc`       | 举报描述               | `string`        | 是     | `data[].reportDesc` | 未被举报 |
| `bizDate`           | 业务日期         | `string`  | 否     | 附加              |      |
| `accountId`         | 授权 ID          | `string`  | 否     | 附加              |      |

#### 页面评价星级说明

- 根据页面渲染逻辑，页面中的「用户评价分」星级计算逻辑：
    - 若 `score === 0` 则取 `descScore` 的整数部分，即`Math.floor(descScore)`；
    - 若 `score === 0` 则取 `score` 的整数部分，即 `Math.floor(score)`；
- 通过翻页检查确认：
    - 未发现 `score !== 0` 的情况；
    - 未发现 `descScore` 非整数的情况；

### 数据样例

```json
[
  {
    "reviewId": "747883323036505742",
    "userId": 9895799943,
    "goodsId": 930005554830,
    "orderId": "3282662259689903207",
    "orderSn": "260410-662259689903207",
    "score": 0,
    "descScore": 5,
    "logisticsScore": 5,
    "serviceScore": 5,
    "comment": "牙膏非常好，推荐购买，很喜欢，还会回购，很喜欢[大爱][大爱][大爱][大爱]",
    "goodsName": "【抖音爆款】兔头妈妈儿童牙膏抗糖防蛀宝宝学生专研牙膏水果味",
    "specs": "[{\"spec_key\":\"款式\",\"spec_value\":\"【抗糖防蛀水果味】\"},{\"spec_key\":\"口味\",\"spec_value\":\"葡萄味60g*1支+蜜瓜味60g*1支+蜜桃牙膏10g*2支\"}]",
    "createTime": 1776665876,
    "anonymous": 1,
    "append": 0,
    "appendNum": 0,
    "reply": "兔头妈妈抗糖牙膏采用三重酶解抗糖配方，轻松应对多种糖分残留...",
    "replyTime": 1776669842,
    "replyStatus": 1,
    "keywords": [],
    "userName": "阿***",
    "thumbUrl": "https://img.pddpic.com/gaudit-image/2026-03-30/6bb9906a8b6938721d81ccb27240a85f.jpeg",
    "favorCount": 0,
    "replyCount": 1,
    "status": 2,
    "pictureUrls": [
      "https://review.pddpic.com/review3/review/2026-04-20/f514d234-3112-4195-b82d-ba6a66f451d2.jpeg",
      "https://review.pddpic.com/review3/review/2026-04-20/39921f2e-e84e-4015-a8ac-85feaeedbee1.jpeg",
      "https://review.pddpic.com/review3/review/2026-04-20/9590fe74-9fdd-4781-be09-0fe1e2398e59.jpeg"
    ],
    "pictureCount": 3,
    "hasVideo": 0,
    "snapshotSpec": "【抗糖防蛀水果味】,葡萄味60g*1支+蜜瓜味60g*1支+蜜桃牙膏10g*2支",
    "snapshotGoodsName": "【抖音爆款】兔头妈妈儿童牙膏抗糖防蛀宝宝学生专研牙膏水果味",
    "appendComment": "",
    "appendCreateTime": null,
    "reportStatus": 99,
    "reportDesc": "未被举报",
    "bizDate": "20260420",
    "accountId": "test_account_6"
  }
]
```

---

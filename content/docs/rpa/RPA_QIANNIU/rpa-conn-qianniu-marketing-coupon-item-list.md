---
title: 营销-优惠券管理-优惠券列表
description: 按推广方式、商品生效范围、可用时间等条件采集优惠券管理中的优惠券列表，完整保留平台返回的活动字段及嵌套结构
entry: rpa.conn.qianniu.marketing.coupon.item.list
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  min: 2
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响
category: marketing
---

| 属性             | 值                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`                                                                                        |
| **连接器名称**   | `ODS_营销优惠券信息表(千牛RPA)`                                                                      |
| **连接器代码**   | `rpa.conn.qianniu.marketing.coupon.item.list`                                                       |
| **操作类型**     | `页面解析`                                                                                          |
| **目标网页**     | `https://qn.taobao.com/home.htm/coupon?isFirst=true&isNew=true&defaultTab=itemCouponList`            |
| **适用场景**     | 按推广方式、商品生效范围、可用时间等条件采集优惠券管理中的优惠券列表，完整保留平台返回的活动字段及嵌套结构 |
| **数据表名**     | `ods_rpa_qianniu_marketing_coupon_item_list_du`                                                      |
| **业务表名**     | `ODS_营销优惠券信息表(千牛RPA)`                                                                      |

### 目标页面

> **取数路径**：千牛后台—营销—营销工具—优惠券—优惠券管理
>
> **取数链接**：[https://qn.taobao.com/home.htm/coupon?isFirst=true&isNew=true&defaultTab=itemCouponList](https://qn.taobao.com/home.htm/coupon?isFirst=true&isNew=true&defaultTab=itemCouponList)

![千牛后台—营销工具—优惠券管理](../_public/images/qianniu/marketing_coupon_item_list_20260716.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `promote_type` | 推广方式 | `String` | 否 | `SHOP_MEMBER` | 英文 code；可选值：`ALL`（全部）、`AUTO_PROMOTE`（全网自动推广）、`GENERAL_LINK`（通用领券链接）、`LIVE_CHANNEL`（淘宝直播渠道优惠券）、`SHOP_MEMBER`（店铺会员专享券）、`RETURN_CUSTOMER`（回头客券）、`RIGHTS_PLATFORM`（权益营销平台券）、`FOLLOW_SHOP`（关注店铺优惠券）。连接器会映射为页面中文文案后精确匹配；页面无对应选项时失败软退出（`reason=promote_type_not_found`），并通过 `available_promote_types` 返回页面全部可选推广方式 |
| `item_scope` | 商品生效范围 | `String` | 否 | `ITEM_COUPON` | 可选值：`ITEM_COUPON`（商品券（指定商品可用））、`SHOP_COUPON`（店铺券（全店可用）） |
| `custom_start_date` | 可用开始日期 | `String` | 否 | —（不限） | 格式：`YYYYMMDD` 或 `YYYY-MM-DD`；与 `custom_end_date` 均未传时不填页面可用时间筛选；起止须同时传入 |
| `custom_end_date` | 可用结束日期 | `String` | 否 | —（不限） | 格式：`YYYYMMDD` 或 `YYYY-MM-DD`；与 `custom_start_date` 均未传时不填页面可用时间筛选；起止须同时传入；不能早于可用开始日期 |
| `coupon_name` | 券名称 | `String` | 否 | 空字符串 | 按券名称筛选 |
| `coupon_id` | 券 ID | `String` | 否 | 空字符串 | 按券 ID 筛选 |
| `coupon_amount` | 券面额 | `String` | 否 | 空字符串 | 按券面额筛选 |
| `item_id` | 商品 ID | `String` | 否 | 空字符串 | 按商品 ID 筛选 |

### 入参样例

使用全部默认条件（推广方式默认 `SHOP_MEMBER`、商品生效范围默认 `ITEM_COUPON`、可用时间不限）：

```json
{}
```

指定推广方式与可用时间范围：

```json
{
  "promote_type": "SHOP_MEMBER",
  "item_scope": "ITEM_COUPON",
  "custom_start_date": "20260701",
  "custom_end_date": "20260731"
}
```

按券 ID、券名称等文本条件精确筛选：

```json
{
  "promote_type": "SHOP_MEMBER",
  "item_scope": "ITEM_COUPON",
  "custom_start_date": "20260701",
  "custom_end_date": "20260731",
  "coupon_id": "138940200949",
  "coupon_name": "220",
  "coupon_amount": "220",
  "item_id": ""
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "千牛-营销优惠券管理优惠券列表 - 查询入参",
  "description": "按推广方式、商品生效范围、可用时间等条件采集优惠券管理中的优惠券列表，完整保留平台返回的活动字段及嵌套结构",
  "type": "object",
  "properties": {
    "promote_type": {
      "type": "string",
      "description": "推广方式英文 code，映射为页面中文后精确匹配；页面无对应选项时失败软退出，并返回 available_promote_types",
      "enum": [
        "ALL",
        "AUTO_PROMOTE",
        "GENERAL_LINK",
        "LIVE_CHANNEL",
        "SHOP_MEMBER",
        "RETURN_CUSTOMER",
        "RIGHTS_PLATFORM",
        "FOLLOW_SHOP"
      ],
      "default": "SHOP_MEMBER"
    },
    "item_scope": {
      "type": "string",
      "description": "商品生效范围",
      "enum": [
        "ITEM_COUPON",
        "SHOP_COUPON"
      ],
      "default": "ITEM_COUPON"
    },
    "custom_start_date": {
      "type": "string",
      "description": "可用开始日期，格式 YYYYMMDD 或 YYYY-MM-DD；与结束日期均未传时不填页面；须与 custom_end_date 成对传入",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "可用结束日期，格式 YYYYMMDD 或 YYYY-MM-DD；与开始日期均未传时不填页面；须与 custom_start_date 成对传入，且不能早于开始日期",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "coupon_name": {
      "type": "string",
      "description": "用于筛选的券名称",
      "default": ""
    },
    "coupon_id": {
      "type": "string",
      "description": "用于筛选的券 ID",
      "default": ""
    },
    "coupon_amount": {
      "type": "string",
      "description": "用于筛选的券面额",
      "default": ""
    },
    "item_id": {
      "type": "string",
      "description": "用于筛选的商品 ID",
      "default": ""
    }
  },
  "required": [],
  "additionalProperties": false
}
```

### 数据字段

:::field-tree
@define 活动扩展特征
| `applyPlace` | 适用场所 | `String` | 是 | 页面解析 | `0` |
| `spreadId` | 推广 ID | `String` | 是 | 页面解析 | `147****132` (已脱敏) |
| `detailId` | 明细 ID | `String` | 是 | 页面解析 | `301****316` (已脱敏) |
| `e_appName` | 外部应用名 | `String` | 是 | 页面解析 | `passport-web` |
| `uuid` | 唯一标识 | `String` | 是 | 页面解析 | `b9b****3d4` (已脱敏) |
| `activityId` | 活动 ID | `String` | 是 | 页面解析 | `138****949` (已脱敏) |
| `toolId` | 工具 ID | `String` | 是 | 页面解析 | `862****001` (已脱敏) |
| `memberActStart` | 会员活动开始时间戳 | `String` | 是 | 页面解析 | `1782835200000` |
| `options` | 选项标识 | `String` | 是 | 页面解析 | `19` |
| `participateId` | 参与方 ID | `String` | 是 | 页面解析 | `215****896` (已脱敏) |
| `participateRange` | 参与范围 | `String` | 是 | 页面解析 | `1` |
| `couponCenterTemplateId` | 券中心模板 ID | `String` | 是 | 页面解析 | `202****171` (已脱敏) |
| `perLimit` | 每人限领 | `String` | 是 | 页面解析 | `5` |
| `amount` | 优惠金额（分） | `String` | 是 | 页面解析 | `22000` |
| `draftId` | 草稿 ID | `String` | 是 | 页面解析 | `168****869` (已脱敏) |
| `memberActEnd` | 会员活动结束时间戳 | `String` | 是 | 页面解析 | `1785513599000` |
| `appName` | 应用名 | `String` | 是 | 页面解析 | `mkt-shell` |
| `memberLevel` | 会员等级 | `String` | 是 | 页面解析 | `1` |
| `calculateLevel` | 计算层级 | `String` | 是 | 页面解析 | `2` |
| `rbac` | 是否启用权限控制 | `String` | 是 | 页面解析 | `true` |
| `mbrPerLimit` | 会员每人限领 | `String` | 是 | 页面解析 | `5` |
| `perLimitType` | 限领类型 | `String` | 是 | 页面解析 | `0` |
| `mkt_source_biz` | 营销来源业务标识 | `String` | 是 | 页面解析 | `$|$|$|$` |
| `couponV2` | 是否券 V2 | `String` | 是 | 页面解析 | `1` |
| `discountFeeMode` | 优惠金额模式 | `String` | 是 | 页面解析 | `0` |
| `memberCardTag` | 会员卡标签 | `String` | 是 | 页面解析 | `1` |
| `tags` | 标签 ID | `String` | 是 | 页面解析 | `942****001` (已脱敏) |
| `goBuyerGeneralLimit` | 是否走买家通用限领 | `String` | 是 | 页面解析 | `true` |
| `toolCode` | 工具代码 | `String` | 是 | 页面解析 | `itemCoupon` |
| `ump_op` | 营销操作标识 | `String` | 是 | 页面解析 | `dec****0` (已脱敏) |
| `spreadType` | 推广类型 | `String` | 是 | 页面解析 | `1` |
| `bizSource` | 业务来源 | `String` | 是 | 页面解析 | `` |
| `regionId` | 区域 ID | `String` | 是 | 页面解析 | `` |
| `participateType` | 参与类型 | `String` | 是 | 页面解析 | `3` |
| `startFee` | 使用门槛（分） | `String` | 是 | 页面解析 | `60000` |
| `siteId` | 站点 ID | `String` | 是 | 页面解析 | `` |
| `autoRenewal` | 是否自动续期 | `String` | 是 | 页面解析 | `false` |
| `timeMode` | 时间模式 | `String` | 是 | 页面解析 | `0` |
| `useAt` | 使用时机 | `String` | 是 | 页面解析 | `0` |
| `buyerDriveFlag` | 是否买家驱动 | `String` | 是 | 页面解析 | `true` |

@define 状态描述
| `value` | 状态代码 | `String` | 否 | 页面解析 | `APPLING` |
| `label` | 领取状态中文名 | `String` | 否 | 页面解析 | `领取中` |

@define 可用操作项
| `text` | 操作文案 | `String` | 否 | 页面解析 | `查看` |
| `url` | 操作链接 | `String` | 是 | 页面解析 | `null` |
| `enable` | 是否可用 | `Boolean` | 否 | 页面解析 | `true` |
| `order` | 排序 | `Number` | 是 | 页面解析 | `null` |
| `type` | 操作类型 | `String` | 否 | 页面解析 | `view` |
| `action` | 操作动作 | `String` | 是 | 页面解析 | `null` |
| `supportStatus` | 支持的状态列表 | `List[String]` | 否 | 页面解析 | `["APPLING","IN_USE"]` |

@define 自动续期信息
| `autoRenewal` | 续期开关 | `Boolean` | 是 | 页面解析 | `null` |
| `renewalStatus` | 续期状态 | `String` | 是 | 页面解析 | `UNSUPPORTED_RENEWAL` |
| `unsupportedReasonMap` | 不支持续期原因映射 | `Dict` | 是 | 页面解析 | 见数据样例 |
| `canNotSetReasonMap` | 不可设置原因映射 | `Dict` | 是 | 页面解析 | `{}` |
| `renewalTemplateId` | 续期模板 ID | `String` | 是 | 页面解析 | `null` |
| `renewalFailReason` | 续期失败原因 | `String` | 是 | 页面解析 | `null` |

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `useDraft` | 是否使用草稿 | `Boolean` | 否 | 页面解析 | `false` |
| `writeType` | 写入类型 | `Number` | 否 | 页面解析 | `0` |
| `name` | 优惠券名称 | `String` | 否 | 页面解析 | `220` |
| `startTime` | 开始时间戳；与 `endTime` 格式化后可得优惠券使用时间范围 | `Number` | 否 | 页面解析 | `1782835200000` |
| `endTime` | 结束时间戳；与 `startTime` 格式化后可得优惠券使用时间范围 | `Number` | 否 | 页面解析 | `1785513599000` |
| `status` | 状态代码 | `Number` | 否 | 页面解析 | `1` |
| `createTime` | 创建时间戳 | `Number` | 否 | 页面解析 | `1782638342000` |
| `fromHSF` | 是否来自 HSF | `Boolean` | 否 | 页面解析 | `false` |
| `feature` @活动扩展特征 | 活动扩展特征 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `outerReq` | 是否外部请求 | `Boolean` | 否 | 页面解析 | `false` |
| `needFillDetail` | 是否需要补充明细 | `Boolean` | 否 | 页面解析 | `true` |
| `detailSkipActCheck` | 明细是否跳过活动检查 | `Boolean` | 否 | 页面解析 | `false` |
| `onlyProcessAllDetails` | 是否仅处理全部明细 | `Boolean` | 否 | 页面解析 | `false` |
| `skipTagFill` | 是否跳过标签填充 | `Boolean` | 否 | 页面解析 | `false` |
| `wireless` | 是否无线活动 | `Boolean` | 否 | 页面解析 | `false` |
| `recordFlag` | 记录标识 | `Number` | 否 | 页面解析 | `0` |
| `totalCount` | 发放总量 | `Number` | 否 | 页面解析 | `100000` |
| `needDealSentinelException` | 是否处理限流异常 | `Boolean` | 否 | 页面解析 | `false` |
| `timeoutThrowException` | 超时是否抛出异常 | `Boolean` | 否 | 页面解析 | `false` |
| `uuid` | 唯一标识 | `String` | 否 | 页面解析 | `b9b****3d4` (已脱敏) |
| `templateCode` | 优惠券模板代码 / 券 ID | `Number` | 否 | 页面解析 | `138****949` (已脱敏) |
| `couponType` | 优惠券类型；与 `tagName`、`tagLabel` 组合可得推广方式展示文案 | `Number` | 否 | 页面解析 | `1` |
| `subType` | 优惠券子类型 | `Number` | 否 | 页面解析 | `0` |
| `personLimit` | 每人限领数量 | `Number` | 否 | 页面解析 | `5` |
| `applyCount` | 已领取数量 | `Number` | 否 | 页面解析 | `0` |
| `couponTag` | 优惠券标签 | `String` | 否 | 页面解析 | `942****001` (已脱敏) |
| `amountYuan` | 优惠金额（元） | `String` | 否 | 页面解析 | `220` |
| `startFeeYuan` | 使用门槛（元） | `String` | 否 | 页面解析 | `600` |
| `timeMode` | 时间模式 | `String` | 否 | 页面解析 | `0` |
| `effectiveTimeMode` | 生效时间模式 | `String` | 否 | 页面解析 | `FIXED_START_END_TIME` |
| `effectiveInterval` | 生效间隔 | `Number` | 否 | 页面解析 | `0` |
| `statusDesc` @状态描述 | 状态描述；其中 `label` 为领取状态中文名 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `tagId` | 推广标签 ID | `String` | 否 | 页面解析 | `942****001` (已脱敏) |
| `tagName` | 推广标签名称；与 `couponType`、`tagLabel` 组合可得推广方式展示文案 | `String` | 否 | 页面解析 | 店铺会员专享券 |
| `tagLabel` | 推广标签说明；与 `tagName`、`couponType` 组合可得推广方式展示文案 | `String` | 否 | 页面解析 | 促转化 |
| `tagColor` | 推广标签颜色 | `String` | 否 | 页面解析 | `#FE8533` |
| `threshold` | 优惠门槛说明 / 优惠详情 | `String` | 否 | 页面解析 | 满600减220 |
| `optionList` @可用操作项 | 可用操作列表 | `List[Dict]` | 否 | 页面解析 | 见数据样例 |
| `unConditional` | 是否无门槛 | `Boolean` | 否 | 页面解析 | `false` |
| `renewalInfoDTO` @自动续期信息 | 自动续期信息；其中 `autoRenewal`、`renewalStatus` 可映射为自动续期说明 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `smartRateHost` | 是否智能折扣 | `Boolean` | 否 | 页面解析 | `false` |
| `innerJobRequest` | 是否内部任务请求 | `Boolean` | 否 | 页面解析 | `false` |
| `batchCreateActivity` | 是否批量创建活动 | `Boolean` | 否 | 页面解析 | `false` |
| `zhaoshang` | 是否招商活动 | `Boolean` | 否 | 页面解析 | `false` |
| `taskId` | 任务 ID | `String` | 否 | 附加 | `dev****296` (已脱敏) |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260716` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****6` (已脱敏) |
:::

### 数据样例

```json
[
  {
    "useDraft": false,
    "writeType": 0,
    "name": "220",
    "startTime": 1782835200000,
    "endTime": 1785513599000,
    "status": 1,
    "createTime": 1782638342000,
    "fromHSF": false,
    "feature": {
      "applyPlace": "0",
      "spreadId": "147****132",
      "detailId": "301****316",
      "e_appName": "passport-web",
      "uuid": "b9b****3d4",
      "activityId": "138****949",
      "toolId": "862****001",
      "memberActStart": "1782835200000",
      "options": "19",
      "participateId": "215****896",
      "participateRange": "1",
      "couponCenterTemplateId": "202****171",
      "perLimit": "5",
      "amount": "22000",
      "draftId": "168****869",
      "memberActEnd": "1785513599000",
      "appName": "mkt-shell",
      "memberLevel": "1",
      "calculateLevel": "2",
      "rbac": "true",
      "mbrPerLimit": "5",
      "perLimitType": "0",
      "mkt_source_biz": "$|$|$|$",
      "couponV2": "1",
      "discountFeeMode": "0",
      "memberCardTag": "1",
      "tags": "942****001",
      "goBuyerGeneralLimit": "true",
      "toolCode": "itemCoupon",
      "ump_op": "dec****0",
      "spreadType": "1",
      "bizSource": "",
      "regionId": "",
      "participateType": "3",
      "startFee": "60000",
      "siteId": "",
      "autoRenewal": "false",
      "timeMode": "0",
      "useAt": "0",
      "buyerDriveFlag": "true"
    },
    "outerReq": false,
    "needFillDetail": true,
    "detailSkipActCheck": false,
    "onlyProcessAllDetails": false,
    "skipTagFill": false,
    "wireless": false,
    "recordFlag": 0,
    "totalCount": 100000,
    "needDealSentinelException": false,
    "timeoutThrowException": false,
    "uuid": "b9b****3d4",
    "templateCode": "138****949",
    "couponType": 1,
    "subType": 0,
    "personLimit": 5,
    "applyCount": 0,
    "couponTag": "942****001",
    "amountYuan": "220",
    "startFeeYuan": "600",
    "timeMode": "0",
    "effectiveTimeMode": "FIXED_START_END_TIME",
    "effectiveInterval": 0,
    "statusDesc": {
      "value": "APPLING",
      "label": "领取中"
    },
    "tagId": "942****001",
    "tagName": "店铺会员专享券",
    "tagLabel": "促转化",
    "tagColor": "#FE8533",
    "threshold": "满600减220",
    "optionList": [
      {
        "text": "查看",
        "url": null,
        "enable": true,
        "order": null,
        "type": "view",
        "action": null,
        "supportStatus": [
          "APPLING",
          "IN_USE",
          "APPLY_FINISH",
          "NOT_USE",
          "TO_END",
          "FINISH"
        ]
      },
      {
        "text": "数据",
        "url": null,
        "enable": true,
        "order": null,
        "type": "data",
        "action": null,
        "supportStatus": [
          "APPLING",
          "IN_USE",
          "APPLY_FINISH",
          "NOT_USE",
          "TO_END",
          "FINISH"
        ]
      },
      {
        "text": "修改",
        "url": null,
        "enable": true,
        "order": null,
        "type": "modify",
        "action": null,
        "supportStatus": [
          "APPLING",
          "IN_USE",
          "APPLY_FINISH",
          "NOT_USE",
          "TO_END"
        ]
      },
      {
        "text": "复制",
        "url": null,
        "enable": true,
        "order": null,
        "type": "copy",
        "action": null,
        "supportStatus": [
          "APPLING",
          "IN_USE",
          "APPLY_FINISH",
          "NOT_USE",
          "TO_END",
          "FINISH"
        ]
      },
      {
        "text": "推广",
        "url": null,
        "enable": false,
        "order": null,
        "type": "getLink",
        "action": null,
        "supportStatus": [
          "APPLING",
          "IN_USE",
          "APPLY_FINISH",
          "NOT_USE",
          "TO_END"
        ]
      },
      {
        "text": "推广",
        "url": null,
        "enable": false,
        "order": null,
        "type": "getLink",
        "action": null,
        "supportStatus": [
          "APPLING",
          "IN_USE",
          "APPLY_FINISH",
          "TO_END"
        ]
      },
      {
        "text": "结束",
        "url": null,
        "enable": true,
        "order": null,
        "type": "end",
        "action": null,
        "supportStatus": [
          "APPLING",
          "IN_USE",
          "APPLY_FINISH",
          "NOT_USE",
          "TO_END"
        ]
      }
    ],
    "unConditional": false,
    "renewalInfoDTO": {
      "autoRenewal": null,
      "renewalStatus": "UNSUPPORTED_RENEWAL",
      "unsupportedReasonMap": {
        "COUPON_RENEWAL_UNSUPPORT_CHANNEL": "当前券类型不支持开启自动续期"
      },
      "canNotSetReasonMap": {},
      "renewalTemplateId": null,
      "renewalFailReason": null
    },
    "smartRateHost": false,
    "innerJobRequest": false,
    "batchCreateActivity": false,
    "zhaoshang": false,
    "bizDate": "20260716",
    "accountId": "1****6",
    "taskId": "dev****296"
  }
]
```

---

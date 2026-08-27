---
title: 天猫健康-三方外投-自定义报表
description: 登录天猫健康云台后，按媒体平台、日期与自定义表头模板筛选三方外投数据，异步导出账户粒度天汇总并解析为行级明细
entry: rpa.conn.alijiankang.tmjk.three.party.custom.report
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响。
category: tmjk
---

| 属性             | 值                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                                         |
| **连接器名称**   | `ODS_天猫健康三方渠道自定义报表下载(阿里健康RPA)`                                    |
| **连接器代码**   | `rpa.conn.alijiankang.tmjk.three.party.custom.report`                                |
| **操作类型**     | `文件导出`                                                                           |
| **目标网页**     | `https://yt.taobao.com/v2/third-party-invest#`                                       |
| **适用场景**     | 登录天猫健康云台后，按媒体平台、日期与自定义表头模板筛选三方外投数据，异步导出账户粒度天汇总并解析为行级明细 |
| **数据表名**     | `ods_rpa_alijiankang_tmjk_three_party_custom_report_du`                              |
| **业务表名**     | `ODS_天猫健康三方渠道自定义报表下载(阿里健康RPA)`                                    |

### 目标页面

> **取数路径**：天猫健康云台—推广—三方外投—店铺看板—选择指标模板—口径说明（分天）—多渠道下载—下载中心
>
> **取数链接**：[https://yt.taobao.com/v2/third-party-invest#](https://yt.taobao.com/v2/third-party-invest#)

![天猫健康—三方外投自定义报表](../../_public/images/alijiankang/tmjk_three_party_custom_report_20260825.png)

![天猫健康—三方外投—多渠道数据汇总下载](../../_public/images/alijiankang/tmjk_three_party_custom_report_download_20260825.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `channels` | 媒体平台 / 下载渠道 | `String` / `List[String]` | 是 | — | 英文 code，列表页「媒体平台」与下载抽屉「渠道」共用同一套选项；支持英文逗号分隔字符串或 JSON 数组。可选值：`DOUYIN`（抖音）/ `BILIBILI`（B站）/ `TENCENT`（腾讯）/ `UC`（UC）/ `KUAISHOU`（快手）/ `ZHIHU`（知乎）/ `XIAOHONGSHU`（小红书）/ `WEIBO`（微博）/ `BAIDU`（百度）/ `ALIPAY`（支付宝）/ `XIAOHE_MEDICAL`（小荷医疗） |
| `date_type` | 日期类型 | `String` | 是 | — | 英文 code，列表页与下载抽屉共用。可选值：`LAST_7_DAYS`（近7天）/ `LAST_30_DAYS`（近30天）/ `CUSTOM`（自定义） |
| `custom_start_date` | 自定义起始日期 | `String` | 条件必填 | — | 仅 `date_type=CUSTOM` 时必填；支持 `YYYYMMDD` 或 `YYYY-MM-DD` |
| `custom_end_date` | 自定义结束日期 | `String` | 条件必填 | — | 仅 `date_type=CUSTOM` 时必填；支持 `YYYYMMDD` 或 `YYYY-MM-DD`；须不早于起始日期；跨度不超过 31 天（含首尾） |
| `report_template_name` | 自定义表头模板名称 | `String` | 是 | — | 与店铺看板「常用自定义表头模板」弹层项全文精确匹配 |

### 入参样例

近 7 天 + 单渠道：

```json
{
  "channels": ["DOUYIN"],
  "date_type": "LAST_7_DAYS",
  "report_template_name": "输入模版的名称"
}
```

自定义日期 + 多渠道（逗号分隔）：

```json
{
  "channels": "DOUYIN,TENCENT",
  "date_type": "CUSTOM",
  "custom_start_date": "2026-07-01",
  "custom_end_date": "2026-07-31",
  "report_template_name": "输入模版的名称"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "阿里健康-三方外投自定义报表 - 查询入参",
  "description": "登录天猫健康云台后，按媒体平台、日期与自定义表头模板筛选三方外投数据，异步导出账户粒度天汇总并解析为行级明细",
  "type": "object",
  "properties": {
    "channels": {
      "description": "媒体平台与下载渠道英文 code，支持英文逗号分隔字符串或 JSON 数组。可选值：DOUYIN（抖音）/ BILIBILI（B站）/ TENCENT（腾讯）/ UC（UC）/ KUAISHOU（快手）/ ZHIHU（知乎）/ XIAOHONGSHU（小红书）/ WEIBO（微博）/ BAIDU（百度）/ ALIPAY（支付宝）/ XIAOHE_MEDICAL（小荷医疗）",
      "oneOf": [
        {
          "type": "string",
          "minLength": 1
        },
        {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "enum": [
              "DOUYIN",
              "BILIBILI",
              "TENCENT",
              "UC",
              "KUAISHOU",
              "ZHIHU",
              "XIAOHONGSHU",
              "WEIBO",
              "BAIDU",
              "ALIPAY",
              "XIAOHE_MEDICAL"
            ]
          },
          "uniqueItems": true
        }
      ]
    },
    "date_type": {
      "description": "日期类型英文 code。可选值：LAST_7_DAYS（近7天）/ LAST_30_DAYS（近30天）/ CUSTOM（自定义）",
      "type": "string",
      "enum": ["LAST_7_DAYS", "LAST_30_DAYS", "CUSTOM"]
    },
    "custom_start_date": {
      "description": "自定义起始日期，仅 date_type=CUSTOM 时必填；支持 YYYYMMDD 或 YYYY-MM-DD",
      "type": "string",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "description": "自定义结束日期，仅 date_type=CUSTOM 时必填；跨度不超过 31 天（含首尾）",
      "type": "string",
      "pattern": "^(\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "report_template_name": {
      "description": "常用自定义表头模板名称，与弹层项全文精确匹配",
      "type": "string",
      "minLength": 1
    }
  },
  "required": ["channels", "date_type", "report_template_name"],
  "additionalProperties": false,
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

导出列为所选自定义表头模板的动态表头：每条 Excel 行对应一条记录，`value` 保留原始中文表头。口径说明固定为「分天」，下载维度固定为「账户」。导出前若列表无数据，返回 `success=true`、`message=暂无数据`、`data=[]`，不创建导出任务。

:::field-tree
@define 报表行数据
| `日期` | 日期 | `String` | 是 | `XLSX.0.日期` | — |
| `商家昵称` | 商家昵称 | `String` | 是 | `XLSX.0.商家昵称` | `****` (已脱敏) |
| `渠道名称` | 渠道名称 | `String` | 是 | `XLSX.0.渠道名称` | `抖音,腾讯` |
| `账户id` | 账户 ID | `String` | 是 | `XLSX.0.账户id` | — |
| `账户名称` | 账户名称 | `String` | 是 | `XLSX.0.账户名称` | — |
| `备注` | 备注 | `String` | 是 | `XLSX.0.备注` | — |
| `智能起量` | 智能起量 | `String` | 是 | `XLSX.0.智能起量` | `未开启` |
| `出价托管` | 出价托管 | `String` | 是 | `XLSX.0.出价托管` | `未开启` |
| `引流补贴(平台出资)` | 引流补贴(平台出资) | `String` | 是 | `XLSX.0.引流补贴(平台出资)` | — |
| `消耗` | 消耗 | `String` | 是 | `XLSX.0.消耗` | `1550983.45` |
| `有效gmv` | 有效 GMV | `String` | 是 | `XLSX.0.有效gmv` | `5593761.53` |
| `今日gmv` | 今日 GMV | `String` | 是 | `XLSX.0.今日gmv` | `2976952.48` |
| `有效gmv（本品）` | 有效 GMV（本品） | `String` | 是 | `XLSX.0.有效gmv（本品）` | `2601936.99` |
| `加购量` | 加购量 | `String` | 是 | `XLSX.0.加购量` | `36642` |
| `展示数` | 展示数 | `String` | 是 | `XLSX.0.展示数` | `34757399` |
| `点击数` | 点击数 | `String` | 是 | `XLSX.0.点击数` | `274558` |
| `转化数` | 转化数 | `String` | 是 | `XLSX.0.转化数` | `9728` |
| `支付父订单量` | 支付父订单量 | `String` | 是 | `XLSX.0.支付父订单量` | `16441` |
| `支付父订单量（本品）` | 支付父订单量（本品） | `String` | 是 | `XLSX.0.支付父订单量（本品）` | `7648` |
| `有效roi（本品）` | 有效 ROI（本品） | `String` | 是 | `XLSX.0.有效roi（本品）` | `1.68` |
| `有效roi` | 有效 ROI | `String` | 是 | `XLSX.0.有效roi` | `3.61` |
| `今日roi` | 今日 ROI | `String` | 是 | `XLSX.0.今日roi` | `1.92` |

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `id` | 行序号 | `Number` | 否 | 序号从 1 递增 | `1` |
| `value` @报表行数据 | 报表行数据 | `Dict` | 否 | `XLSX` 行记录（原始表头） | 见数据样例 `value` |
| `taskId` | 任务 ID | `String` | 否 | 附加 | `dev****8f5` (已脱敏) |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260824` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `1****2` (已脱敏) |
:::

> `value` 内字段随所选自定义表头模板变化，上表为实测模板常见列；实际以导出文件表头为准。

### 数据样例

> 样例来自真实运行（`message=导出成功，共 742 条`，自定义 2026-07-01~2026-07-31，渠道*音+*讯）。`value` 内商家昵称等主体名称已脱敏；表头随模板变化，以下为实测首行完整字段。

```json
[
  {
    "id": 1,
    "value": {
      "日期": null,
      "商家昵称": "****",
      "渠道名称": "**,**",
      "账户id": null,
      "账户名称": null,
      "备注": null,
      "智能起量": "未开启",
      "出价托管": "未开启",
      "引流补贴(平台出资)": null,
      "消耗": "1550983.45",
      "有效gmv": "5593761.53",
      "今日gmv": "2976952.48",
      "有效gmv（本品）": "2601936.99",
      "加购量": "36642",
      "展示数": "34757399",
      "点击数": "274558",
      "转化数": "9728",
      "支付父订单量": "16441",
      "支付父订单量（本品）": "7648",
      "有效roi（本品）": "1.68",
      "有效roi": "3.61",
      "今日roi": "1.92"
    },
    "taskId": "dev****8f5",
    "bizDate": "20260824",
    "accountId": "1****2"
  }
]
```

---

---
title: 品牌新享-超级复购加速-数据导出
description: 采集阿里妈妈品牌新享数据中心「超级复购加速」模块的复购会员数据指标
entry: rpa.conn.alimm.ppxx.data.center.memacc.repurchase.index
badge:
  label: 已上线
  color: "#16A34A"
estimatedDuration:
  sec: 60
  description: 根据测试运行耗时估算，实际运行耗时将受到数据量、调度并发、网路波动等情况影响；高峰期或数据量较大时可能延长至约 10分钟。
---

| 属性             | 值                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------- |
| **连接器类型**   | `RPA 连接器`|
| **连接器名称**   | `ODS_品牌新享超级复购加速数据导出明细表(阿里妈妈RPA)`|
| **连接器代码**   | `rpa.conn.alimm.ppxx.data.center.memacc.repurchase.index`|
| **操作类型**     | `文件导出`|
| **目标网页**     | `https://ppxk.tmall.com/new/index.htm#!/data-center/memacc-repurchase/index`|
| **适用场景**     | 采集阿里妈妈品牌新享数据中心「超级复购加速」模块的复购会员数据指标|
| **数据表名**     | `ods_rpa_alimm_ppxx_data_center_memacc_repurchase_index_du`|
| **业务表名**     | `ODS_品牌新享超级复购加速数据导出明细表(阿里妈妈RPA)`|

### 目标页面

> **取数路径**：阿里妈妈—品牌新享—数据中心—超级复购加速
>
> **取数链接**：[https://ppxk.tmall.com/new/index.htm#!/data-center/memacc-repurchase/index](https://ppxk.tmall.com/new/index.htm#!/data-center/memacc-repurchase/index)

![阿里妈妈—品牌新享超级复购加速数据](../_public/images/alimm/data_center_memacc_repurchase_index_20260512.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `custom_start_date` | 起始日期 | `string` | 否 | 昨天 | 支持格式：`YYYYMMDD` / `YYYY-MM-DD`；须与 `custom_end_date` 同时提供或同时缺省 |
| `custom_end_date` | 结束日期 | `string` | 否 | 昨天 | 支持格式：`YYYYMMDD` / `YYYY-MM-DD`；须与 `custom_start_date` 同时提供或同时缺省；不能超过今天 |

### 入参样例

`YYYYMMDD`：

```json
{
    "custom_start_date": "20260501",
    "custom_end_date": "20260510"
}
```

`YYYY-MM-DD`：

```json
{
    "custom_start_date": "2026-05-01",
    "custom_end_date": "2026-05-10"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "品牌新享-超级复购加速-数据导出 - 查询入参",
  "description": "采集阿里妈妈品牌新享数据中心「超级复购加速」模块的复购会员数据指标",
  "type": "object",
  "properties": {
    "custom_start_date": {
      "type": "string",
      "description": "起始日期，支持 YYYYMMDD 或 YYYY-MM-DD；与结束日期同时缺省时默认昨天",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    },
    "custom_end_date": {
      "type": "string",
      "description": "结束日期，支持 YYYYMMDD 或 YYYY-MM-DD；不能早于起始日期或晚于今天；与起始日期同时缺省时默认昨天",
      "pattern": "^(?:\\d{8}|\\d{4}-\\d{2}-\\d{2})$"
    }
  },
  "required": [],
  "dependentRequired": {
    "custom_start_date": ["custom_end_date"],
    "custom_end_date": ["custom_start_date"]
  },
  "additionalProperties": false
}
```

### 数据字段

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `exposureMemberCnt` | 曝光会员数 | `number` | 否 | `XLSX.0.曝光会员数` | — |
| `visitMemberCnt` | 进店会员数 | `number` | 否 | `XLSX.0.进店会员数` | — |
| `cartMemberCnt` | 加购会员数 | `number` | 否 | `XLSX.0.加购会员数` | — |
| `favorMemberCnt` | 收藏会员数 | `number` | 否 | `XLSX.0.收藏会员数` | — |
| `payMemberCnt` | 支付会员数 | `number` | 否 | `XLSX.0.支付会员数` | — |
| `memberPayAmount` | 会员支付金额 | `number` | 否 | `XLSX.0.会员支付金额` | — |
| `estimatedBoostCost` | 预估会员加速费用 | `number` | 否 | `XLSX.0.预估会员加速费用` | — |
| `repurchase30dMemberCnt` | 30日复购会员数 | `number` | 否 | `XLSX.0.30日复购会员数` | — |
| `repurchase30dAmount` | 30日会员复购金额 | `number` | 否 | `XLSX.0.30日会员复购金额` | — |
| `repurchase30dRate` | 30日会员复购率 | `number` | 否 | `XLSX.0.30日会员复购率` | — |
| `statDate` | 日期 | `number` | 否 | `XLSX.0.日期` | — |
| `bizDate` | 业务日期 | `string` | 否 | 附加 |  |
| `accountId` | 授权 ID | `string` | 否 | 附加 |  |
| `taskId` | 任务 ID | `string` | 否 | 附加 |  |

### 数据样例

{/* TODO: 数据样例待补充 */}

---

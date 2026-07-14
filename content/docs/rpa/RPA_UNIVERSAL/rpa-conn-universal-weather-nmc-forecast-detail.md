---
title: 天气-中央气象台-城市7天预报
description: 数据源自中央气象台指定城市未来7天天气预报（昼夜天气、气温、风向风力与降水量）
entry: rpa.conn.universal.weather.nmc.forecast.detail
badge:
  label: 待上线
  color: "#EA580C"
estimatedDuration:
  sec: 60
module:
  group: weather
  icon:
    comp: NMC
---

:::warning[稳定性提示]
该连接器可能存在不稳定性；若对稳定性要求较高，建议优先使用的[中国气象局7天天气预报连接器](/docs/rpa/RPA_UNIVERSAL/rpa-conn-universal-weather-cma-forecast-detail)，或两个连接器互为 fallback 备份。
:::

| 属性             | 值                                                                 |
| ---------------- | ------------------------------------------------------------------ |
| **连接器类型**   | `RPA 连接器`                                                       |
| **连接器名称**   | `ODS_中央气象台7天天气预报明细表(通用RPA)`                         |
| **连接器代码**   | `rpa.conn.universal.weather.nmc.forecast.detail`                   |
| **操作类型**     | `页面解析`                                                         |
| **目标网页**     | `https://www.nmc.cn/publish/forecast/AZJ/yuhang.html`              |
| **适用场景**     | 数据源自中央气象台指定城市未来7天天气预报（昼夜天气、气温、风向风力与降水量） |
| **数据表名**     | `ods_rpa_universal_weather_nmc_forecast_detail_du`                 |
| **业务表名**     | `ODS_中央气象台7天天气预报明细表(通用RPA)`                         |

### 目标页面

> **取数路径**：中央气象台—天气预报—城市预报
>
> **取数链接**：[https://www.nmc.cn/publish/forecast/AZJ/yuhang.html](https://www.nmc.cn/publish/forecast/AZJ/yuhang.html)

![中央气象台—城市7天天气预报](../_public/images/universal/weather_nmc_forecast_detail_20260714.png)

### 业务入参

| 字段 | 中文释义 | 数据类型 | 必填 | 默认值 | 说明 |
| ---- | -------- | -------- | ---- | ------ | ---- |
| `province` | 省份 | `String` | 是 | — | 省份中文全称（如 `浙江省`、`内蒙古自治区`，详见下方 `可用省份清单` ） |
| `city` | 城市/区县 | `String` | 是 | — | 城市或区县中文站名；支持全名/主名/别名精确匹配（如 `余杭`、`定海`、`杭州`），不支持模糊包含 |

```json collapsed title="可用省份清单"
[
  "北京市",
  "天津市",
  "河北省",
  "山西省",
  "内蒙古自治区",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "上海市",
  "江苏省",
  "浙江省",
  "安徽省",
  "福建省",
  "江西省",
  "山东省",
  "河南省",
  "湖北省",
  "湖南省",
  "广东省",
  "广西壮族自治区",
  "海南省",
  "重庆市",
  "四川省",
  "贵州省",
  "云南省",
  "西藏自治区",
  "陕西省",
  "甘肃省",
  "青海省",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "香港特别行政区",
  "澳门特别行政区",
  "台湾省"
]
```
### 入参样例

浙江省余杭：

```json
{
  "province": "浙江省",
  "city": "余杭"
}
```

江苏省南京：

```json
{
  "province": "江苏省",
  "city": "南京"
}
```

### 入参校验

```json-schema collapsed
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "通用-中央气象台城市7天预报 - 查询入参",
  "description": "采集中央气象台指定城市未来7天天气预报（昼夜天气、气温、风向风力与降水量）",
  "type": "object",
  "properties": {
    "province": {
      "type": "string",
      "description": "省份中文全称，须为可用省份清单中的一项",
      "enum": [
        "北京市",
        "天津市",
        "河北省",
        "山西省",
        "内蒙古自治区",
        "辽宁省",
        "吉林省",
        "黑龙江省",
        "上海市",
        "江苏省",
        "浙江省",
        "安徽省",
        "福建省",
        "江西省",
        "山东省",
        "河南省",
        "湖北省",
        "湖南省",
        "广东省",
        "广西壮族自治区",
        "海南省",
        "重庆市",
        "四川省",
        "贵州省",
        "云南省",
        "西藏自治区",
        "陕西省",
        "甘肃省",
        "青海省",
        "宁夏回族自治区",
        "新疆维吾尔自治区",
        "香港特别行政区",
        "澳门特别行政区",
        "台湾省"
      ]
    },
    "city": {
      "type": "string",
      "description": "城市或区县中文站名；支持全名/主名/别名精确匹配，不支持模糊包含",
      "minLength": 1
    }
  },
  "required": ["province", "city"],
  "additionalProperties": false
}
```

### 数据字段

每条任务输出该城市 **7 天**预报行（`data[]`）。

:::field-tree
@define 天气
| `info` | 天气现象 | `String` | 否 | 页面解析 | `多云` |
| `img` | 天气图标码 | `String` | 否 | 页面解析 | `1` |
| `temperature` | 气温 | `String` | 否 | 页面解析 | `38` |

@define 风力
| `direct` | 风向 | `String` | 否 | 页面解析 | `西南风` |
| `power` | 风力 | `String` | 否 | 页面解析 | `微风` |

@define 昼夜预报
| `weather` @天气 | 天气 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `wind` @风力 | 风力 | `Dict` | 否 | 页面解析 | 见数据样例 |

| 字段 | 中文释义 | 数据类型 | 可为空 | 取数路径 | 示例 |
| ---- | -------- | -------- | ------ | -------- | ---- |
| `date` | 预报日期 | `String` | 否 | 页面解析 | `2026-07-14` |
| `pt` | 发布时间 | `String` | 否 | 页面解析 | `2026-07-14 12:00` |
| `day` @昼夜预报 | 白天预报 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `night` @昼夜预报 | 夜间预报 | `Dict` | 否 | 页面解析 | 见数据样例 |
| `precipitation` | 降水量 | `Number` | 否 | 页面解析 | `0.0` |
| `province` | 省份 | `String` | 否 | 附加 | `浙江省` |
| `city` | 城市/区县 | `String` | 否 | 附加 | `余杭` |
| `bizDate` | 业务日期 | `String` | 否 | 附加 | `20260714` |
| `accountId` | 授权 ID | `String` | 否 | 附加 | `101` |
:::

### 数据样例

浙江省余杭（`accountId=101`，`bizDate=20260714`）：

```json
[
  {
    "date": "2026-07-14",
    "pt": "2026-07-14 12:00",
    "day": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "38"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "night": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "29"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "precipitation": 0.0,
    "province": "浙江省",
    "city": "余杭",
    "bizDate": "20260714",
    "accountId": "101"
  },
  {
    "date": "2026-07-15",
    "pt": "2026-07-14 12:00",
    "day": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "38"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "night": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "28"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "precipitation": 0.0,
    "province": "浙江省",
    "city": "余杭",
    "bizDate": "20260714",
    "accountId": "101"
  },
  {
    "date": "2026-07-16",
    "pt": "2026-07-14 12:00",
    "day": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "38"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "night": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "28"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "precipitation": 0.0,
    "province": "浙江省",
    "city": "余杭",
    "bizDate": "20260714",
    "accountId": "101"
  },
  {
    "date": "2026-07-17",
    "pt": "2026-07-14 12:00",
    "day": {
      "weather": {
        "info": "小雨",
        "img": "7",
        "temperature": "37"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "night": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "28"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "precipitation": 0.2,
    "province": "浙江省",
    "city": "余杭",
    "bizDate": "20260714",
    "accountId": "101"
  },
  {
    "date": "2026-07-18",
    "pt": "2026-07-14 12:00",
    "day": {
      "weather": {
        "info": "小雨",
        "img": "7",
        "temperature": "34"
      },
      "wind": {
        "direct": "北风",
        "power": "微风"
      }
    },
    "night": {
      "weather": {
        "info": "中雨",
        "img": "8",
        "temperature": "24"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "precipitation": 17.1,
    "province": "浙江省",
    "city": "余杭",
    "bizDate": "20260714",
    "accountId": "101"
  },
  {
    "date": "2026-07-19",
    "pt": "2026-07-14 12:00",
    "day": {
      "weather": {
        "info": "小雨",
        "img": "7",
        "temperature": "31"
      },
      "wind": {
        "direct": "东风",
        "power": "微风"
      }
    },
    "night": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "25"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "precipitation": 8.8,
    "province": "浙江省",
    "city": "余杭",
    "bizDate": "20260714",
    "accountId": "101"
  },
  {
    "date": "2026-07-20",
    "pt": "2026-07-14 12:00",
    "day": {
      "weather": {
        "info": "小雨",
        "img": "7",
        "temperature": "33"
      },
      "wind": {
        "direct": "东南风",
        "power": "微风"
      }
    },
    "night": {
      "weather": {
        "info": "多云",
        "img": "1",
        "temperature": "26"
      },
      "wind": {
        "direct": "西南风",
        "power": "微风"
      }
    },
    "precipitation": 3.7,
    "province": "浙江省",
    "city": "余杭",
    "bizDate": "20260714",
    "accountId": "101"
  }
]
```

---

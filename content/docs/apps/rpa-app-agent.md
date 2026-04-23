---
title: rpa-app-agent
description: 基于 RPA Hero SDK 的 RPA 自动化应用（CLI）
---

## rpa-app-agent

基于 RPA Hero SDK 的 RPA 自动化应用（CLI 型，支持 `pip install` 快速部署）。

| 属性 | 值 |
|------|-----|
| PyPI / pip 包名 | `rpa-app-agent` |
| CLI 命令 | `rpa-app-agent`（由 `pyproject.toml` 中 `[tool.poetry.scripts]` 注册） |
| Python 要求 | `>=3.12,<4.0`（以包内 `pyproject.toml` 为准） |
| 私有 PyPI（与包内 Poetry 源一致） | `https://nexus.yucekj.cn/repository/pypi-hero/simple/` |

源码与更多命令说明见上游仓库 `apps/rpa-app-agent/README.md`。

### 在执行机上部署（推荐：`scripts/deploy`）

上游仓库的 `scripts/deploy/` 提供一键脚本：自动安装 Miniconda（若缺失）、创建 conda 环境、从私有源 `pip install` 应用包。部署前将 **`APP_PACKAGE`** 设为 **`rpa-app-agent`**，**`CONDA_ENV`** 建议与包名一致以便识别。

**Linux / macOS**（在 `scripts/deploy` 目录执行）：

```bash
cd scripts/deploy
APP_PACKAGE=rpa-app-agent CONDA_ENV=rpa-app-agent bash deploy.sh
```

可选：安装完成后立即非交互初始化实例目录：

```bash
APP_PACKAGE=rpa-app-agent CONDA_ENV=rpa-app-agent \
APP_INIT_DIR=/opt/rpa/instances/instance-a bash deploy.sh
```

**Windows PowerShell**：

```powershell
cd scripts\deploy
.\deploy.ps1 -AppPackage rpa-app-agent -CondaEnv rpa-app-agent
```

可选自动 init：

```powershell
.\deploy.ps1 -AppPackage rpa-app-agent -CondaEnv rpa-app-agent -AppInitDir "D:\rpa\instances\instance-a"
```

脚本支持的其它变量/参数（`PRIVATE_PYPI`、`PYTHON_VERSION` / `-PythonVer`、`INSTALL_POETRY` / `-InstallPoetry` 等）见上游仓库根目录 `README.md` 中「执行机部署」与 `scripts/deploy/DEPLOY.md`。

### 部署完成后

```bash
conda activate rpa-app-agent   # 与上面 CONDA_ENV 一致

# 若未使用 APP_INIT_DIR，先初始化实例目录（交互配置 .env / .run）
rpa-app-agent init ./instances/instance-a

# 启动
rpa-app-agent run
```

升级应用（保留已有 `.env`、`.run` 等）：

```bash
conda activate rpa-app-agent
pip install --upgrade --extra-index-url "https://nexus.yucekj.cn/repository/pypi-hero/simple/" rpa-app-agent
```

多实例、运维命令与常见问题见上游仓库 `scripts/deploy/DEPLOY.md`。

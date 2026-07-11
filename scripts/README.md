# Erii 安装脚本

## 快速安装

### Linux / macOS

通过 curl 一键安装：

```bash
curl -fsSL https://raw.githubusercontent.com/spcookie/erii-distribution/master/scripts/install.sh | bash
```

或者先下载再运行：

```bash
curl -fsSL -o install.sh https://raw.githubusercontent.com/spcookie/erii-distribution/master/scripts/install.sh
bash install.sh
```

### Windows

以管理员身份打开 PowerShell，执行：

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/spcookie/erii-distribution/master/scripts/install.ps1" -OutFile "install.ps1"
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

或者下载后双击运行 `install.bat`。

## 安装步骤

所有脚本会自动完成以下步骤：

1. **测速选择最快镜像**
   - 自动测试各镜像延迟，为 Node.js 下载和 npm 安装分别挑选最快的源
   - 对中国大陆用户友好，默认候选：淘宝 npmmirror、清华 TUNA、官方 nodejs.org

2. **下载安装 Node.js LTS** 和 npm（从上一步选出的镜像下载）

3. **全局安装 @spcookie/erii**（走测速选出的 npm registry）
   ```bash
   npm install -g @spcookie/erii
   ```

4. **自动运行配置向导**
   ```bash
   erii setup
   ```

## 镜像与网络

脚本默认会自动测速并选择最快的镜像，无需手动配置。如需强制指定，可用环境变量覆盖（跳过测速）：

| 环境变量                | 说明                       | 示例                                        |
|---------------------|--------------------------|-------------------------------------------|
| `ERII_NODE_MIRROR`  | Node.js 二进制下载源（dist 根目录） | `https://cdn.npmmirror.com/binaries/node` |
| `ERII_NPM_REGISTRY` | npm 包安装源                 | `https://registry.npmmirror.com`          |

Linux / macOS 示例：

```bash
ERII_NPM_REGISTRY=https://registry.npmmirror.com \
ERII_NODE_MIRROR=https://cdn.npmmirror.com/binaries/node \
bash install.sh
```

Windows PowerShell 示例：

```powershell
$env:ERII_NPM_REGISTRY = "https://registry.npmmirror.com"
$env:ERII_NODE_MIRROR  = "https://cdn.npmmirror.com/binaries/node"
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

## 启动服务

```bash
erii server
```

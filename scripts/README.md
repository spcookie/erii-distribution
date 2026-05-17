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

1. **安装 NVM**（Node 版本管理器）
    - Linux/macOS: [nvm-sh](https://github.com/nvm-sh/nvm)
    - Windows: [nvm-windows](https://github.com/coreybutler/nvm-windows)

2. **安装 Node.js LTS** 和 npm

3. **全局安装 @spcookie/erii**
   ```bash
   npm install -g @spcookie/erii
   ```

## 安装后

```bash
# 运行交互式配置向导
erii setup

# 启动服务
erii server
```

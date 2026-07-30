# tts-azure-foundry

基于 Azure AI Foundry Speech 和 Microsoft Speech SDK 的 Erii 文本转语音插件。插件会将合成的
24 kHz MP3 音频作为 OneBot 群语音发送，并提供 `sendAzureSpeech` LLM 工具。

## 配置

插件默认直接读取以下环境变量：

```bash
export AZURE_SPEECH_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
export AZURE_SPEECH_KEY="your-api-key"
```

也可以在 Erii 的插件配置目录中创建或修改 `tts-azure-foundry.json`：

```json
{
  "subscription-key": "${AZURE_SPEECH_KEY}",
  "endpoint": "${AZURE_SPEECH_ENDPOINT}",
  "voices": {
    "default": "zh-CN-Xiaoxiao:DragonHDFlashLatestNeural",
    "erii": "zh-CN-Yunxi:DragonHDFlashLatestNeural"
  }
}
```

- `endpoint`：Azure Speech 资源页面提供的 Endpoint，必须使用 HTTPS。
- `subscription-key`：Azure Speech 资源密钥。
- `voices.default`：没有对应 botKey 配置时使用的默认音色。
- `voices.<botKey>`：指定 bot 使用的音色。botKey 是 `onebot.bots` 下的配置键，例如上例中的 `erii`。

插件按照当前 botId 获取 botKey，优先使用 `voices.<botKey>`；对应配置不存在或为空时回退到
`voices.default`。如果默认项也缺失或为空，则使用内置音色
`zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`。

`AZURE_RESOURCE_ID` 不参与订阅密钥方式的语音合成，不需要提供给插件。

## 构建

在 `erii-plugins` 目录执行：

```bash
./gradlew :tts:tts-azure-foundry:pluginZip
```

产物位于 `tts/tts-azure-foundry/build/distributions/`。

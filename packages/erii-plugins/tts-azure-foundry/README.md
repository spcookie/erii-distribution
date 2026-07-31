# tts-azure-foundry

基于 Azure AI Foundry Speech 和 Microsoft Speech SDK 的 Erii SSML 语音合成插件。插件接收
SSML 内容片段，并将合成的
48 kHz、192 kbps MP3 音频作为 OneBot 群语音发送，并提供 `sendAzureSpeech` LLM 工具。

## SSML 输入

`sendAzureSpeech` 的 `ssml` 参数是放在 `<voice>` 内部的 SSML 内容片段。不要传入 `<speak>` 或
`<voice>`；插件会根据当前 bot 的 `voices.<botKey>` 配置生成这两个外层元素，从而确保音色由配置
固定。例如：

```xml
<mstts:express-as style="cheerful">
  <prosody rate="+10%" pitch="+5%" volume="+5%">
    你好，<break time="500ms"/>欢迎使用 Erii。
  </prosody>
</mstts:express-as>
```

工具说明会提示 LLM 根据表达需要使用 Azure Speech 支持的完整内容能力：

- 使用 `p`、`s` 定义段落和句子；
- 使用 `break`、`mstts:silence` 控制中断、暂停及静音；
- 使用 `bookmark`、`mstts:viseme` 添加书签和视素事件标记；
- 使用 `emphasis` 调整重音；
- 使用 `mstts:express-as` 调整风格、风格强度和角色；
- 使用 `prosody` 调整音调、音调轮廓、音域、语速和音量；
- 使用 `phoneme`、`say-as`、`sub` 控制发音和朗读方式；
- 使用 `lang`、`lexicon` 调整语言、口音和发音词典；
- 使用 `audio` 插入预录音频、音效或音符，并提供失败时的回退内容。

为了避免合成结果像在朗读书面材料，工具说明还要求 LLM 先把回答改写成自然口语：使用简洁短句和
日常措辞，移除 Markdown、链接及元话语，按语境选择单一且适度的风格，并克制使用停顿和韵律调整。

插件只固定外层结构和音色，不限制上述 `<voice>` 内部能力。它会拒绝包含 `<speak>` 或 `<voice>`
的输入，防止 SSML 覆盖配置音色。

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

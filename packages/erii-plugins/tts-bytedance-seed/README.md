# tts-bytedance-seed

火山引擎豆包语音合成 2.0 单向流式 SSML 插件。插件调用
`POST https://openspeech.bytedance.com/api/v3/tts/unidirectional`，逐帧读取 HTTP Chunked JSON 响应，
拼接 Base64 音频后作为 OneBot 群语音发送。

## 配置

在插件配置中填写 `api-key`，或设置环境变量 `BYTEDANCE_SEED_TTS_API_KEY`。

- `resource-id`：豆包语音合成模型 2.0 使用 `seed-tts-2.0`；声音复刻模型 2.0 使用 `seed-icl-2.0`。
- `model`：具体模型版本，默认 `seed-tts-2.0-standard`。
- `speakers.default`：默认音色 ID。可通过 `speakers.<botKey>` 给不同机器人配置不同音色。
- `audio.format`：`mp3`、`pcm`、`ogg_opus` 或 `wav`。流式合成推荐 `pcm`，直接发送 OneBot 群语音推荐 `mp3`。
- `audio.sample-rate`：支持 `8000`、`16000`、`22050`、`24000`、`32000`、`44100`、`48000`。
- `audio.bit-rate`：MP3 比特率，范围 `64000` 到 `160000`。

## SSML 输入

工具参数必须是完整的 Universal SSML 文档，且只能有一个 `<speak>` 根元素。插件会拒绝空内容、无效 XML、
超过 150 字符的 SSML，以及豆包语音合成模型 2.0/声音复刻模型 2.0 不支持的 `<break>`、
`<soundEvent>` 标签。

```xml
<speak>订单号是<say-as interpret-as="characters">A1024</say-as>。</speak>
```

可使用 `<phoneme>`、`<say-as>`、`<sub>`，以及 `<speak>` 的 `effect`、`bgm`、
`backgroundMusicVolume` 属性，但最终能力取决于配置音色。官方当前仅支持中文普通话音色调用 SSML；
方言、小语种、声音复刻音色以及名称含 `_saturn_bigtts` 的音色可能不支持 SSML。

## 流式响应

插件按换行分隔读取 JSON 帧。`code=0` 的帧携带 Base64 音频，`code=20000000` 或 `done=true`
表示流结束。若服务返回错误码、无效 JSON/Base64，或连接在结束帧前中断，插件会返回包含服务端
`X-Tt-Logid` 的错误信息。

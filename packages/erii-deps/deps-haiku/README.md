# @spcookie/deps-haiku

Erii 运行时 JVM 依赖的一部分（拆包分片：`haiku`）。

本包由 `erii-distribution/packages/erii-deps/split.mjs` 按文件名排序、均衡切分生成，
安装时通过 `postinstall.js` 将自身 `lib/` 软链到 `<root>/lib/deps/haiku`。

拆包目的：单包体积控制在 npmmirror 80MB 同步上限以内。

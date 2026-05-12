@rem
@rem Copyright 2015 the original author or authors.
@rem
@rem Licensed under the Apache License, Version 2.0 (the "License");
@rem you may not use this file except in compliance with the License.
@rem You may obtain a copy of the License at
@rem
@rem      https://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem
@rem SPDX-License-Identifier: Apache-2.0
@rem

@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem
@rem  erii-core startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
@rem This is normally unused
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%..

@rem Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi

@rem Add default JVM options here. You can also use JAVA_OPTS and ERII_CORE_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS=

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH. 1>&2
echo. 1>&2
echo Please set the JAVA_HOME variable in your environment to match the 1>&2
echo location of your Java installation. 1>&2

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo. 1>&2
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% 1>&2
echo. 1>&2
echo Please set the JAVA_HOME variable in your environment to match the 1>&2
echo location of your Java installation. 1>&2

goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\lib\erii-core-0.0.1.jar;%APP_HOME%\lib\erii-common-0.0.1.jar;%APP_HOME%\lib\erii-spi-0.0.1.jar;%APP_HOME%\lib\koin-logger-slf4j-4.1.2-Beta1.jar;%APP_HOME%\lib\exposed-dao-1.1.1.jar;%APP_HOME%\lib\exposed-migration-jdbc-1.1.1.jar;%APP_HOME%\lib\exposed-jdbc-1.1.1.jar;%APP_HOME%\lib\exposed-json-1.1.1.jar;%APP_HOME%\lib\exposed-kotlin-datetime-1.1.1.jar;%APP_HOME%\lib\exposed-migration-core-1.1.1.jar;%APP_HOME%\lib\exposed-core-1.1.1.jar;%APP_HOME%\lib\mapdb-3.0.9.jar;%APP_HOME%\lib\koog-agents-jvm-0.7.2.jar;%APP_HOME%\lib\jobrunr-8.3.1.jar;%APP_HOME%\lib\koin-ktor-jvm-4.1.2-Beta1.jar;%APP_HOME%\lib\koin-core-jvm-4.1.2-Beta1.jar;%APP_HOME%\lib\ktor-server-default-headers-jvm-3.3.2.jar;%APP_HOME%\lib\agents-mcp-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-llms-all-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-bedrock-client-jvm-0.7.2.jar;%APP_HOME%\lib\bedrockruntime-jvm-1.6.17.jar;%APP_HOME%\lib\aws-config-jvm-1.6.17.jar;%APP_HOME%\lib\aws-http-jvm-1.6.17.jar;%APP_HOME%\lib\aws-endpoint-jvm-1.6.17.jar;%APP_HOME%\lib\aws-core-jvm-1.6.17.jar;%APP_HOME%\lib\aws-json-protocols-jvm-1.6.2.jar;%APP_HOME%\lib\aws-xml-protocols-jvm-1.6.2.jar;%APP_HOME%\lib\aws-protocol-core-jvm-1.6.2.jar;%APP_HOME%\lib\aws-event-stream-jvm-1.6.2.jar;%APP_HOME%\lib\aws-signing-default-jvm-1.6.2.jar;%APP_HOME%\lib\http-auth-aws-jvm-1.6.2.jar;%APP_HOME%\lib\aws-signing-common-jvm-1.6.2.jar;%APP_HOME%\lib\http-client-engine-default-jvm-1.6.2.jar;%APP_HOME%\lib\http-client-engine-okhttp-jvm-1.6.2.jar;%APP_HOME%\lib\http-client-jvm-1.6.2.jar;%APP_HOME%\lib\smithy-client-jvm-1.6.2.jar;%APP_HOME%\lib\aws-credentials-jvm-1.6.2.jar;%APP_HOME%\lib\http-auth-jvm-1.6.2.jar;%APP_HOME%\lib\http-auth-api-jvm-1.6.2.jar;%APP_HOME%\lib\http-jvm-1.6.2.jar;%APP_HOME%\lib\identity-api-jvm-1.6.2.jar;%APP_HOME%\lib\telemetry-defaults-jvm-1.6.2.jar;%APP_HOME%\lib\logging-slf4j2-jvm-1.6.2.jar;%APP_HOME%\lib\telemetry-api-jvm-1.6.2.jar;%APP_HOME%\lib\serde-json-jvm-1.6.2.jar;%APP_HOME%\lib\serde-xml-jvm-1.6.2.jar;%APP_HOME%\lib\serde-form-url-jvm-1.6.2.jar;%APP_HOME%\lib\serde-jvm-1.6.2.jar;%APP_HOME%\lib\runtime-core-jvm-1.6.2.jar;%APP_HOME%\lib\kotlinx-datetime-jvm-0.7.1-0.6.x-compat.jar;%APP_HOME%\lib\ktor-server-content-negotiation-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-call-id-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-call-logging-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-resources-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-double-receive-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-auto-head-response-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-auth-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-partial-content-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-compression-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-netty-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-config-yaml-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-jte-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-sessions-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-conditional-headers-jvm-3.3.2.jar;%APP_HOME%\lib\agents-features-event-handler-jvm-0.7.2.jar;%APP_HOME%\lib\agents-features-longterm-memory-jvm-0.7.2.jar;%APP_HOME%\lib\agents-features-memory-jvm-0.7.2.jar;%APP_HOME%\lib\agents-features-opentelemetry-jvm-0.7.2.jar;%APP_HOME%\lib\agents-features-snapshot-jvm-0.7.2.jar;%APP_HOME%\lib\agents-features-tokenizer-jvm-0.7.2.jar;%APP_HOME%\lib\agents-features-trace-jvm-0.7.2.jar;%APP_HOME%\lib\agents-ext-jvm-0.7.2.jar;%APP_HOME%\lib\agents-core-jvm-0.7.2.jar;%APP_HOME%\lib\ktor-server-sse-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-cio-jvm-3.3.2.jar;%APP_HOME%\lib\kotlin-sdk-client-jvm-0.8.1.jar;%APP_HOME%\lib\kotlin-sdk-core-jvm-0.8.1.jar;%APP_HOME%\lib\ktor-server-websockets-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-server-core-jvm-3.3.2.jar;%APP_HOME%\lib\embeddings-llm-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-processor-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-cached-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-model-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-anthropic-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-google-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-ollama-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-dashscope-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-deepseek-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-mistralai-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-openai-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-openrouter-client-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-executor-openai-client-base-jvm-0.7.2.jar;%APP_HOME%\lib\ktor-serialization-kotlinx-json-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-client-cio-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-client-content-negotiation-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-client-logging-jvm-3.3.2.jar;%APP_HOME%\lib\http-client-ktor-jvm-0.7.2.jar;%APP_HOME%\lib\ktor-client-apache5-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-client-core-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-serialization-jackson-jvm-3.3.2.jar;%APP_HOME%\lib\overflow-core-1.0.8.jar;%APP_HOME%\lib\overflow-core-api-1.0.8.jar;%APP_HOME%\lib\mirai-core-api-jvm-2.16.0.jar;%APP_HOME%\lib\atomicfu-jvm-0.23.2.jar;%APP_HOME%\lib\arrow-core-jvm-2.0.0.jar;%APP_HOME%\lib\clikt-mordant-jvm.jar;%APP_HOME%\lib\prompt-executor-clients-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-structure-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-cache-files-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-cache-redis-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-cache-model-jvm-0.7.2.jar;%APP_HOME%\lib\agents-tools-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-markdown-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-tokenizer-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-xml-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-model-jvm-0.7.2.jar;%APP_HOME%\lib\utils-jvm-0.7.2.jar;%APP_HOME%\lib\agents-mcp-metadata-jvm-0.7.2.jar;%APP_HOME%\lib\prompt-llm-jvm-0.7.2.jar;%APP_HOME%\lib\agents-utils-jvm-0.7.2.jar;%APP_HOME%\lib\vector-storage-jvm-0.7.2.jar;%APP_HOME%\lib\embeddings-base-jvm-0.7.2.jar;%APP_HOME%\lib\http-client-core-jvm-0.7.2.jar;%APP_HOME%\lib\rag-base-jvm-0.7.2.jar;%APP_HOME%\lib\serialization-jackson-0.7.2.jar;%APP_HOME%\lib\serialization-core-jvm-0.7.2.jar;%APP_HOME%\lib\kotlinx-coroutines-jdk9-1.10.2.jar;%APP_HOME%\lib\kotlinx-coroutines-reactive-1.10.2.jar;%APP_HOME%\lib\kotlinx-coroutines-slf4j-1.10.2.jar;%APP_HOME%\lib\ktor-http-cio-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-serialization-kotlinx-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-websocket-serialization-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-serialization-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-websockets-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-resources-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-network-tls-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-http-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-events-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-sse-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-network-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-utils-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-call-id-jvm-3.3.2.jar;%APP_HOME%\lib\ktor-io-jvm-3.3.2.jar;%APP_HOME%\lib\okhttp-coroutines-5.3.2.jar;%APP_HOME%\lib\mirai-core-utils-jvm-2.16.0.jar;%APP_HOME%\lib\kotlinx-coroutines-core-jvm-1.10.2.jar;%APP_HOME%\lib\kotlin-jvm-blocking-bridge-runtime-jvm-3.0.0-180.1.jar;%APP_HOME%\lib\mirai-console-compiler-annotations-jvm-2.16.0.jar;%APP_HOME%\lib\kotlin-dynamic-delegation-jvm-0.4.0-180.1.jar;%APP_HOME%\lib\yamlkt-jvm-0.13.0.jar;%APP_HOME%\lib\kotlin-stdlib-jdk8-2.3.10.jar;%APP_HOME%\lib\jackson-databind-2.21.1.jar;%APP_HOME%\lib\jackson-core-2.21.1.jar;%APP_HOME%\lib\jackson-module-kotlin-2.21.1.jar;%APP_HOME%\lib\kotlinx-schema-generator-json-jvm-0.4.2.jar;%APP_HOME%\lib\kotlinx-schema-generator-core-jvm-0.4.2.jar;%APP_HOME%\lib\kotlin-reflect-2.3.10.jar;%APP_HOME%\lib\stately-concurrent-collections-jvm-2.1.0.jar;%APP_HOME%\lib\stately-concurrency-jvm-2.1.0.jar;%APP_HOME%\lib\kaml-jvm-0.79.0.jar;%APP_HOME%\lib\arrow-atomic-jvm-2.0.0.jar;%APP_HOME%\lib\arrow-annotations-jvm-2.0.0.jar;%APP_HOME%\lib\clikt-jvm.jar;%APP_HOME%\lib\mordant-omnibus-jvm.jar;%APP_HOME%\lib\kotlin-stdlib-jdk7-2.3.10.jar;%APP_HOME%\lib\kotlinx-serialization-protobuf-jvm-1.10.0.jar;%APP_HOME%\lib\kotlinx-serialization-json-io-jvm-1.10.0.jar;%APP_HOME%\lib\kotlinx-serialization-core-jvm-1.10.0.jar;%APP_HOME%\lib\kotlinx-schema-json-jvm-0.4.2.jar;%APP_HOME%\lib\kotlinx-serialization-json-jvm-1.10.0.jar;%APP_HOME%\lib\stately-strict-jvm-2.1.0.jar;%APP_HOME%\lib\snakeyaml-engine-kmp-jvm-3.1.1.jar;%APP_HOME%\lib\mordant-jvm-jna-jvm.jar;%APP_HOME%\lib\mordant-jvm-ffm-jvm.jar;%APP_HOME%\lib\mordant-jvm-graal-ffi-jvm.jar;%APP_HOME%\lib\mordant-jvm.jar;%APP_HOME%\lib\kotlinx-schema-annotations-jvm-0.4.2.jar;%APP_HOME%\lib\urlencoder-lib-jvm-1.6.0.jar;%APP_HOME%\lib\colormath-jvm.jar;%APP_HOME%\lib\kotlinx-io-core-jvm-0.8.2.jar;%APP_HOME%\lib\kotlinx-collections-immutable-jvm-0.4.0.jar;%APP_HOME%\lib\kotlin-logging-jvm-8.0.01.jar;%APP_HOME%\lib\opentelemetry-exporter-otlp-1.51.0.jar;%APP_HOME%\lib\opentelemetry-exporter-sender-okhttp-1.51.0.jar;%APP_HOME%\lib\okhttp-jvm-5.3.2.jar;%APP_HOME%\lib\okio-jvm-3.16.4.jar;%APP_HOME%\lib\kotlinx-io-bytestring-jvm-0.8.2.jar;%APP_HOME%\lib\kotlin-stdlib-2.3.10.jar;%APP_HOME%\lib\h2-2.4.240.jar;%APP_HOME%\lib\HikariCP-7.0.2.jar;%APP_HOME%\lib\logback-classic-1.5.20.jar;%APP_HOME%\lib\caffeine-3.1.8.jar;%APP_HOME%\lib\lucene-analyzers-common-8.11.4.jar;%APP_HOME%\lib\lucene-core-9.12.3.jar;%APP_HOME%\lib\playwright-1.57.0.jar;%APP_HOME%\lib\flexmark-html2md-converter-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-emoji-0.64.8.jar;%APP_HOME%\lib\flexmark-jira-converter-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-tables-0.64.8.jar;%APP_HOME%\lib\hutool-core-5.8.26.jar;%APP_HOME%\lib\lunar-1.7.5.jar;%APP_HOME%\lib\config-1.4.5.jar;%APP_HOME%\lib\snakeyaml-2.2.jar;%APP_HOME%\lib\pf4j-3.15.0.jar;%APP_HOME%\lib\flexmark-ext-gfm-strikethrough-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-wikilink-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-ins-0.64.8.jar;%APP_HOME%\lib\flexmark-ext-superscript-0.64.8.jar;%APP_HOME%\lib\flexmark-util-0.64.8.jar;%APP_HOME%\lib\flexmark-0.64.8.jar;%APP_HOME%\lib\flexmark-util-format-0.64.8.jar;%APP_HOME%\lib\flexmark-util-ast-0.64.8.jar;%APP_HOME%\lib\flexmark-util-builder-0.64.8.jar;%APP_HOME%\lib\flexmark-util-dependency-0.64.8.jar;%APP_HOME%\lib\flexmark-util-html-0.64.8.jar;%APP_HOME%\lib\flexmark-util-options-0.64.8.jar;%APP_HOME%\lib\flexmark-util-sequence-0.64.8.jar;%APP_HOME%\lib\flexmark-util-collection-0.64.8.jar;%APP_HOME%\lib\flexmark-util-data-0.64.8.jar;%APP_HOME%\lib\flexmark-util-misc-0.64.8.jar;%APP_HOME%\lib\flexmark-util-visitor-0.64.8.jar;%APP_HOME%\lib\annotations-26.0.2-1.jar;%APP_HOME%\lib\gson-2.13.2.jar;%APP_HOME%\lib\Java-WebSocket-1.5.7.jar;%APP_HOME%\lib\httpclient5-5.5.1.jar;%APP_HOME%\lib\lettuce-core-7.2.1.RELEASE.jar;%APP_HOME%\lib\redis-authx-core-0.1.1-beta2.jar;%APP_HOME%\lib\slf4j-api-2.0.17.jar;%APP_HOME%\lib\netty-codec-http2-4.2.7.Final.jar;%APP_HOME%\lib\netty-codec-http-4.2.7.Final.jar;%APP_HOME%\lib\netty-codec-socks-4.1.90.Final.jar;%APP_HOME%\lib\netty-codec-4.1.90.Final.jar;%APP_HOME%\lib\netty-transport-native-kqueue-4.2.7.Final.jar;%APP_HOME%\lib\netty-transport-native-epoll-4.2.7.Final.jar;%APP_HOME%\lib\netty-resolver-dns-4.2.5.Final.jar;%APP_HOME%\lib\netty-handler-4.2.7.Final.jar;%APP_HOME%\lib\netty-codec-compression-4.2.7.Final.jar;%APP_HOME%\lib\netty-codec-dns-4.2.5.Final.jar;%APP_HOME%\lib\netty-codec-base-4.2.7.Final.jar;%APP_HOME%\lib\netty-transport-classes-kqueue-4.2.7.Final.jar;%APP_HOME%\lib\netty-transport-classes-epoll-4.2.7.Final.jar;%APP_HOME%\lib\netty-transport-native-unix-common-4.2.7.Final.jar;%APP_HOME%\lib\netty-transport-4.2.7.Final.jar;%APP_HOME%\lib\asm-9.9.jar;%APP_HOME%\lib\logback-core-1.5.20.jar;%APP_HOME%\lib\eclipse-collections-forkjoin-10.4.0.jar;%APP_HOME%\lib\eclipse-collections-10.4.0.jar;%APP_HOME%\lib\eclipse-collections-api-10.4.0.jar;%APP_HOME%\lib\guava-33.6.0-jre.jar;%APP_HOME%\lib\lz4-1.3.0.jar;%APP_HOME%\lib\elsa-3.0.0-M5.jar;%APP_HOME%\lib\checker-qual-3.37.0.jar;%APP_HOME%\lib\error_prone_annotations-2.47.0.jar;%APP_HOME%\lib\opentest4j-1.3.0.jar;%APP_HOME%\lib\driver-bundle-1.57.0.jar;%APP_HOME%\lib\driver-1.57.0.jar;%APP_HOME%\lib\jsoup-1.15.4.jar;%APP_HOME%\lib\java-semver-0.10.2.jar;%APP_HOME%\lib\netty-buffer-4.2.7.Final.jar;%APP_HOME%\lib\netty-resolver-4.2.7.Final.jar;%APP_HOME%\lib\netty-common-4.2.7.Final.jar;%APP_HOME%\lib\jansi-2.4.2.jar;%APP_HOME%\lib\alpn-api-1.1.3.v20160715.jar;%APP_HOME%\lib\jte-3.2.1.jar;%APP_HOME%\lib\failureaccess-1.0.3.jar;%APP_HOME%\lib\listenablefuture-9999.0-empty-to-avoid-conflict-with-guava.jar;%APP_HOME%\lib\jspecify-1.0.0.jar;%APP_HOME%\lib\j2objc-annotations-3.1.jar;%APP_HOME%\lib\animal-sniffer-annotations-1.24.jar;%APP_HOME%\lib\log4j-api-2.19.0.jar;%APP_HOME%\lib\jte-extension-api-3.2.1.jar;%APP_HOME%\lib\jte-runtime-3.2.1.jar;%APP_HOME%\lib\jackson-annotations-2.21.jar;%APP_HOME%\lib\opentelemetry-exporter-logging-1.51.0.jar;%APP_HOME%\lib\opentelemetry-exporter-otlp-common-1.51.0.jar;%APP_HOME%\lib\opentelemetry-exporter-common-1.51.0.jar;%APP_HOME%\lib\opentelemetry-sdk-extension-autoconfigure-spi-1.51.0.jar;%APP_HOME%\lib\opentelemetry-sdk-1.51.0.jar;%APP_HOME%\lib\opentelemetry-sdk-trace-1.51.0.jar;%APP_HOME%\lib\opentelemetry-sdk-metrics-1.51.0.jar;%APP_HOME%\lib\opentelemetry-sdk-logs-1.51.0.jar;%APP_HOME%\lib\opentelemetry-sdk-common-1.51.0.jar;%APP_HOME%\lib\opentelemetry-api-1.51.0.jar;%APP_HOME%\lib\opentelemetry-context-1.51.0.jar;%APP_HOME%\lib\reactor-core-3.6.6.jar;%APP_HOME%\lib\httpcore5-h2-5.3.6.jar;%APP_HOME%\lib\httpcore5-5.3.6.jar;%APP_HOME%\lib\reactive-streams-1.0.4.jar;%APP_HOME%\lib\jna-5.14.0.jar


@rem Execute erii-core
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %ERII_CORE_OPTS%  -classpath "%CLASSPATH%" io.ktor.server.netty.EngineMain %*

:end
@rem End local scope for the variables with windows NT shell
if %ERRORLEVEL% equ 0 goto mainEnd

:fail
rem Set variable ERII_CORE_EXIT_CONSOLE if you need the _script_ return code instead of
rem the _cmd.exe /c_ return code!
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% equ 0 set EXIT_CODE=1
if not ""=="%ERII_CORE_EXIT_CONSOLE%" exit %EXIT_CODE%
exit /b %EXIT_CODE%

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega

# RLE Master — 字模压缩与解码生成工具

一个基于 React + Vite 的前端工具，用于：
- 解析 C 语言的字模数组（支持 1D/2D）
- 根据模式对数据压缩并生成对应的 C 解码器代码
- 输出压缩数据数组、偏移表与完整解码器，带语法高亮与复制


## 特性
- 支持四种编码/解码模式：
  - `RLE 8:8` — 格式 `[Count(8bit)] [Value(8bit)]`
  - `RLE 4:4` — 格式 `[Count(4bit) | Value(4bit)]`，长度字段存储为 `实际长度-1`，映射 1..16
  - `Bit Stream 8` — 1bpp 位流，每字节一个计数，`count<255` 时翻转颜色
  - `Bit Stream 4` — 1bpp 紧凑位流，每字节两个 4bit 计数，`count<15` 时翻转颜色
- 输入支持 `1/2/4/8 bpp`，会按模式自动解包并量化到目标范围
- 自动生成：
  - `compressed_data[]` 压缩数组
  - `data_offsets[]` 偏移表（当输入为多个字模）
  - `decoder.c` 片段（含函数级注释与分区标题）
- 语法高亮与复制按钮，查看与导出更加直观
- 提供“你的画点函数”集成注释位，方便快速适配到项目

## 界面与交互
- 左侧：编码模式与源 BPP 设置
- 右侧：
  - 输入区：粘贴 C 语言数组
  - 输出区 Tab：`压缩数据` / `偏移表` / `解码函数`


## 快速开始（Windows 10）
- 安装依赖：
  - `npm install`
- 开发运行：
  - `npm run dev`，打开 `http://localhost:5173/`（端口占用时可能为 5174）
- 生产构建与本地预览：
  - `npm run build`
  - `npm run preview`，打开 `http://localhost:4173/`

## 使用流程
- 在“输入 C 代码”区域粘贴字模数组（支持 1D 或 2D，例如 `const unsigned char icons[][16] = {...};`）
- 选择编码模式与源数据位宽（BPP）
- 点击“生成”
- 在输出面板查看：
  - `压缩数据`：生成的 `compressed_data[]`
  - `偏移表`：多字模时的 `data_offsets[]`
  - `解码函数`：完整 C 代码片段（含注释、分段标题与示例用法）

## 生成的 C 解码器结构
生成器按所选模式拼接以下分区：
- 字符索引查询（二分查找）：`get_glyph_index(...)`
- 偏移访问（可选）：`get_glyph_data(...)`
- 解码函数（按模式生成）：
  - `void decode_rle_88(const unsigned char* src, unsigned char* dst, int max_dst_len)`
  - `void decode_rle_44(const unsigned char* src, unsigned char* dst, int max_dst_len)`
  - `void decode_bit_stream_8(const unsigned char* src, unsigned char* dst, int max_dst_bytes)`
  - `void decode_bit_stream_4(const unsigned char* src, unsigned char* dst, int max_dst_bytes)`
- 使用示例（含“你的画点函数”占位）：
  - `void YOUR_PLOT_FUNC(int x, int y, int val);`
  - 在循环中示例调用 `// PLOT_PIXEL(x++, y, val);`

## 与项目集成
- 若你的渲染是逐像素输出而非写缓冲区，可在解码函数的内层循环调用你的绘制 API：
  - `// 你的画点函数: PLOT_PIXEL(x++, y, val);`
  - 对 1bpp 位流：`// 你的画点函数: PLOT_PIXEL(x++, y, current_val);`
- 多字模时：
  - 通过 `get_glyph_index(code, charset, len)` 获取索引
  - 通过 `get_glyph_data(index)` 获取压缩流起始位置

## 技术栈
- `React` + `Vite` + `TypeScript`
- 语法高亮：`prism-react-renderer`
- GitHub 角标：`@uiw/react-github-corners`


## 贡献
- 欢迎提交 Issue 与 PR 来完善压缩策略与解码生成逻辑。
- 可讨论新增模式（如 PackBits、自定义位流）或针对嵌入式平台的优化。

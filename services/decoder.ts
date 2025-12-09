import { EncodingMode } from '../types';

const headerBlock = (): string => [
  '/*',
  ' * RLE 解码工具函数库',
  ` * 生成时间: ${new Date().toLocaleDateString()}`,
  ' * 生成工具: RLE Master',
  ' *',
  ' * 移植说明:',
  ' * 1. 建议包含 <stdint.h> 并使用 uint8_t, uint32_t 等类型以确保跨平台一致性。',
  ' * 2. compressed_data 和 data_offsets 数组通常放在 flash/rodata 区域。',
  " * 3. 解码函数中的 'max_dst_len' 用于防止缓冲区溢出，建议必须传递正确的缓冲区大小。",
  ' */',
  '',
  '// 类型定义 (如果未包含 stdint.h)',
  '// typedef unsigned char  uint8_t;',
  '// typedef unsigned short uint16_t;',
  '// typedef unsigned int   uint32_t;',
  ''
].join('\n');

const binarySearchBlock = (): string => [
  '/* =============================',
  ' * 字符索引查询 (二分查找)',
  ' * ============================= */',
  '/**',
  ' * @brief 通过二分法查找字符索引',
  ' *',
  ' * 这是一个通用的二分查找实现，用于从排序好的字符集中找到对应的字模索引。',
  ' *',
  ' * @param code    目标字符编码 (如 Unicode/ASCII 值)',
  ' * @param charset 已排序的字符集数组指针 (const unsigned short*)',
  ' * @param len     字符集数组的长度',
  ' * @return int    返回字符在数组中的索引，如果未找到则返回 -1',
  ' */',
  'int get_glyph_index(unsigned short code, const unsigned short* charset, int len) {',
  '    int left = 0;',
  '    int right = len - 1;',
  '    while (left <= right) {',
  '        int mid = left + (right - left) / 2;',
  '        if (charset[mid] == code) return mid;',
  '        if (charset[mid] < code) left = mid + 1; else right = mid - 1;',
  '    }',
  '    return -1;',
  '}',
  ''
].join('\n');

const offsetsBlock = (): string => [
  '/* =============================',
  ' * 偏移访问 (可选)',
  ' * ============================= */',
  '// 外部引用声明 (根据您的项目结构，可能需要修改此处)',
  'extern const unsigned char compressed_data[];',
  'extern const unsigned int data_offsets[];',
  '/**',
  ' * @brief 获取压缩数据的起始地址',
  ' * @param index 字模索引 (通常由 get_glyph_index 返回)',
  ' * @return const unsigned char* 指向压缩数据流的指针',
  ' */',
  'const unsigned char* get_glyph_data(int index) {',
  '    if (index < 0) return 0; // 索引无效',
  '    // 如果数据分片存储，请在此处修改寻址逻辑',
  '    return &compressed_data[data_offsets[index]];',
  '}',
  ''
].join('\n');

const rle88Block = (): string => [
  '/* =============================',
  ' * RLE 8:8 解码器',
  ' * ============================= */',
  '/**',
  ' * @brief RLE 8:8 解码器',
  ' * 格式: [Count (8bit)] [Value (8bit)]',
  ' * @param src         输入压缩数据指针',
  ' * @param dst         输出像素缓冲区指针',
  ' * @param max_dst_len 输出缓冲区的最大容量 (字节数)',
  ' */',
  'void decode_rle_88(const unsigned char* src, unsigned char* dst, int max_dst_len) {',
  '    int src_idx = 0;',
  '    int dst_idx = 0;',
  '    while (dst_idx < max_dst_len) {',
  '        unsigned char count = src[src_idx++];',
  '        unsigned char val   = src[src_idx++];',
  '        for (int i = 0; i < count; i++) {',
  '            if (dst_idx >= max_dst_len) break;',
  '            dst[dst_idx++] = val;',
  '            // 你的画点函数: 如果不是写入缓冲区而是直接绘制, 在此调用',
  '            // PLOT_PIXEL(x++, y, val);',
  '        }',
  '    }',
  '}',
  ''
].join('\n');

const rle44Block = (): string => [
  '/* =============================',
  ' * RLE 4:4 解码器',
  ' * ============================= */',
  '/**',
  ' * @brief RLE 4:4 解码器 (紧凑型优化版)',
  ' * 格式: [Count (4bit) | Value (4bit)] 打包在一个字节中',
  ' * 优化: 长度字段 = 实际长度 - 1 (映射为 1..16)',
  ' * 注意: 解码输出为 1字节/像素 (值范围 0-15)',
  ' */',
  'void decode_rle_44(const unsigned char* src, unsigned char* dst, int max_dst_len) {',
  '    int src_idx = 0;',
  '    int dst_idx = 0;',
  '    while (dst_idx < max_dst_len) {',
  '        unsigned char byte  = src[src_idx++];',
  '        unsigned char count = ((byte >> 4) & 0x0F) + 1;',
  '        unsigned char val   = byte & 0x0F;',
  '        for (int i = 0; i < count; i++) {',
  '            if (dst_idx >= max_dst_len) break;',
  '            dst[dst_idx++] = val;',
  '            // 你的画点函数: PLOT_PIXEL(x++, y, val);',
  '        }',
  '    }',
  '}',
  ''
].join('\n');

const bit8Block = (): string => [
  '/* =============================',
  ' * Bit Stream 8 解码器 (1bpp)',
  ' * ============================= */',
  '/**',
  ' * @brief Bit Stream 8 解码器 (交替位流)',
  ' * 计数值为 0..255, 流从 0 开始, 当 count<255 时翻转颜色',
  ' * 输出为打包 1bpp (8 像素/字节, MSB 优先)',
  ' */',
  'void decode_bit_stream_8(const unsigned char* src, unsigned char* dst, int max_dst_bytes) {',
  '    int src_idx = 0;',
  '    int dst_byte_idx = 0;',
  '    int dst_bit_pos  = 7;',
  '    unsigned char current_byte = 0;',
  '    unsigned char current_val  = 0;',
  '    while (dst_byte_idx < max_dst_bytes) {',
  '        unsigned char count = src[src_idx++];',
  '        for (int i = 0; i < count; i++) {',
  '            if (current_val) current_byte |= (1 << dst_bit_pos);',
  '            // 你的画点函数 (若按逐像素输出): PLOT_PIXEL(x++, y, current_val);',
  '            dst_bit_pos--;',
  '            if (dst_bit_pos < 0) {',
  '                dst[dst_byte_idx++] = current_byte;',
  '                current_byte = 0;',
  '                dst_bit_pos  = 7;',
  '                if (dst_byte_idx >= max_dst_bytes) return;',
  '            }',
  '        }',
  '        if (count < 255) current_val = !current_val;',
  '    }',
  '}',
  ''
].join('\n');

const bit4Block = (): string => [
  '/* =============================',
  ' * Bit Stream 4 解码器 (1bpp)',
  ' * ============================= */',
  '/**',
  ' * @brief Bit Stream 4 解码器 (紧凑型交替位流)',
  ' * 每字节两个 4bit 计数, 计数<15 时翻转颜色',
  ' */',
  'void decode_bit_stream_4(const unsigned char* src, unsigned char* dst, int max_dst_bytes) {',
  '    int src_idx = 0;',
  '    int dst_byte_idx = 0;',
  '    int dst_bit_pos  = 7;',
  '    unsigned char current_byte = 0;',
  '    unsigned char current_val  = 0;',
  '    while (dst_byte_idx < max_dst_bytes) {',
  '        unsigned char byte = src[src_idx++];',
  '        unsigned char counts[2];',
  '        counts[0] = (byte >> 4) & 0x0F;',
  '        counts[1] = byte & 0x0F;',
  '        for (int k = 0; k < 2; k++) {',
  '            unsigned char count = counts[k];',
  '            for (int i = 0; i < count; i++) {',
  '                if (current_val) current_byte |= (1 << dst_bit_pos);',
  '                // 你的画点函数: PLOT_PIXEL(x++, y, current_val);',
  '                dst_bit_pos--;',
  '                if (dst_bit_pos < 0) {',
  '                    dst[dst_byte_idx++] = current_byte;',
  '                    current_byte = 0;',
  '                    dst_bit_pos  = 7;',
  '                    if (dst_byte_idx >= max_dst_bytes) return;',
  '                }',
  '            }',
  '            if (count < 15) current_val = !current_val;',
  '        }',
  '    }',
  '}',
  ''
].join('\n');

const usageBlock = (hasOffsets: boolean, mode: EncodingMode): string => [
  '/* =============================',
  ' * 使用示例 (集成你的画点函数)',
  ' * ============================= */',
  '/*',
  'void YOUR_PLOT_FUNC(int x, int y, int val); // 你的画点函数',
  'void example_render_glyph(unsigned short code, int x0, int y0, int width, int height) {',
  '    // 查索引',
  '    // const unsigned short* charset = ...; const int charset_len = ...;',
  '    // int idx = get_glyph_index(code, charset, charset_len);',
  hasOffsets ? '    const unsigned char* src = get_glyph_data(idx);' : '    const unsigned char* src = compressed_data; // 若未使用偏移表',
  '    // 解码到临时缓冲区或逐像素输出',
  '    // unsigned char* dst = frameBuffer + y0 * STRIDE + x0; // 示例',
  mode === EncodingMode.RLE_8_8
    ? '    // decode_rle_88(src, dst, width * height);'
    : mode === EncodingMode.RLE_4_4
    ? '    // decode_rle_44(src, dst, width * height);'
    : mode === EncodingMode.BIT_Stream_8
    ? '    // decode_bit_stream_8(src, dst, (width * height + 7) / 8);'
    : '    // decode_bit_stream_4(src, dst, (width * height + 7) / 8);',
  '    // 或者在解码循环中直接调用 YOUR_PLOT_FUNC(x, y, val)',
  '}',
  '*/',
  ''
].join('\n');

export const generateDecoder = (mode: EncodingMode, hasOffsets: boolean): string => {
  const blocks: string[] = [];
  blocks.push(headerBlock());
  blocks.push(binarySearchBlock());
  if (hasOffsets) blocks.push(offsetsBlock());
  switch (mode) {
    case EncodingMode.RLE_8_8: blocks.push(rle88Block()); break;
    case EncodingMode.RLE_4_4: blocks.push(rle44Block()); break;
    case EncodingMode.BIT_Stream_8: blocks.push(bit8Block()); break;
    case EncodingMode.BIT_Stream_4: blocks.push(bit4Block()); break;
  }
  blocks.push(usageBlock(hasOffsets, mode));
  return blocks.join('\n');
};


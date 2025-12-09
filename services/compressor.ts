import { DataWidth, EncodingMode, CompressResult } from '../types';

/**
 * Parses C code. 
 * Detects if it's a 2D array (list of lists) or 1D array.
 * Returns an array of number arrays (chunks).
 */
export const parseCArray = (code: string): number[][] => {
  // 1. Remove comments
  const noComments = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 2. Check for nested braces indicating 2D array
  // We look for patterns like { 0x01... }, { 0x02... }
  const innerBlockRegex = /\{([^{}]*)\}/g;
  let match;
  const chunks: number[][] = [];
  
  // Try to find inner blocks first
  while ((match = innerBlockRegex.exec(noComments)) !== null) {
    const hexRegex = /0x[0-9a-f]+/gi;
    const hexes = match[1].match(hexRegex);
    if (hexes && hexes.length > 0) {
      chunks.push(hexes.map(h => parseInt(h, 16)));
    }
  }

  // If no inner chunks found (or just one big block), treat as 1D array
  if (chunks.length === 0) {
    const hexRegex = /0x[0-9a-f]+/gi;
    const allHexes = noComments.match(hexRegex);
    if (allHexes && allHexes.length > 0) {
      chunks.push(allHexes.map(h => parseInt(h, 16)));
    }
  }

  return chunks;
};

/**
 * Unpacks raw bytes into a stream of individual pixel values based on BPP.
 */
const unpackPixels = (data: number[], bpp: DataWidth): number[] => {
  const pixels: number[] = [];
  
  if (bpp === DataWidth.BPP_8) {
    return data;
  }
  
  if (bpp === DataWidth.BPP_4) {
    for (const b of data) {
      pixels.push((b >> 4) & 0x0F); 
      pixels.push(b & 0x0F);        
    }
    return pixels;
  }
  
  if (bpp === DataWidth.BPP_2) {
    for (const b of data) {
      pixels.push((b >> 6) & 0x03);
      pixels.push((b >> 4) & 0x03);
      pixels.push((b >> 2) & 0x03);
      pixels.push(b & 0x03);
    }
    return pixels;
  }
  
  if (bpp === DataWidth.BPP_1) {
    for (const b of data) {
      for (let i = 7; i >= 0; i--) {
        pixels.push((b >> i) & 1);
      }
    }
    return pixels;
  }
  
  return data;
};

const encodeRLEPair = (pixels: number[], maxCount: number, pack4: boolean): number[] => {
  const result: number[] = [];
  let i = 0;
  while (i < pixels.length) {
    let runLength = 1;
    const val = pixels[i];
    while (i + runLength < pixels.length && pixels[i + runLength] === val && runLength < maxCount) {
      runLength++;
    }
    
    if (pack4) {
      // 4-bit Len, 4-bit Val
      // 优化: 长度字段存储 (实际长度 - 1)。将 1-16 映射到 0-15。
      // 这样 0x0N 代表长度1，0xFN 代表长度16，充分利用了 0 的空间。
      const storedLen = runLength - 1;
      result.push((storedLen << 4) | (val & 0x0F));
    } else {
      // 8-bit Len, 8-bit Val
      result.push(runLength);
      result.push(val);
    }
    i += runLength;
  }
  return result;
};

const encodeBitStream = (pixels: number[], mode: EncodingMode): number[] => {
  // Threshold to binary (0 vs !0)
  const binaryPixels = pixels.map(p => p > 0 ? 1 : 0);
  
  const maxRun = mode === EncodingMode.BIT_Stream_4 ? 15 : 255;
  
  let i = 0;
  let currentTargetBit = 0; // Stream starts assuming 0
  const counts: number[] = [];

  while (i < binaryPixels.length) {
    let runLength = 0;
    
    // Count runs of the current target bit
    // NEW LOGIC: If runLength hits maxRun, we stop, output maxRun, BUT DO NOT switch currentTargetBit.
    // We only switch currentTargetBit if runLength < maxRun.
    
    while(i < binaryPixels.length && binaryPixels[i] === currentTargetBit) {
      if (runLength === maxRun) break; // Reached max capacity for this chunk
      runLength++;
      i++;
    }
    
    counts.push(runLength);

    // Logic for switching state:
    // If we stopped because we hit maxRun, we continue counting the SAME bit type in the next iteration.
    // If we stopped because the bit changed (runLength < maxRun), we toggle target.
    // Edge case: If exact multiple of maxRun, next run will be 0.
    
    if (runLength < maxRun) {
      currentTargetBit = 1 - currentTargetBit; // Toggle
    } else {
      // runLength == maxRun. Do NOT toggle. Next count will be for the same bit type.
    }
  }

  // Pack results
  const result: number[] = [];
  if (mode === EncodingMode.BIT_Stream_8) {
    result.push(...counts);
  } else {
    // Pack 2 counts per byte for 4-bit mode
    for (let k = 0; k < counts.length; k += 2) {
      const count1 = counts[k];
      const count2 = (k + 1 < counts.length) ? counts[k + 1] : 0; 
      result.push((count1 << 4) | count2);
    }
  }
  return result;
};

export const compressData = (chunks: number[][], mode: EncodingMode, sourceBPP: DataWidth): CompressResult => {
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  const allCompressedBytes: number[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  // Process each chunk (glyph/row)
  for (const rawData of chunks) {
    totalOriginalSize += rawData.length;
    offsets.push(currentOffset);

    // 1. Unpack
    let pixels = unpackPixels(rawData, sourceBPP);

    // 2. Transform/Quantize
    if (mode === EncodingMode.RLE_4_4) {
      if (sourceBPP === DataWidth.BPP_8) {
        pixels = pixels.map(p => (p >> 4) & 0x0F);
      } else {
        pixels = pixels.map(p => p & 0x0F);
      }
    }

    // 3. Compress
    let compressedChunk: number[] = [];
    
    if (mode === EncodingMode.RLE_8_8) {
      compressedChunk = encodeRLEPair(pixels, 255, false);
    } 
    else if (mode === EncodingMode.RLE_4_4) {
      // 优化: 最大长度改为 16，因为我们现在用 0-15 表示 1-16
      compressedChunk = encodeRLEPair(pixels, 16, true);
    }
    else if (mode === EncodingMode.BIT_Stream_8 || mode === EncodingMode.BIT_Stream_4) {
      compressedChunk = encodeBitStream(pixels, mode);
    }

    allCompressedBytes.push(...compressedChunk);
    currentOffset += compressedChunk.length;
  }
  
  totalCompressedSize = allCompressedBytes.length;

  // --- Output Formatting ---

  const hexOutput = allCompressedBytes.map(b => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(', ');
  
  let cArrayStr = `// 编码方式: ${mode}, 源分辨率: ${sourceBPP} BPP\n`;
  cArrayStr += `const unsigned char compressed_data[${totalCompressedSize}] = {\n    `;
  for(let k=0; k<allCompressedBytes.length; k++) {
    cArrayStr += `0x${allCompressedBytes[k].toString(16).toUpperCase().padStart(2, '0')}`;
    if (k < allCompressedBytes.length - 1) cArrayStr += ', ';
    if ((k + 1) % 12 === 0) cArrayStr += '\n    ';
  }
  cArrayStr += '\n};';

  let offsetTableStr = '';
  if (chunks.length > 1) {
    offsetTableStr = `// ${chunks.length} 个字模的偏移表 (索引 -> 起始位置)\n`;
    offsetTableStr += `const unsigned int data_offsets[${offsets.length}] = {\n    `;
    for(let k=0; k<offsets.length; k++) {
      offsetTableStr += `${offsets[k]}`;
      if (k < offsets.length - 1) offsetTableStr += ', ';
      if ((k + 1) % 12 === 0) offsetTableStr += '\n    ';
    }
    offsetTableStr += '\n};';
  } else {
    offsetTableStr = "// 只有一个项目，未生成偏移表。";
  }

  const ratio = totalOriginalSize > 0 ? (1 - (totalCompressedSize / totalOriginalSize)) * 100 : 0;

  return {
    originalSize: totalOriginalSize,
    compressedSize: totalCompressedSize,
    ratio,
    hexOutput,
    cArrayOutput: cArrayStr,
    offsetTableOutput: offsetTableStr,
    decoderCode: generateDecoder(mode, chunks.length > 1)
  };
};

const generateDecoder = (mode: EncodingMode, hasOffsets: boolean): string => {
  let code = `/*
 * RLE 解码工具函数库
 * 生成时间: ${new Date().toLocaleDateString()}
 * 生成工具: RLE Master
 * 
 * 移植说明:
 * 1. 建议包含 <stdint.h> 并使用 uint8_t, uint32_t 等类型以确保跨平台一致性。
 * 2. compressed_data 和 data_offsets 数组通常放在 flash/rodata 区域。
 * 3. 解码函数中的 'max_dst_len' 用于防止缓冲区溢出，建议必须传递正确的缓冲区大小。
 */

// 类型定义 (如果未包含 stdint.h)
// typedef unsigned char  uint8_t;
// typedef unsigned short uint16_t;
// typedef unsigned int   uint32_t;

`;

  // Helper for binary search
  code += `/**
 * @brief 通过二分法查找字符索引
 * 
 * 这是一个通用的二分查找实现，用于从排序好的字符集中找到对应的字模索引。
 * 
 * @param code    目标字符编码 (如 Unicode/ASCII 值)
 * @param charset 已排序的字符集数组指针 (const unsigned short*)
 * @param len     字符集数组的长度
 * @return int    返回字符在数组中的索引，如果未找到则返回 -1
 */
int get_glyph_index(unsigned short code, const unsigned short* charset, int len) {
    int left = 0;
    int right = len - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (charset[mid] == code) {
            return mid; // 找到目标
        }
        if (charset[mid] < code) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1; // 未找到
}

`;

  if (hasOffsets) {
    code += `// 外部引用声明 (根据您的项目结构，可能需要修改此处)
extern const unsigned char compressed_data[];
extern const unsigned int data_offsets[];

/**
 * @brief 获取压缩数据的起始地址
 * 
 * @param index 字模索引 (通常由 get_glyph_index 返回)
 * @return const unsigned char* 指向压缩数据流的指针
 */
const unsigned char* get_glyph_data(int index) {
    if (index < 0) return 0; // 索引无效
    // 注意: 此处假设 compressed_data 可全局访问
    // 如果数据分片存储，请在此处修改寻址逻辑
    return &compressed_data[data_offsets[index]];
}

`;
  }

  if (mode === EncodingMode.RLE_8_8) {
    code += `/**
 * @brief RLE 8:8 解码器
 * 
 * 格式: [Count (8bit)] [Value (8bit)]
 * 
 * @param src         输入压缩数据指针
 * @param dst         输出像素缓冲区指针
 * @param max_dst_len 输出缓冲区的最大容量 (字节数)
 */
void decode_rle_88(const unsigned char* src, unsigned char* dst, int max_dst_len) {
    int src_idx = 0;
    int dst_idx = 0;
    
    while (dst_idx < max_dst_len) { 
        // 读取运行长度和值
        unsigned char count = src[src_idx++];
        unsigned char val = src[src_idx++];
        
        // 填充输出
        for (int i = 0; i < count; i++) {
            if (dst_idx >= max_dst_len) break; // 防止溢出
            dst[dst_idx++] = val;
        }
    }
}`;
  }
  else if (mode === EncodingMode.RLE_4_4) {
    code += `/**
 * @brief RLE 4:4 解码器 (紧凑型优化版)
 * 
 * 格式: [Count (4bit) | Value (4bit)] 打包在一个字节中
 * 
 * 优化说明:
 * - 长度字段存储的是 (实际运行长度 - 1)。
 * - 0x0N -> 代表长度 1，值为 N。
 * - 0xFN -> 代表长度 16，值为 N。
 * - 这样将 4bit 的表达范围从 0-15 (0无意义) 映射到了 1-16。
 * 
 * 注意: 解码后的数据是解包后的 1字节/像素 格式 (值范围 0-15)
 * 
 * @param src         输入压缩数据指针
 * @param dst         输出像素缓冲区指针
 * @param max_dst_len 输出缓冲区的最大容量 (字节数)
 */
void decode_rle_44(const unsigned char* src, unsigned char* dst, int max_dst_len) {
    int src_idx = 0;
    int dst_idx = 0;
    
    while (dst_idx < max_dst_len) {
        unsigned char byte = src[src_idx++];
        
        // 提取高4位作为长度，低4位作为值
        // 优化: 长度字段 = 实际长度 - 1
        // 所以: 实际长度 = 长度字段 + 1
        unsigned char count = ((byte >> 4) & 0x0F) + 1;
        unsigned char val = byte & 0x0F;
        
        for (int i = 0; i < count; i++) {
            if (dst_idx >= max_dst_len) break;
            dst[dst_idx++] = val; 
        }
    }
}`;
  }
  else if (mode === EncodingMode.BIT_Stream_8) {
    code += `/**
 * @brief Bit Stream 8 解码器 (交替位流)
 * 
 * 适用于 1bpp 单色位图压缩。
 * 格式: 连续的 8位 计数值。流默认从 0 (背景) 开始。
 * 
 * 特殊逻辑 (可变长度):
 * - 如果 count == 255: 输出 255 个位，保持当前位状态 (不翻转)。
 * - 如果 count < 255:  输出 count 个位，然后翻转位状态 (0->1 或 1->0)。
 * 
 * @param src           输入压缩数据指针
 * @param dst           输出缓冲区指针 (Packed 1bpp, 8 pixels/byte)
 * @param max_dst_bytes 输出缓冲区的最大字节数
 */
void decode_bit_stream_8(const unsigned char* src, unsigned char* dst, int max_dst_bytes) {
    int src_idx = 0;
    int dst_byte_idx = 0;
    int dst_bit_pos = 7; // MSB 优先写入
    unsigned char current_byte = 0;
    unsigned char current_val = 0; // 初始假设从 0 开始
    
    // 初始化第一个输出字节
    // 注意: 如果 dst 不是全空的，可能需要先清零
    // memset(dst, 0, max_dst_bytes); 

    while (dst_byte_idx < max_dst_bytes) {
        unsigned char count = src[src_idx++];
        
        // 循环输出指定数量的位
        for (int i = 0; i < count; i++) {
            if (current_val) {
                current_byte |= (1 << dst_bit_pos);
            }
            
            dst_bit_pos--;
            
            // 字节填满，写入缓冲区
            if (dst_bit_pos < 0) {
                dst[dst_byte_idx++] = current_byte;
                current_byte = 0;
                dst_bit_pos = 7;
                
                if (dst_byte_idx >= max_dst_bytes) return; // 缓冲区满
            }
        }

        // 状态切换逻辑
        if (count < 255) {
            current_val = !current_val; // 翻转颜色 (0->1, 1->0)
        } else {
            // count == 255, 意味着这是一个长连续段的中继
            // 保持 current_val 不变，继续读取下一个 count
        }
    }
}`;
  }
  else if (mode === EncodingMode.BIT_Stream_4) {
    code += `/**
 * @brief Bit Stream 4 解码器 (紧凑型交替位流)
 * 
 * 适用于极低资源的 1bpp 压缩。
 * 格式: 每个字节包含两个 4位 计数 [Count1 (4bit) | Count2 (4bit)]。
 * 
 * 特殊逻辑 (可变长度):
 * - 最大计数值为 15 (0xF)。
 * - 如果 count == 15: 输出 15 个位，保持当前位状态。
 * - 如果 count < 15:  输出 count 个位，翻转位状态。
 * 
 * @param src           输入压缩数据指针
 * @param dst           输出缓冲区指针 (Packed 1bpp)
 * @param max_dst_bytes 输出缓冲区的最大字节数
 */
void decode_bit_stream_4(const unsigned char* src, unsigned char* dst, int max_dst_bytes) {
    int src_idx = 0;
    int dst_byte_idx = 0;
    int dst_bit_pos = 7; // MSB 优先
    unsigned char current_byte = 0;
    unsigned char current_val = 0; // 初始为 0

    while (dst_byte_idx < max_dst_bytes) {
        unsigned char byte = src[src_idx++];
        
        // 解包两个计数
        unsigned char counts[2];
        counts[0] = (byte >> 4) & 0x0F; // 高4位
        counts[1] = byte & 0x0F;        // 低4位
        
        for (int k = 0; k < 2; k++) {
            unsigned char count = counts[k];
            
            // 输出位
            for (int i = 0; i < count; i++) {
                if (current_val) {
                    current_byte |= (1 << dst_bit_pos);
                }
                
                dst_bit_pos--;
                
                if (dst_bit_pos < 0) {
                    dst[dst_byte_idx++] = current_byte;
                    current_byte = 0;
                    dst_bit_pos = 7;
                    
                    if (dst_byte_idx >= max_dst_bytes) return;
                }
            }
            
            // 状态切换逻辑
            if (count < 15) {
                current_val = !current_val;
            }
        }
    }
}`;
  }
  return code;
};
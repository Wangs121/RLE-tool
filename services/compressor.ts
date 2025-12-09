import { DataWidth, EncodingMode, CompressResult } from '../types';
import { generateDecoder } from './decoder';

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
 

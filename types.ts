export enum EncodingMode {
  RLE_8_8 = 'RLE_8_8', // 8-bit Length, 8-bit Value
  RLE_4_4 = 'RLE_4_4', // 4-bit Length, 4-bit Value (Packed into 1 byte)
  BIT_Stream_8 = 'BIT_STREAM_8', // Bit-level Alternating RLE (8-bit Counts)
  BIT_Stream_4 = 'BIT_STREAM_4', // Bit-level Alternating RLE (4-bit Counts packed)
}

export enum DataWidth {
  BPP_1 = 1,
  BPP_2 = 2,
  BPP_4 = 4,
  BPP_8 = 8,
}

export interface CompressResult {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  hexOutput: string;
  cArrayOutput: string;
  offsetTableOutput: string;
  decoderCode: string;
}

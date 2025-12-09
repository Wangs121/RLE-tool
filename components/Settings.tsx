import React from 'react';
import { EncodingMode, DataWidth } from '../types';
import { Settings as SettingsIcon, Cpu, Layers, Image } from 'lucide-react';

interface SettingsProps {
  mode: EncodingMode;
  setMode: (mode: EncodingMode) => void;
  sourceBPP: DataWidth;
  setSourceBPP: (bpp: DataWidth) => void;
}

export const Settings: React.FC<SettingsProps> = ({ mode, setMode, sourceBPP, setSourceBPP }) => {
  return (
    <div className="bg-slate-900 border-r border-slate-800 w-full md:w-80 flex-shrink-0 flex flex-col h-full overflow-y-auto">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">配置选项</h2>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Source Resolution (BPP) */}
        <div className="space-y-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Image size={14} /> 源分辨率 (BPP)
          </label>
          <div className="grid grid-cols-2 gap-3">
             <button
                onClick={() => setSourceBPP(DataWidth.BPP_1)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${sourceBPP === DataWidth.BPP_1 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
             >
                1 BPP
             </button>
             <button
                onClick={() => setSourceBPP(DataWidth.BPP_2)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${sourceBPP === DataWidth.BPP_2 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
             >
                2 BPP
             </button>
             <button
                onClick={() => setSourceBPP(DataWidth.BPP_4)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${sourceBPP === DataWidth.BPP_4 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
             >
                4 BPP
             </button>
             <button
                onClick={() => setSourceBPP(DataWidth.BPP_8)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${sourceBPP === DataWidth.BPP_8 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
             >
                8 BPP
             </button>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Encoding Mode */}
        <div className="space-y-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu size={14} /> 编码算法
          </label>
          
          <div className="space-y-3">
            {/* RLE 8:8 */}
            <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${mode === EncodingMode.RLE_8_8 ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
              <input 
                type="radio" 
                name="mode" 
                className="absolute opacity-0 w-full h-full inset-0 cursor-pointer"
                checked={mode === EncodingMode.RLE_8_8}
                onChange={() => setMode(EncodingMode.RLE_8_8)}
              />
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">标准 RLE</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">8:8</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                1字节长度 + 1字节值。支持长连续段 (255)。
              </p>
            </label>

            {/* RLE 4:4 */}
            <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${mode === EncodingMode.RLE_4_4 ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
              <input 
                type="radio" 
                name="mode" 
                className="absolute opacity-0 w-full h-full inset-0 cursor-pointer"
                checked={mode === EncodingMode.RLE_4_4}
                onChange={() => setMode(EncodingMode.RLE_4_4)}
              />
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">紧凑 RLE (优化版)</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">4:4</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                单字节 (4位长度 + 4位值)。长度映射 1-16 (0x0 代表 1)。
              </p>
            </label>

            {/* Bit Stream 8 */}
            <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${mode === EncodingMode.BIT_Stream_8 ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
              <input 
                type="radio" 
                name="mode" 
                className="absolute opacity-0 w-full h-full inset-0 cursor-pointer"
                checked={mode === EncodingMode.BIT_Stream_8}
                onChange={() => setMode(EncodingMode.BIT_Stream_8)}
              />
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">交替 1bpp (8位)</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">Bit-Run 8</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                8位交替位计数 (0/1)。最大长度 255。
              </p>
            </label>

            {/* Bit Stream 4 */}
            <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${mode === EncodingMode.BIT_Stream_4 ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}>
              <input 
                type="radio" 
                name="mode" 
                className="absolute opacity-0 w-full h-full inset-0 cursor-pointer"
                checked={mode === EncodingMode.BIT_Stream_4}
                onChange={() => setMode(EncodingMode.BIT_Stream_4)}
              />
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-200">交替 1bpp (4位)</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">Bit-Run 4</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                4位计数压缩 (每字节2个)。最大长度 15。适合小字模。
              </p>
            </label>
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2 mb-2">
            <Layers size={14} /> 算法说明
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {mode === EncodingMode.RLE_4_4 && sourceBPP === DataWidth.BPP_8 
              ? "8BPP 输入将被降采样（丢弃低4位）以适应4位值槽。"
              : (mode === EncodingMode.BIT_Stream_8 || mode === EncodingMode.BIT_Stream_4)
              ? "输入字节被视为打包位（MSB优先）进行流压缩。"
              : "数据符合编码宽度或直接透传。"}
          </p>
        </div>
      </div>
    </div>
  );
};
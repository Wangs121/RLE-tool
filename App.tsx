import React, { useState, useEffect } from 'react';
import { Settings } from './components/Settings';
import { Editor } from './components/Editor';
import { EncodingMode, CompressResult, DataWidth } from './types';
import { parseCArray, compressData } from './services/compressor';
import { ArrowRight, Code2, Play, Activity, AlertCircle } from 'lucide-react';

const DEFAULT_INPUT = `// 示例 1bpp 字符 'A'
const unsigned char char_A[] = {
  0x00, 0x18, 0x3C, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x00, 0x00
};

// 示例 2D 数组 (多个字模)
const unsigned char icons[][16] = {
    { 0x00, 0x00, 0x18, 0x24, 0x42, 0x42, 0x24, 0x18, 0x00 }, // 圆形
    { 0x00, 0x00, 0x00, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00 }  // 线条
};`;

function App() {
  const [inputCode, setInputCode] = useState(DEFAULT_INPUT);
  const [mode, setMode] = useState<EncodingMode>(EncodingMode.RLE_8_8);
  const [sourceBPP, setSourceBPP] = useState<DataWidth>(DataWidth.BPP_8);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compressed' | 'offsets' | 'decoder'>('compressed');

  const handleGenerate = () => {
    setError(null);
    try {
      const chunks = parseCArray(inputCode);
      if (chunks.length === 0) {
        setError("输入中未找到有效的十六进制数据（如 0x00, 0xFF）。请检查格式。");
        setResult(null);
        return;
      }
      const res = compressData(chunks, mode, sourceBPP);
      setResult(res);
    } catch (e) {
      console.error(e);
      setError("压缩过程中发生意外错误。");
    }
  };

  // Auto-generate when settings change
  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sourceBPP]); // Trigger when mode or BPP changes

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      {/* Sidebar */}
      <Settings 
        mode={mode} 
        setMode={setMode} 
        sourceBPP={sourceBPP}
        setSourceBPP={setSourceBPP}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 rounded-lg p-1.5 shadow-lg shadow-indigo-500/20">
              <Code2 className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">RLE 字模工具</h1>
          </div>
          
          <div className="flex items-center gap-4">
             {result && !error && (
                <div className="hidden md:flex items-center gap-6 text-sm">
                   <div className="flex flex-col items-end">
                      <span className="text-slate-500 text-xs font-medium uppercase">原始大小</span>
                      <span className="font-mono text-slate-200">{result.originalSize} B</span>
                   </div>
                   <ArrowRight size={14} className="text-slate-600" />
                   <div className="flex flex-col items-end">
                      <span className="text-slate-500 text-xs font-medium uppercase">压缩后</span>
                      <span className="font-mono text-emerald-400 font-bold">{result.compressedSize} B</span>
                   </div>
                   <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-2">
                      <Activity size={14} className={result.ratio > 0 ? "text-emerald-500" : "text-rose-500"} />
                      <span className={`font-mono font-bold ${result.ratio > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {result.ratio.toFixed(1)}%
                      </span>
                   </div>
                </div>
             )}
            <button 
              onClick={handleGenerate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
            >
              <Play size={18} fill="currentColor" />
              生成
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 p-6 gap-6 grid grid-cols-1 lg:grid-cols-2 min-h-0">
          
          {/* Input Area */}
          <div className="min-h-[300px] lg:h-full flex flex-col">
            <Editor 
              title="输入 C 代码" 
              code={inputCode} 
              onChange={setInputCode}
            />
          </div>

          {/* Output Area */}
          <div className="min-h-[300px] lg:h-full flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="flex items-center justify-between px-4 py-2 bg-slate-950/50 border-b border-slate-800">
               <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button 
                    onClick={() => setActiveTab('compressed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'compressed' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    压缩数据
                  </button>
                  <button 
                    onClick={() => setActiveTab('offsets')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'offsets' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    偏移表
                  </button>
                  <button 
                    onClick={() => setActiveTab('decoder')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'decoder' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    解码函数
                  </button>
               </div>
             </div>
             
             <div className="flex-1 relative">
                {error ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-20 p-6 text-center">
                    <div className="bg-rose-500/10 border border-rose-500/50 rounded-xl p-6 max-w-md">
                      <div className="flex justify-center mb-3">
                        <AlertCircle className="w-8 h-8 text-rose-500" />
                      </div>
                      <h3 className="text-rose-400 font-bold mb-2">解析失败</h3>
                      <p className="text-slate-400 text-sm">{error}</p>
                    </div>
                  </div>
                ) : null}

                {activeTab === 'compressed' && (
                  <Editor 
                    title="输出数组" 
                    code={result ? result.cArrayOutput : ""} 
                    readOnly 
                  />
                )}

                {activeTab === 'offsets' && (
                  <Editor 
                    title="索引偏移表" 
                    code={result ? result.offsetTableOutput : ""} 
                    readOnly 
                  />
                )}

                {activeTab === 'decoder' && (
                   <Editor 
                     title="解码函数" 
                     code={result ? result.decoderCode : ""} 
                     readOnly 
                   />
                )}
                
                {!result && !error && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-slate-500">
                    点击生成按钮查看结果
                  </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
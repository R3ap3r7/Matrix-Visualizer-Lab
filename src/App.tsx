import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, RefreshCcw, Terminal, Zap, X, Database } from 'lucide-react';

type Matrix = string[][];

interface Step {
  row: number;
  col: number;
  k: number;
  calculationLines: string[];
  currentSum: number;
  isComplete: boolean;
}

const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;
const MAX_DIM = 25;

const SPEEDS = [
  { label: '0.25x', value: 2000 },
  { label: '0.5x', value: 1000 },
  { label: '1x', value: 500 },
  { label: '2x', value: 250 },
  { label: '4x', value: 125 }
];

const formatDisplay = (val: string | number): string => {
  if (val === '' || val === undefined) return '';
  let num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  
  if (!Number.isInteger(num)) {
    num = Math.round(num * 1e8) / 1e8;
  }

  let s = num.toString();
  s = s.replace(/^(-?)0\./, '$1.');
  
  if (s.length > 12) {
    s = num.toExponential(4);
  }
  
  return s;
};

function App() {
  const [matrixA, setMatrixA] = useState<Matrix>(Array(DEFAULT_ROWS).fill('').map(() => Array(DEFAULT_COLS).fill('0')));
  const [matrixB, setMatrixB] = useState<Matrix>(Array(DEFAULT_COLS).fill('').map(() => Array(DEFAULT_COLS).fill('0')));
  
  const [rowsAInput, setRowsAInput] = useState(DEFAULT_ROWS.toString());
  const [colsAInput, setColsAInput] = useState(DEFAULT_COLS.toString());
  const [colsBInput, setColsBInput] = useState(DEFAULT_COLS.toString());

  const rowsA = parseInt(rowsAInput) || 1;
  const colsA = parseInt(colsAInput) || 1;
  const colsB = parseInt(colsBInput) || 1;

  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTextA, setModalTextA] = useState('');
  const [modalTextB, setModalTextB] = useState('');

  const [focusedCell, setFocusedCell] = useState<{ matrix: 'A' | 'B', r: number, c: number } | null>(null);

  const progressRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => {
    const allSteps: Step[] = [];
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        const calcParts: string[] = [];
        for (let k = 0; k < colsA; k++) {
          const valA = parseFloat(matrixA[i]?.[k]) || 0;
          const valB = parseFloat(matrixB[k]?.[j]) || 0;
          const product = valA * valB;
          sum += product;
          calcParts.push(`${formatDisplay(valA)}×${formatDisplay(valB)}`);
          
          // Group into lines of 6 additions
          const lines: string[] = [];
          for (let m = 0; m < calcParts.length; m += 6) {
            lines.push(calcParts.slice(m, m + 6).join(' + '));
          }
          
          allSteps.push({
            row: i,
            col: j,
            k: k,
            calculationLines: lines,
            currentSum: sum,
            isComplete: k === colsA - 1
          });
        }
      }
    }
    return allSteps;
  }, [matrixA, matrixB, rowsA, colsA, colsB]);

  const currentStep = (currentStepIndex >= 0 && currentStepIndex < steps.length) ? steps[currentStepIndex] : null;

  const matrixC = useMemo(() => {
    const result: number[][] = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));
    steps.forEach((step, index) => {
      if (index <= currentStepIndex && step.isComplete) {
        if (result[step.row] && result[step.row][step.col] !== undefined) {
          result[step.row][step.col] = step.currentSum;
        }
      }
    });
    return result;
  }, [rowsA, colsB, steps, currentStepIndex]);

  const maxContentLength = useMemo(() => {
    let max = 1;
    const check = (val: string | number) => {
      const s = formatDisplay(val);
      if (s.length > max) max = s.length;
    };
    matrixA.flat().forEach(check);
    matrixB.flat().forEach(check);
    matrixC.flat().forEach(check);
    return max;
  }, [matrixA, matrixB, matrixC]);

  const dimFactor = Math.max(rowsA, colsA, colsB);
  const cellSizeW = Math.max(32, Math.min(180, (maxContentLength * 10) + 16));
  const cellSizeH = Math.max(24, Math.min(60, 480 / dimFactor));
  const fontSize = Math.max(0.4, Math.min(1.1, 5 / (dimFactor * (1 + maxContentLength/15)))) + 'rem';

  const handleUpdateDimensions = (type: 'rowsA' | 'colsA' | 'colsB', valStr: string) => {
    if (valStr === '') {
      if (type === 'rowsA') setRowsAInput('');
      else if (type === 'colsA') setColsAInput('');
      else if (type === 'colsB') setColsBInput('');
      return;
    }
    let v = parseInt(valStr);
    if (isNaN(v)) return;
    v = Math.max(1, Math.min(MAX_DIM, v));
    
    if (type === 'rowsA') setRowsAInput(v.toString());
    else if (type === 'colsA') setColsAInput(v.toString());
    else if (type === 'colsB') setColsBInput(v.toString());

    const newRA = type === 'rowsA' ? v : rowsA;
    const newCA = type === 'colsA' ? v : colsA;
    const newCB = type === 'colsB' ? v : colsB;

    setMatrixA(prev => Array(newRA).fill('').map((_, i) => {
      const row = prev[i] || Array(newCA).fill('0');
      const nextRow = [...row];
      while (nextRow.length < newCA) nextRow.push('0');
      nextRow.length = newCA;
      return nextRow;
    }));
    setMatrixB(prev => Array(newCA).fill('').map((_, i) => {
      const row = prev[i] || Array(newCB).fill('0');
      const nextRow = [...row];
      while (nextRow.length < newCB) nextRow.push('0');
      nextRow.length = newCB;
      return nextRow;
    }));

    setCurrentStepIndex(-1);
    setIsPlaying(false);
  };

  const handleUpdateCell = (matrix: 'A' | 'B', r: number, c: number, value: string) => {
    if (value !== '' && !/^-?\d*\.?\d*$/.test(value)) return;
    if (matrix === 'A') {
      const newA = [...matrixA];
      newA[r] = [...newA[r]];
      newA[r][c] = value;
      setMatrixA(newA);
    } else {
      const newB = [...matrixB];
      newB[r] = [...newB[r]];
      newB[r][c] = value;
      setMatrixB(newB);
    }
    setCurrentStepIndex(-1);
  };

  const handleBlurCell = (matrix: 'A' | 'B', r: number, c: number) => {
    setFocusedCell(null);
    if (matrix === 'A') {
      const newA = [...matrixA];
      const val = newA[r][c];
      if (val === '' || val === '-' || val === '.' || val === '-.') newA[r][c] = '0';
      else newA[r][c] = parseFloat(val).toString();
      setMatrixA(newA);
    } else {
      const newB = [...matrixB];
      const val = newB[r][c];
      if (val === '' || val === '-' || val === '.' || val === '-.') newB[r][c] = '0';
      else newB[r][c] = parseFloat(val).toString();
      setMatrixB(newB);
    }
  };

  const handleInitializeTerminal = () => {
    const parse = (text: string) => text.trim().split('\n').map(r => r.trim().split(/[\s,]+/).map(v => v || '0'));
    const dataA = parse(modalTextA);
    const dataB = parse(modalTextB);

    if (dataA.length > 0 && dataB.length > 0) {
      const rA = dataA.length;
      const cA = dataA[0].length;
      const rB = dataB.length;
      const cB = dataB[0].length;

      if (cA !== rB) {
        alert(`Mismatch: A Cols (${cA}) vs B Rows (${rB})`);
        return;
      }

      setRowsAInput(rA.toString());
      setColsAInput(cA.toString());
      setColsBInput(cB.toString());
      setMatrixA(dataA);
      setMatrixB(dataB);
      setIsModalOpen(false);
      setCurrentStepIndex(-1);
      setIsPlaying(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const targetStep = Math.floor(percentage * (steps.length + 1)) - 1;
    setCurrentStepIndex(Math.max(-1, Math.min(steps.length, targetStep)));
  };

  const nextStep = useCallback(() => setCurrentStepIndex(prev => Math.min(steps.length, prev + 1)), [steps.length]);
  const prevStep = () => setCurrentStepIndex(prev => Math.max(-1, prev - 1));
  const skipToEnd = () => { setCurrentStepIndex(steps.length); setIsPlaying(false); };
  const reset = () => { setCurrentStepIndex(-1); setIsPlaying(false); };

  useEffect(() => {
    let interval: number;
    if (isPlaying && currentStepIndex < steps.length) {
      interval = setInterval(() => nextStep(), speed);
    } else if (currentStepIndex === steps.length) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStepIndex, steps.length, speed, nextStep]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand">
          <h1 className="cinematic-title">OBSIDIAN LABORATORY</h1>
          <span className="subtitle">VECTOR SYNTHESIS ENGINE</span>
        </div>

        <div className="control-hub">
          <div className="status-pill">
            <div className={`status-dot ${currentStepIndex === steps.length ? 'complete' : isPlaying ? 'busy' : 'ready'}`}></div>
            <span>{currentStepIndex === steps.length ? 'COMPLETE' : isPlaying ? 'CALCULATING' : 'READY'}</span>
          </div>
          <button className="hub-btn" onClick={() => {
            setModalTextA(matrixA.map(r => r.join(' ')).join('\n'));
            setModalTextB(matrixB.map(r => r.join(' ')).join('\n'));
            setIsModalOpen(true);
          }}>
            <Terminal size={14} /> MANUAL ENTRY
          </button>
          <button className="hub-btn" onClick={() => {
            setMatrixA(prev => prev.map(row => row.map(() => Math.floor(Math.random() * 10).toString())));
            setMatrixB(prev => prev.map(row => row.map(() => Math.floor(Math.random() * 10).toString())));
            setCurrentStepIndex(-1);
            setIsPlaying(false);
          }}>
            <Database size={14} /> RANDOMIZE
          </button>
          
          <div className="dim-config">
            <div className="dim-input-group">
              <span className="dim-label">A</span>
              <input type="number" value={rowsAInput} onChange={e => handleUpdateDimensions('rowsA', e.target.value)} />
              <span className="dim-x">×</span>
              <input type="number" value={colsAInput} onChange={e => handleUpdateDimensions('colsA', e.target.value)} className="highlight" />
            </div>
            <div className="dim-input-group">
              <span className="dim-label">B</span>
              <input type="number" value={colsAInput} onChange={e => handleUpdateDimensions('colsA', e.target.value)} className="highlight" />
              <span className="dim-x">×</span>
              <input type="number" value={colsBInput} onChange={e => handleUpdateDimensions('colsB', e.target.value)} />
            </div>
          </div>
        </div>
      </header>

      <main className="main-layout">
        <div className="matrices-viewport">
          <div className="matrices-row">
            {/* Matrix A */}
            <div className="matrix-bracket-wrap">
              <div className="matrix-bracket left"></div>
              <div className="matrix-grid-cinematic" style={{ gridTemplateColumns: `repeat(${colsA}, ${cellSizeW}px)`, fontSize }}>
                {matrixA.map((row, r) => row.map((val, c) => (
                  <div key={`a-${r}-${c}`} className={`cell-cinematic ${currentStep?.row === r ? 'active-row-glow' : ''} ${currentStep?.row === r && currentStep?.k === c ? 'focus-cell-a' : ''}`} style={{ width: cellSizeW, height: cellSizeH }}>
                    <input 
                      type="text" 
                      value={(focusedCell?.matrix === 'A' && focusedCell.r === r && focusedCell.c === c) ? val : formatDisplay(val)} 
                      onChange={e => handleUpdateCell('A', r, c, e.target.value)} 
                      onFocus={() => setFocusedCell({ matrix: 'A', r, c })}
                      onBlur={() => handleBlurCell('A', r, c)}
                    />
                  </div>
                )))}
              </div>
              <div className="matrix-bracket right"></div>
            </div>

            <div className="operator-cinematic">×</div>

            {/* Matrix B */}
            <div className="matrix-bracket-wrap">
              <div className="matrix-bracket left"></div>
              <div className="matrix-grid-cinematic" style={{ gridTemplateColumns: `repeat(${colsB}, ${cellSizeW}px)`, fontSize }}>
                {matrixB.map((row, r) => row.map((val, c) => (
                  <div key={`b-${r}-${c}`} className={`cell-cinematic ${currentStep?.col === c ? 'active-col-glow' : ''} ${currentStep?.col === c && currentStep?.k === r ? 'focus-cell-b' : ''}`} style={{ width: cellSizeW, height: cellSizeH }}>
                    <input 
                      type="text" 
                      value={(focusedCell?.matrix === 'B' && focusedCell.r === r && focusedCell.c === c) ? val : formatDisplay(val)} 
                      onChange={e => handleUpdateCell('B', r, c, e.target.value)} 
                      onFocus={() => setFocusedCell({ matrix: 'B', r, c })}
                      onBlur={() => handleBlurCell('B', r, c)}
                    />
                  </div>
                )))}
              </div>
              <div className="matrix-bracket right"></div>
            </div>

            <div className="operator-cinematic">=</div>

            {/* Matrix C */}
            <div className="matrix-bracket-wrap">
              <div className="matrix-bracket left"></div>
              <div className="matrix-grid-cinematic" style={{ gridTemplateColumns: `repeat(${colsB}, ${cellSizeW}px)`, fontSize }}>
                {matrixC.map((row, r) => row.map((val, c) => {
                  const isActive = currentStep?.row === r && currentStep?.col === c;
                  const isDone = steps.some((s, i) => i <= currentStepIndex && s.row === r && s.col === c && s.isComplete);
                  return (
                    <div key={`c-${r}-${c}`} className={`cell-cinematic ${isActive ? 'target-cell-glow' : ''}`} style={{ width: cellSizeW, height: cellSizeH }}>
                      <span className={`result-text ${(isDone || isActive) ? 'done' : ''}`}>
                        {isActive ? formatDisplay(currentStep.currentSum) : formatDisplay(val)}
                      </span>
                      {isActive && (
                        <div className="glass-math-popover">
                          <div className="popover-calc">
                            {currentStep.calculationLines.map((line, idx) => (
                              <div key={idx} className="popover-calc-line">
                                {line}{idx < currentStep.calculationLines.length - 1 ? ' +' : ''}
                              </div>
                            ))}
                          </div>
                          <div className="popover-result">= {formatDisplay(currentStep.currentSum)}</div>
                        </div>
                      )}
                    </div>
                  );
                }))}
              </div>
              <div className="matrix-bracket right"></div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-fixed">
        <div className="playback-instrument">
          <div className="playback-core">
            <button onClick={reset} className="inst-btn"><SkipBack size={18} fill="currentColor" /></button>
            <button onClick={prevStep} className="inst-btn rotate-180"><SkipBack size={18} /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className={`inst-btn-play ${isPlaying ? 'playing' : ''}`}>
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={nextStep} className="inst-btn"><SkipForward size={18} /></button>
            <button onClick={skipToEnd} className="inst-btn"><FastForward size={18} fill="currentColor" /></button>
          </div>

          <div className="playback-meta">
            <div className="discrete-speeds">
              {SPEEDS.map(s => (
                <button key={s.label} className={`speed-toggle ${speed === s.value ? 'active' : ''}`} onClick={() => setSpeed(s.value)}>{s.label}</button>
              ))}
            </div>
            <div className="progress-track" ref={progressRef} onClick={handleProgressClick}>
              <div className="progress-fill" style={{ width: `${((currentStepIndex + 1) / (steps.length || 1)) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="terminal-modal glass">
            <div className="terminal-header">
              <div className="terminal-title"><Terminal size={16} /> DATA_INPUT_TERMINAL.v2</div>
              <button className="terminal-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="terminal-body">
              <div className="terminal-field">
                <label>MATRIX_A_DATA</label>
                <textarea value={modalTextA} onChange={e => setModalTextA(e.target.value)} placeholder="0 0 0&#10;0 0 0" />
              </div>
              <div className="terminal-field">
                <label>MATRIX_B_DATA</label>
                <textarea value={modalTextB} onChange={e => setModalTextB(e.target.value)} placeholder="0 0 0&#10;0 0 0" />
              </div>
            </div>
            <div className="terminal-footer">
              <div className="terminal-status"><Database size={12} /> DIM_LIMIT: 25x25</div>
              <button className="terminal-apply" onClick={handleInitializeTerminal}><Zap size={14} /> INITIALIZE_COMPUTATION</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

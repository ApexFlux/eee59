import React, { useState, useEffect, useRef } from 'react';

// --- Utility Functions ---

// Convert wavelength (nm) to an RGB color for the canvas
function wavelengthToRGB(wavelength) {
  let r, g, b, alpha;
  const wl = wavelength;
  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / (440 - 380);
    g = 0.0;
    b = 1.0;
  } else if (wl >= 440 && wl < 490) {
    r = 0.0;
    g = (wl - 440) / (490 - 440);
    b = 1.0;
  } else if (wl >= 490 && wl < 510) {
    r = 0.0;
    g = 1.0;
    b = -(wl - 510) / (510 - 490);
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / (580 - 510);
    g = 1.0;
    b = 0.0;
  } else if (wl >= 580 && wl < 645) {
    r = 1.0;
    g = -(wl - 645) / (645 - 580);
    b = 0.0;
  } else if (wl >= 645 && wl <= 780) {
    r = 1.0;
    g = 0.0;
    b = 0.0;
  } else {
    r = 0.0;
    g = 0.0;
    b = 0.0;
  }

  // Intensity falloff near vision limits
  if (wl >= 380 && wl < 420) alpha = 0.3 + 0.7 * (wl - 380) / (420 - 380);
  else if (wl >= 420 && wl < 701) alpha = 1.0;
  else if (wl >= 701 && wl <= 780) alpha = 0.3 + 0.7 * (780 - wl) / (780 - 700);
  else alpha = 0.0;

  const R = Math.round(r * alpha * 255);
  const G = Math.round(g * alpha * 255);
  const B = Math.round(b * alpha * 255);
  return `rgb(${R}, ${G}, ${B})`;
}

export default function ThinFilmInterference() {
  const canvasRef = useRef(null);
  
  // --- Physics State ---
  const [thickness, setThickness] = useState(300); // nm
  const [incidentAngleDeg, setIncidentAngleDeg] = useState(30); // degrees
  const [wavelength, setWavelength] = useState(550); // nm
  
  // Medium Refractive Indices
  const [n1, setN1] = useState(1.0); // Air
  const [n2, setN2] = useState(1.33); // Film (Water/Soap)
  const [n3, setN3] = useState(1.0); // Substrate (Air)
  const [preset, setPreset] = useState('soap');

  // Animation State
  const [isPlaying, setIsPlaying] = useState(true);
  const timeRef = useRef(0);
  const animationRef = useRef(null);

  // --- Derived Physics Values ---
  const thetaI = (incidentAngleDeg * Math.PI) / 180;
  // Snell's Law: n1 * sin(thetaI) = n2 * sin(thetaT)
  const sinThetaT = (n1 / n2) * Math.sin(thetaI);
  const thetaT = Math.asin(sinThetaT);
  
  // Geometric path difference: 2 * n2 * d * cos(theta_t)
  const geoPathDiff = 2 * n2 * thickness * Math.cos(thetaT);
  
  // Phase Shifts (0 or 180 degrees -> 0 or PI)
  const phaseShift1 = n2 > n1 ? Math.PI : 0;
  const phaseShift2 = n3 > n2 ? Math.PI : 0;
  
  // Total Phase Difference (in radians)
  const k0 = (2 * Math.PI) / wavelength;
  const phaseDiffRadias = k0 * geoPathDiff + (phaseShift2 - phaseShift1);
  
  // Equivalent Total Path Difference Lambda (in nm)
  const shiftTerm = (phaseShift2 - phaseShift1) !== 0 ? wavelength / 2 : 0;
  const totalOpticalPath = geoPathDiff + shiftTerm;
  
  // Constructive vs Destructive interference ratio (0 to 1)
  // cos^2(phaseDiff / 2) -> 1 is constructive, 0 is destructive
  const interferenceAmplitude = Math.abs(Math.cos(phaseDiffRadias / 2));
  
  // --- Handle Presets ---
  const handlePresetChange = (e) => {
    const val = e.target.value;
    setPreset(val);
    if (val === 'soap') { setN1(1.0); setN2(1.33); setN3(1.0); }
    if (val === 'oil') { setN1(1.0); setN2(1.50); setN3(1.33); }
    if (val === 'ar') { setN1(1.0); setN2(1.38); setN3(1.52); }
  };

  // --- Animation & Rendering Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = 0.5; // pixels per nm for visual scaling
    
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      
      // Clear Canvas
      ctx.clearRect(0, 0, w, h);
      
      // Time update
      if (isPlaying) {
        timeRef.current += 0.05; // Speed of waves
      }
      const t = timeRef.current;

      // 1. Draw Medium Backgrounds
      const topY = 150;
      const bottomY = topY + thickness * scale;
      
      // Air (n1)
      ctx.fillStyle = 'rgba(20, 25, 40, 1)';
      ctx.fillRect(0, 0, w, topY);
      // Film (n2)
      ctx.fillStyle = `rgba(40, 60, 90, ${n2 * 0.4})`;
      ctx.fillRect(0, topY, w, bottomY - topY);
      // Substrate (n3)
      ctx.fillStyle = `rgba(30, 45, 60, ${n3 * 0.4})`;
      ctx.fillRect(0, bottomY, w, h - bottomY);

      // Labels
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Medium 1 (n = ${n1.toFixed(2)})`, 20, 30);
      ctx.fillText(`Film (n = ${n2.toFixed(2)})`, 20, topY + 25);
      ctx.fillText(`Medium 3 (n = ${n3.toFixed(2)})`, 20, bottomY + 25);

      // 2. Calculate Ray Geometries
      const cx = w / 2 - 100; // Origin point on top surface
      const L = 300; // Arbitrary length for outer rays
      
      const dxInc = -L * Math.sin(thetaI);
      const dyInc = -L * Math.cos(thetaI);
      
      const dxRef1 = L * Math.sin(thetaI);
      const dyRef1 = -L * Math.cos(thetaI);
      
      const dxTrans = (thickness * scale) * Math.tan(thetaT);
      const dyTrans = thickness * scale;
      
      const dxRef2 = dxTrans;
      const dyRef2 = -dyTrans;
      
      const dxOut = L * Math.sin(thetaI);
      const dyOut = -L * Math.cos(thetaI);

      // Points
      const ptStart = { x: cx + dxInc, y: topY + dyInc };
      const ptOrigin = { x: cx, y: topY };
      const ptRef1End = { x: cx + dxRef1, y: topY + dyRef1 };
      const ptBottom = { x: cx + dxTrans, y: topY + dyTrans };
      const ptExit = { x: cx + 2 * dxTrans, y: topY };
      const ptOutEnd = { x: ptExit.x + dxOut, y: ptExit.y + dyOut };

      // Helper to draw waves along a line segment
      const drawWave = (p1, p2, k, omega, time, phi0, amplitude, color, phaseOffset = 0) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;
        const nx = -uy;
        const ny = ux;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        for (let s = 0; s <= dist; s += 1) {
          const phase = k * s - omega * time + phi0 + phaseOffset;
          const disp = amplitude * Math.cos(phase);
          const px = p1.x + s * ux + nx * disp;
          const py = p1.y + s * uy + ny * disp;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };

      // Wave parameters visually scaled
      const waveColor = wavelengthToRGB(wavelength);
      const k1 = (2 * Math.PI) / (wavelength * scale); // Wavenumber in medium 1
      const k2 = (2 * Math.PI) / ((wavelength / n2) * scale); // Wavenumber in medium 2
      const omega = 3; // Angular frequency for animation
      const amp = 15; // Wave amplitude pixels

      // Draw Incident Wave
      // The phase at origin is -omega*t. So starting point phase needs to be offset by k1 * distInc.
      const distInc = Math.sqrt(dxInc*dxInc + dyInc*dyInc);
      drawWave(ptStart, ptOrigin, k1, omega, t, -k1 * distInc, amp, 'rgba(255,255,255,0.4)');

      // Draw Reflected Ray 1 (Top Boundary)
      // If n2 > n1, phase shifts by PI
      drawWave(ptOrigin, ptRef1End, k1, omega, t, phaseShift1, amp, waveColor);
      
      // Draw Transmitted Ray (down)
      drawWave(ptOrigin, ptBottom, k2, omega, t, 0, amp * 0.8, waveColor);

      // Draw Reflected Ray 2 (Bottom Boundary)
      const distTrans = Math.sqrt(dxTrans*dxTrans + dyTrans*dyTrans);
      const phaseAtBottom = k2 * distTrans;
      drawWave(ptBottom, ptExit, k2, omega, t, phaseAtBottom + phaseShift2, amp * 0.8, waveColor);

      // Draw Transmitted Ray (out)
      const phaseAtExit = phaseAtBottom * 2 + phaseShift2;
      drawWave(ptExit, ptOutEnd, k1, omega, t, phaseAtExit, amp * 0.8, waveColor);

      // 3. Draw Detector / Interference Result Plane
      const detL = 120; // Distance along rays to draw the detector plane
      const dpx1 = cx + detL * Math.sin(thetaI);
      const dpy1 = topY - detL * Math.cos(thetaI);
      
      const dpx2 = ptExit.x + detL * Math.sin(thetaI);
      const dpy2 = ptExit.y - detL * Math.cos(thetaI);

      // Draw dotted line for detector plane
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(dpx1 - 20, dpy1 + 10);
      ctx.lineTo(dpx2 + 80, dpy2 - 40);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#aaa';
      ctx.fillText("Detector Plane", dpx2 + 90, dpy2 - 40);

      // 4. Draw Interference Result Graph (Bottom right)
      const graphX = w - 220;
      const graphY = h - 100;
      
      // Box
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(graphX, graphY - 60, 200, 120);
      ctx.strokeStyle = '#444';
      ctx.strokeRect(graphX, graphY - 60, 200, 120);
      
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText("Waves arriving at detector:", graphX + 10, graphY - 45);

      // Plot the two waves and their sum over time at the detector
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'; // Ray 1 color
      for(let i=0; i<180; i++) {
        // Phase of Ray 1 at detector
        const p1 = k1 * detL - omega * (t - i*0.02) + phaseShift1;
        const y = graphY + 15 + amp * Math.cos(p1);
        if(i===0) ctx.moveTo(graphX + 10 + i, y);
        else ctx.lineTo(graphX + 10 + i, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 150, 100, 0.5)'; // Ray 2 color
      for(let i=0; i<180; i++) {
        // Geometric projection distance of Ray 2 exiting point onto Ray 1 path
        const extraDist = 2 * (thickness * scale) * Math.tan(thetaT) * Math.sin(thetaI);
        const s2 = detL - extraDist;
        const p2 = k2 * (2 * distTrans) + k1 * s2 - omega * (t - i*0.02) + phaseShift2;
        const y = graphY + 15 + amp * Math.cos(p2);
        if(i===0) ctx.moveTo(graphX + 10 + i, y);
        else ctx.lineTo(graphX + 10 + i, y);
      }
      ctx.stroke();

      // Plot the SUM (Interference)
      ctx.beginPath();
      ctx.strokeStyle = waveColor;
      ctx.lineWidth = 3;
      for(let i=0; i<180; i++) {
        const p1 = k1 * detL - omega * (t - i*0.02) + phaseShift1;
        const extraDist = 2 * (thickness * scale) * Math.tan(thetaT) * Math.sin(thetaI);
        const s2 = detL - extraDist;
        const p2 = k2 * (2 * distTrans) + k1 * s2 - omega * (t - i*0.02) + phaseShift2;
        
        const sumDisp = (amp * Math.cos(p1) + amp * Math.cos(p2)) * 0.8;
        const y = graphY + 15 + sumDisp;
        if(i===0) ctx.moveTo(graphX + 10 + i, y);
        else ctx.lineTo(graphX + 10 + i, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;

      // Draw Boundary Highlights if phase shifted
      if (phaseShift1 > 0) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
        ctx.beginPath(); ctx.arc(cx, topY, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText("180° shift!", cx - 60, topY - 10);
      }
      if (phaseShift2 > 0) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
        ctx.beginPath(); ctx.arc(ptBottom.x, ptBottom.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText("180° shift!", ptBottom.x + 10, ptBottom.y + 15);
      }

    };

    let animationId;
    const loop = () => {
      draw();
      animationId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationId);
  }, [thickness, incidentAngleDeg, wavelength, n1, n2, n3, isPlaying]);

  return (
    <div className="flex flex-col md:flex-row bg-slate-950 text-slate-200 min-h-screen font-sans">
      {/* Canvas Area */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-3xl bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={500} 
            className="w-full h-auto block"
          />
        </div>
        
        {/* Interference intensity indicator */}
        <div className="mt-6 flex items-center gap-4 bg-slate-900 p-4 rounded-lg border border-slate-700 w-full max-w-3xl">
           <div className="text-sm font-semibold text-slate-400">Result:</div>
           <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-300" 
                style={{ 
                  width: `${interferenceAmplitude * 100}%`,
                  backgroundColor: wavelengthToRGB(wavelength),
                  boxShadow: `0 0 10px ${wavelengthToRGB(wavelength)}`
                }} 
              />
           </div>
           <div className="text-sm font-bold w-24 text-right">
             {interferenceAmplitude > 0.8 ? "Constructive" : interferenceAmplitude < 0.2 ? "Destructive" : "Partial"}
           </div>
        </div>
      </div>

      {/* Controls Area */}
      <div className="w-full md:w-96 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
        
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white">Thin-Film Calculator</h2>
          <p className="text-xs text-slate-400">Visualize the geometric path & phase shifts.</p>
        </div>

        {/* The Math Breakdown */}
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 font-mono text-sm shadow-inner">
          <div className="text-center mb-3 text-slate-300 font-semibold border-b border-slate-800 pb-2">
            Λ = 2n_f d cos(θ_t) ± λ₀/2
          </div>
          
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Geometric Path:</span>
            <span className="text-emerald-400">{geoPathDiff.toFixed(1)} nm</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Phase Shift Path:</span>
            <span className="text-rose-400">
               {shiftTerm > 0 ? `+ ${shiftTerm.toFixed(1)} nm` : "0 nm"}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800 font-bold text-white">
            <span>Total Eq. Path (Λ):</span>
            <span>{Math.abs(totalOpticalPath).toFixed(1)} nm</span>
          </div>
          <div className="text-right text-xs text-slate-500 mt-1">
             ({(totalOpticalPath / wavelength).toFixed(2)} × λ)
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5">
          
          <div>
             <label className="flex justify-between text-sm mb-1 font-medium">
               <span>Scenario Preset</span>
             </label>
             <select 
                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={preset}
                onChange={handlePresetChange}
             >
               <option value="soap">Soap Bubble (Air → Water → Air)</option>
               <option value="oil">Oil Slick (Air → Oil → Water)</option>
               <option value="ar">Anti-Reflective (Air → MgF₂ → Glass)</option>
               <option value="custom">Custom Configuration</option>
             </select>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-800">
             <div>
                <label className="flex justify-between text-sm mb-1 font-medium">
                  <span>Film Thickness (d)</span>
                  <span className="text-blue-400">{thickness} nm</span>
                </label>
                <input type="range" min="50" max="1000" value={thickness} onChange={e => setThickness(Number(e.target.value))} className="w-full accent-blue-500" />
             </div>

             <div>
                <label className="flex justify-between text-sm mb-1 font-medium">
                  <span>Incident Angle (θ_i)</span>
                  <span className="text-blue-400">{incidentAngleDeg}°</span>
                </label>
                <input type="range" min="0" max="80" value={incidentAngleDeg} onChange={e => setIncidentAngleDeg(Number(e.target.value))} className="w-full accent-blue-500" />
             </div>

             <div>
                <label className="flex justify-between text-sm mb-1 font-medium">
                  <span>Light Wavelength (λ₀)</span>
                  <span style={{color: wavelengthToRGB(wavelength)}} className="font-bold drop-shadow-md">
                    {wavelength} nm
                  </span>
                </label>
                <input type="range" min="380" max="750" value={wavelength} onChange={e => setWavelength(Number(e.target.value))} className="w-full accent-blue-500" />
             </div>
          </div>
          
          {preset === 'custom' && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
               <div>
                 <label className="block text-xs mb-1 text-slate-400">n1 (Top)</label>
                 <input type="number" step="0.01" value={n1} onChange={e => setN1(Number(e.target.value))} className="w-full bg-slate-800 p-1 rounded text-sm text-center" />
               </div>
               <div>
                 <label className="block text-xs mb-1 text-slate-400">n_f (Film)</label>
                 <input type="number" step="0.01" value={n2} onChange={e => setN2(Number(e.target.value))} className="w-full bg-slate-800 p-1 rounded text-sm text-center border border-blue-500/50" />
               </div>
               <div>
                 <label className="block text-xs mb-1 text-slate-400">n3 (Bottom)</label>
                 <input type="number" step="0.01" value={n3} onChange={e => setN3(Number(e.target.value))} className="w-full bg-slate-800 p-1 rounded text-sm text-center" />
               </div>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-slate-800">
             <button 
               onClick={() => setIsPlaying(!isPlaying)}
               className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${isPlaying ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
             >
               {isPlaying ? 'Pause Animation' : 'Play Animation'}
             </button>
          </div>

          <div className="bg-slate-800/50 rounded p-3 text-xs text-slate-400 mt-auto leading-relaxed border border-slate-800">
            <strong>Key Insight:</strong> Watch for the <span className="text-rose-400">180° shift!</span> indicators on the boundaries. If a wave reflects off a medium with a <em>higher</em> refractive index, it flips upside down. This is the source of the ±λ₀/2 term in the equation.
          </div>
          
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

// İkonlar (Lucide React ile uyumlu)
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const CloudIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19c0-1.7-1.3-3-3-3h-11a4 4 0 0 1-3.8-5c.3-1.2 1.3-2.5 2.7-2.5 1.4 0 2.5 1 2.5 2.5C5.7 8.2 8.4 7 10.5 7c2.8 0 5 2.2 5 5 .3-.1.5-.1.8-.1 2.3 0 4.2 1.8 4.2 4.1 0 2.3-1.9 4-4.2 4h-1.8z"/>
  </svg>
);

const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

interface BeamProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  animated?: boolean;
  encrypted?: boolean;
}

const AnimatedBeam: React.FC<BeamProps> = ({ from, to, color, animated = true, encrypted = false }) => {
  const pathData = `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${from.y + 60} ${to.x} ${to.y}`;
  
  return (
    <g>
      {/* Glow effect */}
      <motion.path
        d={pathData}
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity="0.3"
        filter="blur(2px)"
        strokeDasharray={encrypted ? "8 4" : "none"}
      />
      
      {/* Main beam */}
      <motion.path
        d={pathData}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeDasharray={encrypted ? "8 4" : "none"}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 1,
          strokeDashoffset: encrypted ? [0, -20] : 0
        }}
        transition={{
          pathLength: { duration: 1.5, ease: "easeInOut" },
          opacity: { duration: 0.5 },
          strokeDashoffset: encrypted ? {
            repeat: Infinity,
            duration: 2,
            ease: "linear"
          } : {}
        }}
      />
      
      {/* Animated particles */}
      {animated && (
        <motion.circle
          r="3"
          fill={color}
          opacity="0.8"
          initial={{ offsetDistance: "0%" }}
          animate={{ offsetDistance: "100%" }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2
          }}
          style={{
            offsetPath: `path('${pathData}')`,
          }}
        />
      )}
    </g>
  );
};

export default function SecretSharingFlow() {
  return (
    <div className="w-full min-h-[700px] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">

      {/* --- SEVİYE 1: MASTER SECRET (KÖK) --- */}
      <div className="relative z-10 mb-32 flex flex-col items-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8 text-center"
        >
          <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400 mb-2">
            Master Secret
          </h3>
          <p className="text-xs text-neutral-500">Shamir's Secret Sharing Protocol</p>
        </motion.div>
        
        <motion.div 
          className="w-24 h-24 rounded-full bg-black border-2 border-indigo-500 shadow-[0_0_40px_-5px_rgba(99,102,241,0.8)] flex items-center justify-center relative"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
        >
          {/* Pulse Efekti */}
          <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-20 animate-ping"></div>
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Shield className="w-10 h-10 text-indigo-400" />
          </motion.div>
        </motion.div>
      </div>

      {/* --- BAĞLANTI ÇİZGİLERİ (DYNAMIC SVG) --- */}
      <svg className="absolute top-[240px] w-full max-w-6xl h-[160px] pointer-events-none z-5" viewBox="0 0 1000 160">
        {/* Sol Çizgiler - Heir & Walrus */}
        <AnimatedBeam 
          from={{ x: 500, y: 0 }} 
          to={{ x: 150, y: 160 }} 
          color="#22c55e" 
          animated={true}
        />
        <AnimatedBeam 
          from={{ x: 500, y: 0 }} 
          to={{ x: 320, y: 160 }} 
          color="#3b82f6" 
          animated={true}
        />
        
        {/* Sağ (Şifreli) Çizgiler - Smart Contracts */}
        <AnimatedBeam 
          from={{ x: 500, y: 0 }} 
          to={{ x: 580, y: 160 }} 
          color="#a855f7" 
          animated={true}
          encrypted={true}
        />
        <AnimatedBeam 
          from={{ x: 500, y: 0 }} 
          to={{ x: 700, y: 160 }} 
          color="#a855f7" 
          animated={true}
          encrypted={true}
        />
        <AnimatedBeam 
          from={{ x: 500, y: 0 }} 
          to={{ x: 820, y: 160 }} 
          color="#a855f7" 
          animated={true}
          encrypted={true}
        />
      </svg>

      {/* --- SEVİYE 2: DAĞITILMIŞ PARÇALAR (NODES) --- */}
      <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 md:grid-cols-5 gap-6 px-4">
        
        {/* Node 1: Heir */}
        <motion.div 
          className="group relative flex flex-col items-center p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm hover:border-green-500/50 transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          whileHover={{ y: -5, scale: 1.02 }}
        >
          <div className="w-14 h-14 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:bg-green-500/20">
            <UserIcon />
          </div>
          <div className="text-base font-semibold text-white">Share 1</div>
          <div className="text-sm text-neutral-400">Heir (Direct)</div>
          
          {/* Bağlantı noktası üstte */}
          <div className="absolute -top-2 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
        </motion.div>

        {/* Node 2: Walrus */}
        <motion.div 
          className="group relative flex flex-col items-center p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          whileHover={{ y: -5, scale: 1.02 }}
        >
          <div className="w-14 h-14 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:bg-blue-500/20">
            <CloudIcon />
          </div>
          <div className="text-base font-semibold text-white">Share 2</div>
          <div className="text-sm text-neutral-400">Walrus Storage</div>
          <div className="absolute -top-2 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
        </motion.div>

        {/* SECURE ZONE: Smart Contracts (3 Nodes) */}
        <motion.div 
          className="col-span-1 md:col-span-3 relative p-[1px] rounded-2xl bg-gradient-to-r from-purple-500/20 via-purple-500/50 to-purple-500/20"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          {/* Encrypted Zone Label */}
          <motion.div 
            className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-900/90 px-4 py-2 rounded-full border border-purple-500/40 flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.5 }}
          >
            <LockIcon />
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Encrypted On-Chain</span>
          </motion.div>
          
          <div className="h-full bg-neutral-950/90 rounded-2xl p-6 grid grid-cols-3 gap-6">
            {/* Node 3 */}
            <motion.div 
              className="flex flex-col items-center text-center group cursor-pointer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2.0, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:bg-purple-500/30 transition-colors duration-300 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <CodeIcon />
              </div>
              <div className="text-sm font-bold text-white">Share 3</div>
              <div className="text-xs text-neutral-500">Contract A</div>
              <div className="absolute -top-2 w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)]"></div>
            </motion.div>

            {/* Node 4 */}
            <motion.div 
              className="flex flex-col items-center text-center group cursor-pointer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:bg-purple-500/30 transition-colors duration-300 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <CodeIcon />
              </div>
              <div className="text-sm font-bold text-white">Share 4</div>
              <div className="text-xs text-neutral-500">Contract B</div>
              <div className="absolute -top-2 w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)]"></div>
            </motion.div>

            {/* Node 5 */}
            <motion.div 
              className="flex flex-col items-center text-center group cursor-pointer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:bg-purple-500/30 transition-colors duration-300 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <CodeIcon />
              </div>
              <div className="text-sm font-bold text-white">Share 5</div>
              <div className="text-xs text-neutral-500">Contract C</div>
              <div className="absolute -top-2 w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)]"></div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* --- FOOTER INFO --- */}
      <motion.div 
        className="mt-16 flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 2.6, duration: 0.6 }}
      >
        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
        <span className="text-sm text-neutral-300">
          Minimum <strong className="text-white">3 Shares</strong> required to reconstruct the secret key.
        </span>
      </motion.div>

      {/* --- FLOATING PARTICLES --- */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-indigo-400 rounded-full opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}
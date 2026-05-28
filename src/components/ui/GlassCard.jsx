import React from 'react';

const GlassCard = ({ children, className = '', onClick, hoverable = true }) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md transition-all duration-300 ${
        hoverable ? 'hover:-translate-y-1 hover:bg-slate-900/50 hover:border-slate-700/60 hover:shadow-xl hover:shadow-blue-500/5' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Visual Accent/Glow inside the card header */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div className="p-5 relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;

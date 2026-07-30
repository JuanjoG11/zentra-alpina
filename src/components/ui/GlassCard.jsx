import React from 'react';

const GlassCard = ({ children, className = '', onClick, hoverable = true }) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 backdrop-blur-md shadow-sm transition-all duration-300 ${
        hoverable ? 'hover:-translate-y-1 hover:bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-indigo-500/10' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Visual Accent/Glow inside the card header */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 opacity-60" />
      <div className="p-5 relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;

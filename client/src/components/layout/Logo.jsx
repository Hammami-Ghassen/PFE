import React from 'react';

const Logo = ({ size = 'md', showText = true }) => {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-16 h-16' };

  return (
    <div className="flex items-center gap-3">
      <img
        src="/Logo_Ministère_de_la_santé_Tunisie_تونس_وزارة_الصحة.svg.png"
        alt="Logo Ministère de la Santé"
        className={`${sizes[size]} object-contain`}
      />
      {showText && (
        <div className="leading-tight">
          <p className="text-xs font-semibold text-white opacity-90">Ministère de la Santé</p>
          <p className="text-xs text-white opacity-60">Tunisie</p>
        </div>
      )}
    </div>
  );
};

export default Logo;

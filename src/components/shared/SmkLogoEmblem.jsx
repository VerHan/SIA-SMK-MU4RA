/* ============================================================
   SmkLogoEmblem.jsx — Emblem Resmi SMK Muhammadiyah 04 Bangsri
   
   Menampilkan logo khas Muhammadiyah dengan surya kuning emas (12 sinar),
   bingkai bernuansa Electric Blue #0046FF, serta monogram prestisius M4.
   Cocok untuk intro sinematik, navbar, footer, maupun kartu profil.
   ============================================================ */

import React from 'react';

export default function SmkLogoEmblem({ size = 'md', className = '', withRing = false, style = {} }) {
  const sizeMap = {
    sm: { box: 36, fontSize: 13, iconSize: 18, radius: 10, borderWidth: 1.5 },
    md: { box: 44, fontSize: 16, iconSize: 22, radius: 12, borderWidth: 2 },
    lg: { box: 64, fontSize: 24, iconSize: 32, radius: 18, borderWidth: 2.5 },
    intro: { box: 110, fontSize: 42, iconSize: 56, radius: 30, borderWidth: 3 },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* Optional Pulsing Shockwave Ring */}
      {withRing && (
        <div
          className="intro-logo-ring"
          style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: `${current.radius + 8}px`,
            border: '2px solid rgba(0, 70, 255, 0.75)',
            boxShadow: '0 0 25px rgba(0, 70, 255, 0.6)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main Emblem Shield / Squircle */}
      <div
        style={{
          width: `${current.box}px`,
          height: `${current.box}px`,
          borderRadius: `${current.radius}px`,
          background: 'linear-gradient(135deg, #001A66 0%, #0046FF 50%, #336BFF 100%)',
          border: `${current.borderWidth}px solid rgba(255, 255, 255, 0.45)`,
          boxShadow: size === 'intro'
            ? '0 0 50px rgba(0, 70, 255, 0.85), 0 0 20px rgba(255, 255, 255, 0.4), inset 0 0 20px rgba(0, 70, 255, 0.5)'
            : '0 4px 14px rgba(0, 70, 255, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Subtle Surya Background (Muhammadiyah Sunburst Watermark) */}
        <svg
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '130%',
            height: '130%',
            opacity: 0.22,
            pointerEvents: 'none',
          }}
        >
          {/* 12 Sunrays of Muhammadiyah */}
          {[...Array(12)].map((_, i) => (
            <polygon
              key={i}
              points="50,10 54,38 50,42 46,38"
              fill="#F59E0B"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="14" fill="#F59E0B" />
        </svg>

        {/* Monogram / Brand Initials */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2,
          lineHeight: 1,
        }}>
          <span style={{
            fontFamily: 'var(--font-family)',
            fontWeight: '900',
            fontSize: `${current.fontSize}px`,
            color: '#FFFFFF',
            letterSpacing: '-0.04em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
          }}>
            M4
          </span>
          {size === 'intro' && (
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.18em',
              color: '#FDE047',
              marginTop: '4px',
              textTransform: 'uppercase',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
            }}>
              BANGSRI
            </span>
          )}
        </div>

        {/* Sinar Surya Kuning Emas di Pojok Atas */}
        <span
          style={{
            position: 'absolute',
            top: size === 'intro' ? '8px' : '3px',
            right: size === 'intro' ? '8px' : '3px',
            width: size === 'intro' ? '18px' : '8px',
            height: size === 'intro' ? '18px' : '8px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FDE047 0%, #F59E0B 100%)',
            boxShadow: '0 0 12px #F59E0B',
            border: '1.5px solid #001A66',
            zIndex: 3,
          }}
          title="Surya Muhammadiyah"
        />
      </div>
    </div>
  );
}

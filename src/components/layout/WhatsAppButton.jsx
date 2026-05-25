import React, { useState } from 'react';

const WHATSAPP_NUMBER = '1134656584';
const WHATSAPP_MESSAGE = 'Hola! Me gustaría obtener más información.';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <style>{`
        .whatsapp-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          cursor: pointer;
        }

        .whatsapp-fab__tooltip {
          background: #fff;
          color: #111;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 14px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          white-space: nowrap;
          opacity: 0;
          transform: translateX(8px);
          transition: opacity 0.25s ease, transform 0.25s ease;
          pointer-events: none;
        }

        .whatsapp-fab:hover .whatsapp-fab__tooltip,
        .whatsapp-fab:focus .whatsapp-fab__tooltip {
          opacity: 1;
          transform: translateX(0);
        }

        .whatsapp-fab__icon {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #25D366;
          box-shadow: 0 4px 24px rgba(37, 211, 102, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          flex-shrink: 0;
        }

        .whatsapp-fab:hover .whatsapp-fab__icon {
          transform: scale(1.1);
          box-shadow: 0 6px 32px rgba(37, 211, 102, 0.6);
        }

        .whatsapp-fab__pulse {
          position: absolute;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: rgba(37, 211, 102, 0.4);
          animation: whatsapp-pulse 2.2s ease-out infinite;
          right: 0;
          bottom: 0;
        }

        @keyframes whatsapp-pulse {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .whatsapp-fab {
            bottom: 18px;
            right: 18px;
          }
          .whatsapp-fab__icon {
            width: 52px;
            height: 52px;
          }
          .whatsapp-fab__pulse {
            width: 52px;
            height: 52px;
          }
          .whatsapp-fab__tooltip {
            display: none;
          }
        }
      `}</style>

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
        {/* Pulse ring */}
        <div className="whatsapp-fab__pulse" style={{
          position: 'absolute',
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'rgba(37, 211, 102, 0.4)',
          animation: 'whatsapp-pulse 2.2s ease-out infinite',
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }} />

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-fab"
          aria-label="Contactar por WhatsApp"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          {/* Tooltip label */}
          <span className="whatsapp-fab__tooltip">
            ¡Chatea con nosotros!
          </span>

          {/* Button circle */}
          <div className="whatsapp-fab__icon">
            {/* Official WhatsApp SVG logo */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              width="30"
              height="30"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 4C12.954 4 4 12.954 4 24c0 3.552.932 6.888 2.566 9.782L4 44l10.49-2.536A19.916 19.916 0 0 0 24 44c11.046 0 20-8.954 20-20S35.046 4 24 4Z"
                fill="#fff"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 6.4C14.277 6.4 6.4 14.277 6.4 24c0 3.326.91 6.445 2.499 9.112l.318.536-1.877 6.854 7.049-1.847.522.304A17.556 17.556 0 0 0 24 41.6C33.723 41.6 41.6 33.723 41.6 24 41.6 14.277 33.723 6.4 24 6.4Z"
                fill="#25D366"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.84 14.4c-.432-1.008-.886-1.03-1.296-1.048-.336-.016-.72-.015-1.104-.015-.384 0-1.008.144-1.536.72-.528.576-2.016 1.968-2.016 4.8s2.064 5.568 2.352 5.952c.288.384 3.984 6.384 9.84 8.688 4.872 1.92 5.856 1.536 6.912 1.44 1.056-.096 3.408-1.392 3.888-2.736.48-1.344.48-2.496.336-2.736-.144-.24-.528-.384-1.104-.672-.576-.288-3.408-1.68-3.936-1.872-.528-.192-.912-.288-1.296.288-.384.576-1.488 1.872-1.824 2.256-.336.384-.672.432-1.248.144-.576-.288-2.43-.894-4.63-2.856-1.71-1.526-2.866-3.41-3.203-3.986-.336-.576-.036-.888.253-1.175.258-.258.576-.672.864-1.008.288-.336.384-.576.576-.96.192-.384.096-.72-.048-1.008-.144-.288-1.262-3.136-1.78-4.32Z"
                fill="#fff"
              />
            </svg>
          </div>
        </a>
      </div>
    </>
  );
}

'use client';

import React from 'react';

interface LegalPage {
  label: string;
  path: string;
}

interface FooterSignatureProps {
  companyName?: string;
  companyTagline?: string;
  legalPages?: LegalPage[];
  accentColor?: string;
  logoUrl?: string;
  style?: React.CSSProperties;
  LinkComponent?: any;
}

const FooterSignature: React.FC<FooterSignatureProps> = ({
  companyName = 'Your Company',
  companyTagline = 'All Rights Reserved',
  legalPages = [],
  accentColor = '#22c55e',
  logoUrl = 'https://res.cloudinary.com/de3gn7o77/image/upload/v1769591082/logo.png',
  style = {},
  LinkComponent = 'a',
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center',
          ...style,
        }}
      >
        {/* Column 1 - Copyright */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              color: '#e2e8f0',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            © {currentYear} {companyName}. {companyTagline}
          </div>
        </div>

        {/* Column 2 - Legal Links */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {legalPages && legalPages.length > 0 && legalPages.map((item) => {
            const linkProps: any = {
              key: item.label,
              href: item.path,
              style: {
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
              },
              onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = accentColor;
              },
              onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = '#e2e8f0';
              },
            };

            if (LinkComponent === 'a') {
              return <a {...linkProps}>[{item.label}]</a>;
            }
            return (
              <LinkComponent {...linkProps}>
                [{item.label}]
              </LinkComponent>
            );
          })}
        </div>

        {/* Column 3 - JRV Systems Branding */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <a
            href="https://jrvsystems.app"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            style={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              color: '#e2e8f0',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span className="jrv-glitch" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem' }}>DEV_BY:</span>
                <span style={{ fontSize: '0.75rem', color: accentColor }}>JRV_SYSTEMS</span>
              </div>
              <img
                src={logoUrl}
                alt="JRV Systems"
                width={48}
                height={48}
              style={{
                height: '3rem',
                width: 'auto',
                opacity: 0.5,
                filter: 'grayscale(100%)',
                transition: 'opacity 0.2s, filter 0.2s',
              }}
              className="footer-logo"
            />
            </span>
          </a>
        </div>
      </div>

      <style jsx global>{`
        .jrv-glitch {
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
          animation: jrv-glitch-continuous 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite !important;
        }
        .footer-link:hover .jrv-glitch {
          animation: none !important;
        }
        .footer-logo {
          opacity: 0.5;
          filter: grayscale(100%);
          transition: opacity 0.2s, filter 0.2s;
        }
        .footer-link:hover .footer-logo {
          opacity: 1 !important;
          filter: grayscale(0%) !important;
        }
        @media (max-width: 1023px) {
          .footer-logo {
            filter: grayscale(0%) !important;
            opacity: 1 !important;
          }
          .jrv-glitch {
            animation: jrv-glitch-continuous 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite !important;
          }
        }
        @keyframes jrv-glitch-continuous {
          0% {
            text-shadow: 0 0 0 rgba(0, 255, 0, 0);
            filter: drop-shadow(0 0 0 rgba(0, 255, 0, 0));
            transform: translateX(0);
          }
          15% {
            text-shadow: -2px 0 #00ff00, 2px 0 #ff00ff;
            filter: drop-shadow(-2px 0 0 #00ff00) drop-shadow(2px 0 0 #ff00ff);
            transform: translateX(-1px);
          }
          30% {
            text-shadow: -4px 2px #00ff00, 4px -2px #ff00ff;
            filter: drop-shadow(-4px 2px 0 #00ff00) drop-shadow(4px -2px 0 #ff00ff);
            transform: translateX(1px) scaleX(0.99);
          }
          45% {
            text-shadow: 2px -2px #ff00ff, -2px 2px #00ff00;
            filter: drop-shadow(2px -2px 0 #ff00ff) drop-shadow(-2px 2px 0 #00ff00);
            transform: translateX(-2px) scaleX(1.01);
          }
          60% {
            text-shadow: 3px 0 #00ff00, -3px 0 #ff00ff;
            filter: drop-shadow(3px 0 0 #00ff00) drop-shadow(-3px 0 0 #ff00ff);
            transform: translateX(2px);
          }
          75% {
            text-shadow: -1px 1px #ff00ff, 1px -1px #00ff00;
            filter: drop-shadow(-1px 1px 0 #ff00ff) drop-shadow(1px -1px 0 #00ff00);
            transform: translateX(-1px) scaleX(1);
          }
          90% {
            text-shadow: 1px 0 #00ff00, -1px 0 #ff00ff;
            filter: drop-shadow(1px 0 0 #00ff00) drop-shadow(-1px 0 0 #ff00ff);
            transform: translateX(1px);
          }
          100% {
            text-shadow: 0 0 0 rgba(0, 255, 0, 0);
            filter: drop-shadow(0 0 0 rgba(0, 255, 0, 0));
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default FooterSignature;

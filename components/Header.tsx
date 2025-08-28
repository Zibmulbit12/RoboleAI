import { FC } from 'react';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const MenuIcon: FC<{isOpen: boolean}> = ({isOpen}) => (
    <svg 
        className={`menu-svg ${isOpen ? 'open' : ''}`}
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
    >
        <path className="line top" d="M3 6h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path className="line middle" d="M3 12h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path className="line bottom" d="M3 18h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
);

export const Header: FC<HeaderProps> = ({ onMenuToggle, isMenuOpen }) => {
  return (
    <header className="header" aria-label="Główny nagłówek">
      <div className="header-title-container">
        <h1 className="header-title">
            Robole<span className="glitch-text" data-text="AI">AI</span>
        </h1>
        <span className="header-byline">Powered By GrzesKlep</span>
      </div>
      <button 
        className="menu-icon" 
        onClick={onMenuToggle} 
        aria-label="Menu nawigacyjne" 
        aria-expanded={isMenuOpen} 
        aria-controls="navigation-menu"
      >
        <MenuIcon isOpen={isMenuOpen} />
      </button>
    </header>
  );
};
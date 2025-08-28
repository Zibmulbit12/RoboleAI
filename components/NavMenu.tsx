import { FC } from 'react';
import { NavItem } from '../index';

interface NavMenuProps {
  isOpen: boolean;
  activePage: string;
  onNavigate: (page: string) => void;
  navItems: NavItem[];
}

export const NavMenu: FC<NavMenuProps> = ({ isOpen, activePage, onNavigate, navItems }) => {
  return (
    <nav id="navigation-menu" className={`nav-menu ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
      <ul>
        {navItems.map((item) => (
          <li key={item.name}>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.name);
              }}
              className={activePage === item.name ? 'active' : ''}
              aria-current={activePage === item.name ? 'page' : undefined}
            >
              <item.icon />
              {item.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

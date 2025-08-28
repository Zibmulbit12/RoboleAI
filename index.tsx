/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useState, FC, useEffect} from 'react';
import ReactDOM from 'react-dom/client';

import { Header } from './components/Header';
import { NavMenu } from './components/NavMenu';
import { SplashScreen } from './components/SplashScreen';

import StworzAgenta from './pages/StworzAgenta';
import MoiAgenci from './pages/MoiAgenci';
import GeneratorAI from './pages/GeneratorAI';
import NarzedziaIWezly from './pages/NarzedziaIWezly';
import InteraktywnySchemat from './pages/InteraktywnySchemat';
import GotoweProjekty from './pages/GotoweProjekty';
import BazaWiedzy from './pages/BazaWiedzy';
import Ustawienia from './pages/Ustawienia';
import WynikiPracy from './pages/WynikiPracy';

import { CreateAgentIcon, MyAgentsIcon, ToolsIcon, SchemaIcon, ProjectsIcon, SettingsIcon, ResultsIcon, SparklesIcon, DatabaseIcon } from './icons';

export interface NavItem {
    name: string;
    component: FC<any>; // Allow components to accept props
    icon: FC;
}

const navItems: NavItem[] = [
  { name: 'Stwórz Agenta', component: StworzAgenta, icon: CreateAgentIcon },
  { name: 'Moi Agenci', component: MoiAgenci, icon: MyAgentsIcon },
  { name: 'Generator AI', component: GeneratorAI, icon: SparklesIcon },
  { name: 'Narzędzia i Węzły', component: NarzedziaIWezly, icon: ToolsIcon },
  { name: 'Interaktywny schemat', component: InteraktywnySchemat, icon: SchemaIcon },
  { name: 'Gotowe projekty', component: GotoweProjekty, icon: ProjectsIcon },
  { name: 'Baza Wiedzy', component: BazaWiedzy, icon: DatabaseIcon },
  { name: 'Ustawienia', component: Ustawienia, icon: SettingsIcon },
  { name: 'Wyniki pracy', component: WynikiPracy, icon: ResultsIcon },
];

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Active page is now derived from the URL hash
  const getActivePageFromHash = () => {
    // Decode the hash to handle special characters and remove query params for matching
    let hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (hash.includes('?')) {
        hash = hash.substring(0, hash.indexOf('?'));
    }
    const pageExists = navItems.some(item => item.name === hash);
    return pageExists ? hash : navItems[0].name;
  };

  const [activePage, setActivePage] = useState(getActivePageFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getActivePageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    document.title = `Kreator Agentów - ${activePage}`;
  }, [activePage]);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigate = (page: string) => {
    // We update the hash, and the `hashchange` listener handles the state update
    window.location.hash = page;
    setIsMenuOpen(false);
  };
  
  const ActivePageComponent = navItems.find(item => item.name === activePage)?.component || StworzAgenta;

  if (isLoading) {
    return <SplashScreen onLoadingComplete={() => setIsLoading(false)} />;
  }

  return (
    <>
      <Header onMenuToggle={handleMenuToggle} isMenuOpen={isMenuOpen}/>
      <NavMenu 
        isOpen={isMenuOpen} 
        activePage={activePage} 
        onNavigate={handleNavigate}
        navItems={navItems}
      />
      <ActivePageComponent onNavigate={handleNavigate} />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
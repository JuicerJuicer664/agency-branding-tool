'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface Tab {
  label: string;
  path: string;
  iconName: string;
  description: string;
}

const tabs: Tab[] = [
  {
    label: 'Format 1',
    path: '/photo-upload-and-editor',
    iconName: 'PhotoIcon',
    description: 'Upload photos and generate branded overlays',
  },
  {
    label: 'Format 2',
    path: '/create-test',
    iconName: 'BeakerIcon',
    description: 'Experimental workspace for testing new overlay formats',
  },
];

interface TabNavigationProps {
  onTabChange?: (path: string) => void;
}

const TabNavigation = ({ onTabChange }: TabNavigationProps) => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>(pathname || tabs[0].path);
  const [switchedTab, setSwitchedTab] = useState<string | null>(null);
  const [showIndicator, setShowIndicator] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveTab(pathname || tabs[0].path);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTabClick = (path: string) => {
    if (path === activeTab) return;
    setActiveTab(path);
    setSwitchedTab(path);
    setShowIndicator(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowIndicator(false);
      setTimeout(() => setSwitchedTab(null), 150);
    }, 600);

    if (onTabChange) {
      onTabChange(path);
    }
  };

  return (
    <nav
      className="fixed top-16 left-0 right-0 z-[100] bg-[#111111] border-b border-white/10 shadow-elevation-sm"
      aria-label="Primary navigation"
    >
      <div className="flex items-end px-6 md:px-10 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.path || pathname === tab.path;
          const isJustSwitched = switchedTab === tab.path;

          return (
            <Link
              key={tab.path}
              href={tab.path}
              onClick={() => handleTabClick(tab.path)}
              aria-current={isActive ? 'page' : undefined}
              title={tab.description}
              className={`
                relative flex items-center gap-2 px-6 py-4 min-w-[44px] min-h-[44px]
                font-caption font-medium text-sm tracking-wide uppercase
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8002A]
                rounded-t-sm
                ${isActive
                  ? 'text-[#E8002A] border-b-2 border-[#E8002A] bg-white/5'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5 border-b-2 border-transparent'
                }
              `}
              style={{
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.08em',
                transition: 'color 80ms ease, background-color 80ms ease, border-color 80ms ease',
              }}
            >
              <Icon
                name={tab.iconName as any}
                size={18}
                variant={isActive ? 'solid' : 'outline'}
                className={isActive ? 'text-[#E8002A]' : 'text-muted-foreground'}
              />
              <span>{tab.label}</span>

              {/* Transition indicator: checkmark shown briefly after switching to this tab */}
              {isJustSwitched && (
                <span
                  className="ml-1 flex items-center justify-center"
                  style={{
                    opacity: showIndicator ? 1 : 0,
                    transform: showIndicator ? 'scale(1)' : 'scale(0.6)',
                    transition: 'opacity 150ms ease, transform 150ms ease',
                  }}
                  aria-hidden="true"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="7" cy="7" r="6.5" stroke="#E8002A" strokeOpacity="0.4" />
                    <path
                      d="M4 7L6.2 9.2L10 5"
                      stroke="#E8002A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}

              {isActive && (
                <span className="sr-only">(current page)</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNavigation;
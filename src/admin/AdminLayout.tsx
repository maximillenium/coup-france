import { useState } from 'react';
import {
  LayoutDashboard,
  Trophy,
  Gift,
  Flame,
  BookOpen,
  FileText,
  LogOut,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import { AdminUser } from '../types/index.ts';
import { Link } from '../utils/navigation.tsx';
import { AdminDashboard } from './AdminDashboard.tsx';
import { AdminBookmakers } from './AdminBookmakers.tsx';
import { AdminOffers } from './AdminOffers.tsx';
import { AdminPredictions } from './AdminPredictions.tsx';
import { AdminArticles } from './AdminArticles.tsx';
import { AdminPages } from './AdminPages.tsx';
import { AdminPasswordModal } from './AdminPasswordModal.tsx';

interface Props {
  user: AdminUser;
  onLogout: () => void;
}

export function AdminLayout({ user, onLogout }: Props) {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Панель управления', icon: LayoutDashboard },
    { id: 'bookmakers', label: 'Букмекеры', icon: Trophy },
    { id: 'offers', label: 'Бонусы и промокоды', icon: Gift },
    { id: 'predictions', label: 'Спортивные прогнозы', icon: Flame },
    { id: 'articles', label: 'Статьи и гайды', icon: BookOpen },
    { id: 'pages', label: 'Инфо-страницы и закон', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Боковая панель навигации */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Логотип и заголовок */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-display font-black text-sm">
              CF
            </div>
            <div>
              <span className="font-display font-black text-base tracking-tight text-white block">
                COUP<span className="text-emerald-400">FRANC</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest block">
                Панель управления
              </span>
            </div>
          </div>
        </div>

        {/* Список вкладок */}
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Ссылка на публичный сайт */}
        <div className="p-4 border-t border-slate-800/80">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <span>Перейти на сайт</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* Основная рабочая область */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Верхняя панель */}
        <header className="h-16 bg-slate-900/60 border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-300 font-medium">Вход выполнен:</span>
            <span className="text-emerald-400 font-bold">{user.email}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold text-slate-300">
              {user.role === 'admin' ? 'Администратор' : user.role}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Сменить пароль"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Сменить пароль</span>
            </button>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </header>

        {/* Тело раздела */}
        <main className="p-6 lg:p-8 flex-1 max-w-7xl w-full">
          {currentTab === 'dashboard' && (
            <AdminDashboard
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenPasswordModal={() => setPasswordModalOpen(true)}
            />
          )}
          {currentTab === 'bookmakers' && <AdminBookmakers />}
          {currentTab === 'offers' && <AdminOffers />}
          {currentTab === 'predictions' && <AdminPredictions />}
          {currentTab === 'articles' && <AdminArticles />}
          {currentTab === 'pages' && <AdminPages />}
        </main>
      </div>

      {/* Модальное окно изменения пароля */}
      <AdminPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}

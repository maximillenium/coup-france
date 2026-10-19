import { useEffect, useState } from 'react';
import {
  Trophy,
  Gift,
  Flame,
  BookOpen,
  FileCheck,
  KeyRound,
  ShieldAlert,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { api } from '../utils/api.ts';
import { DashboardStats } from '../types/index.ts';

interface Props {
  onNavigateTab: (tab: string) => void;
  onOpenPasswordModal: () => void;
}

export function AdminDashboard({ onNavigateTab, onOpenPasswordModal }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getAdminStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Букмекерские конторы',
      count: stats?.bookmakersCount ?? 0,
      icon: Trophy,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      tab: 'bookmakers',
    },
    {
      title: 'Бонусы и промо-акции',
      count: stats?.offersCount ?? 0,
      icon: Gift,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/30',
      tab: 'offers',
    },
    {
      title: 'Опубликованные прогнозы',
      count: stats?.predictionsCount ?? 0,
      icon: Flame,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/30',
      tab: 'predictions',
    },
    {
      title: 'Опубликованные статьи',
      count: stats?.publishedArticlesCount ?? 0,
      icon: BookOpen,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/30',
      tab: 'articles',
    },
    {
      title: 'Черновики статей',
      count: stats?.draftArticlesCount ?? 0,
      icon: FileCheck,
      color: 'text-slate-400',
      bgColor: 'bg-slate-800 border-slate-700',
      tab: 'articles',
    },
    {
      title: 'Активные промокоды',
      count: stats?.activePromoCodesCount ?? 0,
      icon: KeyRound,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30',
      tab: 'offers',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Главный приветственный блок */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest block mb-1">
            Панель управления администратора
          </span>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Управление порталом CoupFranc
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Управляйте партнерами-букмекерами, партнерскими ссылками, промокодами, публикуйте спортивные прогнозы и редакционные материалы в режиме реального времени.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('articles')}
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Новая статья</span>
          </button>
          <button
            onClick={() => onNavigateTab('predictions')}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Новый прогноз</span>
          </button>
        </div>
      </div>

      {/* Сетка ключевых показателей */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <button
              key={i}
              onClick={() => onNavigateTab(c.tab)}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${c.bgColor} ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
              </div>
              <div>
                <span className="text-2xl font-display font-black text-white tabular-nums block">
                  {loading ? '...' : c.count}
                </span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  {c.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Быстрые действия и проверка состояния системы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Быстрые действия */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-white">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => onNavigateTab('bookmakers')}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-white block">Управление букмекерами</span>
              <span className="text-slate-400 text-[11px]">Партнерские ссылки, логотипы и рейтинги</span>
            </button>
            <button
              onClick={() => onNavigateTab('offers')}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-white block">Промокоды и бонусы</span>
              <span className="text-slate-400 text-[11px]">Суммы бонусов, вейджеры и коды</span>
            </button>
            <button
              onClick={() => onNavigateTab('pages')}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-white block">Инфо-страницы и право</span>
              <span className="text-slate-400 text-[11px]">Политика конфиденциальности, 18+ и правила</span>
            </button>
            <button
              onClick={onOpenPasswordModal}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left hover:border-emerald-500/50 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-white block">Безопасность и пароль</span>
              <span className="text-slate-400 text-[11px]">Изменить пароль текущего администратора</span>
            </button>
          </div>
        </div>

        {/* Состояние развертывания и архитектура */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Состояние архитектуры и развертывания</span>
          </h2>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
              <span>Хранилище данных:</span>
              <span className="text-emerald-400 font-mono font-semibold">./data/database.json</span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
              <span>Каталог загрузки медиа:</span>
              <span className="text-emerald-400 font-mono font-semibold">./data/uploads</span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
              <span>Защита от подбора паролей:</span>
              <span className="text-emerald-400 font-semibold">Активна (макс. 5 попыток / IP)</span>
            </li>
            <li className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
              <span>Docker & Prisma для VPS:</span>
              <span className="text-emerald-400 font-semibold">Сконфигурированы и готовы</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

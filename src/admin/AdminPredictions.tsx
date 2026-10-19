import { useEffect, useState } from 'react';
import { Flame, Plus, Pencil, Trash2, Search, Check, X, AlertCircle } from 'lucide-react';
import { api } from '../utils/api.ts';
import { SportsPrediction, Bookmaker } from '../types/index.ts';

export function AdminPredictions() {
  const [predictions, setPredictions] = useState<SportsPrediction[]>([]);
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SportsPrediction> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [preds, bms] = await Promise.all([api.getPredictions(true), api.getBookmakers(true)]);
      setPredictions(preds);
      setBookmakers(bms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setEditingItem({
      id: '',
      title: '',
      slug: '',
      sport: 'Football',
      competition: 'Ligue 1',
      homeTeam: '',
      awayTeam: '',
      homeLogo: '',
      awayLogo: '',
      eventDate: new Date().toISOString().split('T')[0],
      eventTime: '20:45',
      predictionChoice: '',
      odds: '1.85',
      confidencePercent: 75,
      recommendedBookmaker: bookmakers[0]?.name || '1xBet',
      editorialAnalysis: '',
      statistics: [
        { stat: 'Moyenne de buts supérieure à 2.5 sur les 5 dernières confrontations.', source: 'Opta' },
      ],
      isFeatured: false,
      status: 'published',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (pred: SportsPrediction) => {
    setEditingItem({ ...pred });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePrediction(id);
      setPredictions((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
      setFeedback({ message: 'Прогноз успешно удалён.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при удалении', type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.homeTeam || !editingItem?.awayTeam) return;

    const slug =
      editingItem.slug ||
      `pronostic-${editingItem.homeTeam}-${editingItem.awayTeam}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setSaving(true);

    try {
      await api.savePrediction({ ...editingItem, slug });
      await loadData();
      setIsModalOpen(false);
      setEditingItem(null);
      setFeedback({ message: 'Спортивный прогноз успешно сохранён.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при сохранении', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = predictions.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      p.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      p.competition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-white">
            Управление спортивными прогнозами
          </h2>
          <p className="text-xs text-slate-400">
            Публикация и редактирование анализов, коэффициентов и статистики матчей
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Новый прогноз</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/50 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Поиск */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по команде, турниру или названию..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Таблица прогнозов */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3 px-4">Матч и заголовок</th>
                <th className="py-3 px-4">Турнир</th>
                <th className="py-3 px-4">Дата / Время</th>
                <th className="py-3 px-4">Выбор и кэф</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Загрузка данных...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Прогнозы не найдены.
                  </td>
                </tr>
              ) : (
                filtered.map((pred) => (
                  <tr key={pred.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-bold text-white block truncate">{pred.title}</span>
                      <span className="text-[11px] text-slate-400">{pred.homeTeam} vs {pred.awayTeam}</span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {pred.competition}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {pred.eventDate} · {pred.eventTime}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white block font-medium truncate">{pred.predictionChoice}</span>
                      <span className="font-mono text-emerald-400 font-bold tabular-nums">@ {pred.odds}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          pred.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pred.status === 'published' ? 'Опубликован' : 'Черновик'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(pred)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          title="Редактировать"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(pred.id)}
                          className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Подтверждение удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-white">Удалить этот прогноз?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Вы действительно хотите навсегда удалить этот спортивный прогноз?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания / редактирования */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 my-8 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-lg text-white mb-4">
              {editingItem.id ? 'Редактировать прогноз' : 'Новый спортивный прогноз'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Заголовок афиши *</label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="например: Paris SG vs Marseille : Le Classique de Ligue 1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Турнир / Лина *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.competition || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, competition: e.target.value })}
                    placeholder="например: Ligue 1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Хозяева (Команда 1) *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.homeTeam || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, homeTeam: e.target.value })}
                    placeholder="Paris SG"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Гости (Команда 2) *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.awayTeam || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, awayTeam: e.target.value })}
                    placeholder="Marseille"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Дата события</label>
                  <input
                    type="date"
                    required
                    value={editingItem.eventDate || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, eventDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Время начала</label>
                  <input
                    type="time"
                    required
                    value={editingItem.eventTime || '20:45'}
                    onChange={(e) => setEditingItem({ ...editingItem, eventTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Коэффициент *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.odds || '1.85'}
                    onChange={(e) => setEditingItem({ ...editingItem, odds: e.target.value })}
                    placeholder="1.85"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Уверенность (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingItem.confidencePercent || 75}
                    onChange={(e) => setEditingItem({ ...editingItem, confidencePercent: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Выбор / Исход ставки *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.predictionChoice || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, predictionChoice: e.target.value })}
                    placeholder="например: Победа Paris SG и тотал больше 2.5"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Рекомендуемый букмекер</label>
                  <select
                    value={editingItem.recommendedBookmaker || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, recommendedBookmaker: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {bookmakers.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Анализ матча и аргументация *</label>
                <textarea
                  rows={4}
                  required
                  value={editingItem.editorialAnalysis || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, editorialAnalysis: e.target.value })}
                  placeholder="Опишите текущую форму команд, ключевые потери, тактический рисунок игры..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingItem.isFeatured || false}
                    onChange={(e) => setEditingItem({ ...editingItem, isFeatured: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <span>Закрепить на главной (Матч тура)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingItem.status === 'published'}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        status: e.target.checked ? 'published' : 'draft',
                      })
                    }
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <span>Опубликован на сайте</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-wider cursor-pointer font-display"
                >
                  {saving ? 'Сохранение...' : 'Сохранить прогноз'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

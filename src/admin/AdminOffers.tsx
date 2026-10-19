import { useEffect, useState } from 'react';
import { Gift, Plus, Pencil, Trash2, Search, Check, X, AlertCircle } from 'lucide-react';
import { api } from '../utils/api.ts';
import { PromotionalOffer, Bookmaker } from '../types/index.ts';

export function AdminOffers() {
  const [offers, setOffers] = useState<PromotionalOffer[]>([]);
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PromotionalOffer> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [offs, bms] = await Promise.all([api.getOffers(true), api.getBookmakers(true)]);
      setOffers(offs);
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
      bookmakerId: bookmakers[0]?.id || 'bm_1xbet',
      bookmakerName: bookmakers[0]?.name || '1xBet',
      title: '',
      slug: '',
      offerType: 'Bienvenue',
      bonusAmount: '100 €',
      promoCode: 'COUPFRANC',
      affiliateUrl: 'https://example.com/affiliate?promo=coupfranc',
      ctaLabel: "Activer l'offre",
      terms: 'Nouveaux joueurs uniquement. 18+. Conditions de mise applicables.',
      expirationDate: '2026-12-31',
      isFeatured: false,
      status: 'published',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (offer: PromotionalOffer) => {
    setEditingItem({ ...offer });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteOffer(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      setDeleteConfirmId(null);
      setFeedback({ message: 'Бонусное предложение успешно удалено.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при удалении', type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title) return;

    const slug = editingItem.slug || editingItem.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setSaving(true);

    try {
      await api.saveOffer({ ...editingItem, slug });
      await loadData();
      setIsModalOpen(false);
      setEditingItem(null);
      setFeedback({ message: 'Бонусная акция успешно сохранена.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка сохранения', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = offers.filter(
    (o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.bookmakerName.toLowerCase().includes(search.toLowerCase()) ||
      o.promoCode.toLowerCase().includes(search.toLowerCase())
  );

  const offerTypeLabels: Record<string, string> = {
    'Bienvenue': 'Приветственный бонус',
    'Freebet': 'Фрибет (Freebet)',
    'Dépôt': 'Бонус на депозит',
    'Cashback': 'Кэшбэк',
    'Combiné': 'Бонус на экспресс',
  };

  return (
    <div className="space-y-6">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-white">
            Управление бонусами и промокодами
          </h2>
          <p className="text-xs text-slate-400">
            Создание и редактирование бонусных предложений, сумм, вейджеров и условий
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить бонус</span>
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
          placeholder="Поиск по названию, букмекеру или промокоду..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Таблица бонусов */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3 px-4">Название акции</th>
                <th className="py-3 px-4">Букмекер</th>
                <th className="py-3 px-4">Тип</th>
                <th className="py-3 px-4">Сумма</th>
                <th className="py-3 px-4">Промокод</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Загрузка данных...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Бонусные предложения не найдены.
                  </td>
                </tr>
              ) : (
                filtered.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                      {offer.title}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {offer.bookmakerName}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {offerTypeLabels[offer.offerType] || offer.offerType}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {offer.bonusAmount}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                      {offer.promoCode}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          offer.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {offer.status === 'published' ? 'Опубликован' : 'Черновик'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(offer)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          title="Редактировать"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(offer.id)}
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
            <h3 className="font-bold text-base text-white">Удалить предложение?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Вы действительно хотите навсегда удалить эту бонусную акцию?
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

      {/* Модальное окно редактирования / создания */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 my-8 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-lg text-white mb-4">
              {editingItem.id ? 'Редактировать бонусное предложение' : 'Новое бонусное предложение'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Букмекер *</label>
                  <select
                    value={editingItem.bookmakerId || ''}
                    onChange={(e) => {
                      const selectedBm = bookmakers.find((b) => b.id === e.target.value);
                      setEditingItem({
                        ...editingItem,
                        bookmakerId: e.target.value,
                        bookmakerName: selectedBm ? selectedBm.name : '',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {bookmakers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Тип бонуса</label>
                  <select
                    value={editingItem.offerType || 'Bienvenue'}
                    onChange={(e) => setEditingItem({ ...editingItem, offerType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Bienvenue">Приветственный бонус</option>
                    <option value="Freebet">Фрибет (Freebet)</option>
                    <option value="Dépôt">Бонус на депозит</option>
                    <option value="Cashback">Кэшбэк</option>
                    <option value="Combiné">Бонус на экспресс</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Название акции *</label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="например: 100% бонус до 130€"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Отображаемая сумма *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.bonusAmount || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, bonusAmount: e.target.value })}
                    placeholder="например: 130 €"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Промокод</label>
                  <input
                    type="text"
                    value={editingItem.promoCode || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, promoCode: e.target.value })}
                    placeholder="COUPFRANC"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Партнерская ссылка (Affiliate URL)</label>
                <input
                  type="url"
                  value={editingItem.affiliateUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, affiliateUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Условия акции (Вейджер, мин. коэффициент и др.)</label>
                <textarea
                  rows={2}
                  value={editingItem.terms || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, terms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
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
                  <span>Закрепить на главной странице</span>
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
                  {saving ? 'Сохранение...' : 'Сохранить предложение'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

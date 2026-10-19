import { useEffect, useState } from 'react';
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { api } from '../utils/api.ts';
import { Bookmaker } from '../types/index.ts';

export function AdminBookmakers() {
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Bookmaker> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.getBookmakers(true);
      setBookmakers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = () => {
    setEditingItem({
      id: '',
      name: '',
      slug: '',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=160&auto=format&fit=crop&q=80',
      rating: 4.5,
      bonusSummary: '',
      promoCode: 'COUPFRANC',
      affiliateUrl: 'https://example.com/affiliate?tag=coupfranc',
      ctaLabel: "Profiter de l'offre",
      offerTerms: '18+. Conditions applicables. Jouez responsable.',
      shortDescription: '',
      fullDescription: '',
      features: ['Paris en direct', 'Application mobile', 'Streaming'],
      depositMethods: ['Visa / Mastercard', 'Virement', 'Cryptomonnaies'],
      withdrawalMethods: ['Virement bancaire', 'E-wallets'],
      minDeposit: '1 €',
      isFeatured: false,
      status: 'published',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (bm: Bookmaker) => {
    setEditingItem({ ...bm });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteBookmaker(id);
      setBookmakers((prev) => prev.filter((b) => b.id !== id));
      setDeleteConfirmId(null);
      setFeedback({ message: 'Букмекер успешно удалён.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при удалении букмекера.', type: 'error' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadImage(file);
      setEditingItem((prev) => (prev ? { ...prev, logo: res.url } : null));
      setFeedback({ message: 'Логотип успешно загружен.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при загрузке изображения', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name) return;

    const slug = editingItem.slug || editingItem.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setSaving(true);

    try {
      const payload = {
        ...editingItem,
        slug,
      };
      await api.saveBookmaker(payload);
      await loadData();
      setIsModalOpen(false);
      setEditingItem(null);
      setFeedback({ message: 'Данные букмекера успешно сохранены.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при сохранении', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = bookmakers.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.promoCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-white">
            Управление букмекерами
          </h2>
          <p className="text-xs text-slate-400">
            Настройка операторов, партнерских ссылок, промокодов и условий бонусов
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить букмекера</span>
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
          placeholder="Поиск по названию или промокоду..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Таблица букмекеров */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3 px-4">Букмекер</th>
                <th className="py-3 px-4">Оценка</th>
                <th className="py-3 px-4">Промокод</th>
                <th className="py-3 px-4">Бонус</th>
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
                    Букмекеры не найдены.
                  </td>
                </tr>
              ) : (
                filtered.map((bm) => (
                  <tr key={bm.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={bm.logo}
                          alt={bm.name}
                          className="w-8 h-8 rounded-lg object-cover bg-slate-800"
                        />
                        <div>
                          <span className="font-bold text-white block">{bm.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{bm.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-amber-400 tabular-nums">
                      {bm.rating.toFixed(1)} / 5
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-emerald-400 font-bold text-[11px]">
                        {bm.promoCode || 'НЕТ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                      {bm.bonusSummary}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          bm.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {bm.status === 'published' ? 'Опубликован' : 'Черновик'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(bm)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          title="Редактировать"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(bm.id)}
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

      {/* Модальное окно подтверждения удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-white">Подтвердить удаление</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Вы уверены, что хотите удалить этого букмекера? Это действие необратимо.
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
              {editingItem.id ? `Редактировать ${editingItem.name}` : 'Добавить нового букмекера'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Название букмекера *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">URL-идентификатор (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.slug || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                    placeholder="например: 1xbet"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              {/* Логотип */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Логотип (URL или загрузка файла)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingItem.logo || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, logo: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                  <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Загрузка...' : 'Загрузить файл'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Оценка (из 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingItem.rating || 4.5}
                    onChange={(e) => setEditingItem({ ...editingItem, rating: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
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
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Минимальный депозит</label>
                  <input
                    type="text"
                    value={editingItem.minDeposit || '1 €'}
                    onChange={(e) => setEditingItem({ ...editingItem, minDeposit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Описание бонуса */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Краткое описание приветственного бонуса</label>
                <input
                  type="text"
                  value={editingItem.bonusSummary || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, bonusSummary: e.target.value })}
                  placeholder="например: 100% бонус до 130€ на первый депозит"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Партнерская ссылка (Affiliate URL)</label>
                  <input
                    type="url"
                    value={editingItem.affiliateUrl || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, affiliateUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Текст на кнопке действия</label>
                  <input
                    type="text"
                    value={editingItem.ctaLabel || "Profiter de l'offre"}
                    onChange={(e) => setEditingItem({ ...editingItem, ctaLabel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Описания */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Краткое описание (Tagline)</label>
                <textarea
                  rows={2}
                  value={editingItem.shortDescription || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Полный обзор и подробное описание</label>
                <textarea
                  rows={4}
                  value={editingItem.fullDescription || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, fullDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Условия акции (T&Cs)</label>
                <input
                  type="text"
                  value={editingItem.offerTerms || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, offerTerms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              {/* Чекбоксы публикации */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingItem.isFeatured || false}
                    onChange={(e) => setEditingItem({ ...editingItem, isFeatured: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <span>Закрепить на главной (Рекомендуемый)</span>
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
                  {saving ? 'Сохранение...' : 'Сохранить букмекера'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

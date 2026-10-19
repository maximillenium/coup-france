import { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  X,
  Upload,
  Eye,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { api } from '../utils/api.ts';
import { Article } from '../types/index.ts';

export function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Article> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [arts, cats] = await Promise.all([api.getArticles(undefined, true), api.getCategories()]);
      setArticles(arts);
      setCategories(cats);
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
      excerpt: '',
      content: '<h2>Введение</h2>\n<p>Введите текст статьи или анализа...</p>\n\n<h3>Ключевые моменты</h3>\n<ul>\n  <li>Первый важный пункт</li>\n  <li>Второй важный пункт</li>\n</ul>',
      featuredImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
      imageAlt: '',
      category: categories[0] || 'Guide & Stratégie',
      author: 'La Rédaction CoupFranc',
      readingTime: '5 min',
      isFeatured: false,
      status: 'published',
    });
    setActiveTab('edit');
    setIsModalOpen(true);
  };

  const handleEdit = (art: Article) => {
    setEditingItem({ ...art });
    setActiveTab('edit');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirmId(null);
      setFeedback({ message: 'Статья успешно удалена.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при удалении', type: 'error' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadImage(file);
      setEditingItem((prev) => (prev ? { ...prev, featuredImage: res.url } : null));
      setFeedback({ message: 'Изображение успешно загружено.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при загрузке файла', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.content) return;

    const slug =
      editingItem.slug ||
      editingItem.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    setSaving(true);

    try {
      await api.saveArticle({
        ...editingItem,
        slug,
        imageAlt: editingItem.imageAlt || editingItem.title,
      });
      await loadData();
      setIsModalOpen(false);
      setEditingItem(null);
      setFeedback({ message: 'Статья успешно сохранена.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка сохранения', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()) ||
      a.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-white">
            Управление статьями и гайдами
          </h2>
          <p className="text-xs text-slate-400">
            Создание, редактирование и публикация аналитических статей с редактором и загрузкой изображений
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Написать статью</span>
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
          placeholder="Поиск по названию, категории или автору..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Таблица статей */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
              <tr>
                <th className="py-3 px-4">Статья</th>
                <th className="py-3 px-4">Категория</th>
                <th className="py-3 px-4">Автор</th>
                <th className="py-3 px-4">Время чтения</th>
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
                    Статьи не найдены.
                  </td>
                </tr>
              ) : (
                filtered.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 max-w-sm">
                      <div className="flex items-center gap-3">
                        <img
                          src={art.featuredImage}
                          alt={art.title}
                          className="w-10 h-7 rounded object-cover bg-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{art.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono truncate block">
                            /{art.slug}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {art.category}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {art.author}
                    </td>
                    <td className="py-3 px-4 text-slate-400 tabular-nums">
                      {art.readingTime}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          art.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {art.status === 'published' ? 'Опубликован' : 'Черновик'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(art)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          title="Редактировать"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(art.id)}
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
            <h3 className="font-bold text-base text-white">Удалить эту статью?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Вы действительно хотите удалить эту статью? По ее адресу будет возвращаться ошибка 404.
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

      {/* Модальное окно редактора статей */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 my-8 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4 pr-8">
              <h3 className="font-display font-bold text-lg text-white">
                {editingItem.id ? 'Редактировать статью' : 'Новая статья'}
              </h3>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'edit'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Редактор
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Предпросмотр
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Заголовок статьи *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    placeholder="например: Как рассчитать вейджер (Rollover) бонуса букмекера"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Категория</label>
                    <select
                      value={editingItem.category || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Автор</label>
                    <input
                      type="text"
                      value={editingItem.author || 'La Rédaction CoupFranc'}
                      onChange={(e) => setEditingItem({ ...editingItem, author: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Время чтения</label>
                    <input
                      type="text"
                      value={editingItem.readingTime || '5 min'}
                      onChange={(e) => setEditingItem({ ...editingItem, readingTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </div>

                {/* Загрузка картинки */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Главное изображение (URL или файл)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingItem.featuredImage || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, featuredImage: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                    />
                    <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploading ? 'Загрузка...' : 'Файл'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Краткий анонс / Лид *</label>
                  <textarea
                    rows={2}
                    required
                    value={editingItem.excerpt || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, excerpt: e.target.value })}
                    placeholder="Краткое привлекательное описание для списков и поисковых систем..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                {/* Текст статьи */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-medium">Текст статьи (Форматированный HTML) *</label>
                    <span className="text-[10px] text-slate-500">Поддерживаются теги: h2, h3, p, ul, ol, li, code, strong</span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    value={editingItem.content || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Статус публикации */}
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
                    {saving ? 'Сохранение...' : 'Сохранить статью'}
                  </button>
                </div>
              </form>
            ) : (
              /* Предпросмотр в реальном времени */
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={editingItem.featuredImage}
                    alt={editingItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="font-display font-black text-2xl text-white">
                  {editingItem.title}
                </h2>
                <p className="text-slate-300 text-sm italic border-l-2 border-emerald-500 pl-3">
                  {editingItem.excerpt}
                </p>
                <div
                  className="prose prose-invert prose-emerald text-xs text-slate-200 space-y-3"
                  dangerouslySetInnerHTML={{ __html: editingItem.content || '' }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

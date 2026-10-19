import { useEffect, useState } from 'react';
import { Save, Check, AlertCircle, Eye } from 'lucide-react';
import { api } from '../utils/api.ts';
import { InformationalPage } from '../types/index.ts';

export function AdminPages() {
  const [pages, setPages] = useState<InformationalPage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('jeu-responsable');
  const [currentPage, setCurrentPage] = useState<InformationalPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const all = await api.getAllPages();
        setPages(all);
        const match = all.find((p) => p.slug === selectedSlug) || all[0];
        if (match) setCurrentPage({ ...match });
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const handleSelectPage = (slug: string) => {
    setSelectedSlug(slug);
    const match = pages.find((p) => p.slug === slug);
    if (match) setCurrentPage({ ...match });
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPage) return;
    setSaving(true);
    try {
      const updated = await api.savePage(currentPage);
      setPages((prev) => prev.map((p) => (p.slug === updated.slug ? updated : p)));
      setFeedback({ message: 'Страница успешно сохранена!', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Ошибка при сохранении', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const pageLabels: Record<string, string> = {
    'jeu-responsable': 'Ответственная игра и защита 18+',
    'mentions-legales': 'Юридическая информация',
    'politique-de-confidentialite': 'Политика конфиденциальности (GDPR)',
    'gestion-des-cookies': 'Управление файлами cookie',
    'a-propos': 'О проекте CoupFranc',
    'contact': 'Страница контактов',
  };

  return (
    <div className="space-y-6">
      {/* Шапка раздела */}
      <div>
        <h2 className="font-display font-bold text-xl text-white">
          Управление информационными и правовыми страницами
        </h2>
        <p className="text-xs text-slate-400">
          Обновляйте содержимое юридических страниц, политику конфиденциальности, правила ответственной игры без правок в коде.
        </p>
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

      {/* Вкладки выбора страниц */}
      <div className="flex flex-wrap gap-2">
        {pages.map((p) => (
          <button
            key={p.slug}
            onClick={() => handleSelectPage(p.slug)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedSlug === p.slug
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {pageLabels[p.slug] || p.title}
          </button>
        ))}
      </div>

      {/* Блок редактора */}
      {currentPage && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                /{currentPage.slug}
              </span>
              <h3 className="font-display font-bold text-lg text-white">
                Редактирование: {currentPage.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewMode ? 'Редактор' : 'Предпросмотр'}</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer font-display"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
            </div>
          </div>

          {previewMode ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[400px]">
              <h1 className="text-2xl font-display font-black text-white mb-4">
                {currentPage.title}
              </h1>
              <div
                className="prose prose-invert prose-emerald text-xs text-slate-200 space-y-4"
                dangerouslySetInnerHTML={{ __html: currentPage.content }}
              />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Заголовок страницы</label>
                <input
                  type="text"
                  required
                  value={currentPage.title}
                  onChange={(e) => setCurrentPage({ ...currentPage, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">SEO Описание (Meta Description)</label>
                <input
                  type="text"
                  value={currentPage.metaDescription}
                  onChange={(e) => setCurrentPage({ ...currentPage, metaDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">Форматированный текст (HTML)</label>
                  <span className="text-[10px] text-slate-500">Поддерживаются теги: h2, h3, p, ul, ol, li, code, strong</span>
                </div>
                <textarea
                  rows={16}
                  required
                  value={currentPage.content}
                  onChange={(e) => setCurrentPage({ ...currentPage, content: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer font-display"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

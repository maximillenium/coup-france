import { useState } from 'react';
import { Gift, Copy, Check, ExternalLink } from 'lucide-react';
import { PromotionalOffer } from '../types/index.ts';

interface OfferCardProps {
  offer: PromotionalOffer;
}

export function OfferCard({ offer }: OfferCardProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!offer.promoCode) return;
    navigator.clipboard.writeText(offer.promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
      <div>
        {/* Top meta */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase tracking-wider">{offer.bookmakerName}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400 font-semibold">{offer.offerType}</span>
          </div>
          {offer.expirationDate && (
            <span className="text-[11px] text-slate-400">
              Expire le {offer.expirationDate}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-display font-bold text-base mb-3 leading-snug">
          {offer.title}
        </h3>

        {/* Big bonus amount highlight */}
        <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-lg p-3.5 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Montant du Bonus</span>
            <span className="text-xl font-display font-black text-emerald-400">
              {offer.bonusAmount}
            </span>
          </div>
          <Gift className="w-6 h-6 text-emerald-400/80" />
        </div>

        {/* Terms summary */}
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
          {offer.terms}
        </p>
      </div>

      {/* Action Area */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        {offer.promoCode && (
          <div className="flex items-center justify-between gap-2 bg-slate-950 border border-dashed border-slate-700 rounded-lg px-3 py-1.5">
            <div>
              <span className="text-[10px] text-slate-400 block">Code Promo :</span>
              <span className="font-mono font-bold text-emerald-400 text-xs tracking-wider">
                {offer.promoCode}
              </span>
            </div>
            <button
              onClick={copyCode}
              type="button"
              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        )}

        <a
          href={offer.affiliateUrl || '#'}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <span>{offer.ctaLabel || 'Activer le bonus'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

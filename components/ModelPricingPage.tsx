import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Video, Maximize, Scissors, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SEEDREAM_CREDITS_COST,
  REMOVE_BG_CREDITS_COST,
  getMinimaxCreditsCost,
  getWanCreditsCost,
  getPixVerseCreditsCost,
  getLtxCreditsCost,
  getRunwayCreditsCost,
  getKlingCreditsCost,
} from '../services/creditsCost';

// Collapsible video model card
const VideoModelCard: React.FC<{ name: string; children: React.ReactNode; gradient: string }> = ({ name, children, gradient }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border border-surface-border overflow-hidden transition-all ${open ? 'bg-surface-raised' : 'bg-surface-overlay/30'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-8 rounded-full ${gradient}`} />
          <span className="font-semibold text-content">{name}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-content-tertiary" /> : <ChevronRight className="w-4 h-4 text-content-tertiary" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
};

const PricingTable: React.FC<{ headers: string[]; rows: (string | number)[][]; creditLabel: string }> = ({ headers, rows, creditLabel }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-border">
          {headers.map((h, i) => (
            <th key={i} className="text-left py-2 px-3 text-xs font-semibold text-content-tertiary uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
            {row.map((cell, ci) => (
              <td key={ci} className={`py-2.5 px-3 ${ci === row.length - 1 ? 'font-semibold text-accent-violet' : 'text-content-secondary'}`}>
                {typeof cell === 'number' ? `${cell} ${creditLabel}` : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center space-x-2 mb-4">
    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">{icon}</div>
    <h2 className="text-lg font-semibold text-content">{title}</h2>
  </div>
);

const ModelPricingPage: React.FC = () => {
  const { t } = useTranslation('pricing');
  const mp = (key: string) => t(`modelPricing.${key}`);
  const h = (key: string) => t(`modelPricing.headers.${key}`);
  const creditLabel = h('credits');

  const s = (n: number) => `${n}s`;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-gradient-primary">{mp('title')}</span>
          </h1>
          <p className="text-sm text-content-tertiary">{mp('desc')}</p>
        </motion.div>

        {/* Image Generation */}
        <section>
          <SectionTitle icon={<ImageIcon className="w-4 h-4 text-violet-400" />} title={mp('tabs.image')} />
          <PricingTable creditLabel={creditLabel}
            headers={[h('model'), h('creditsPerImage')]}
            rows={[
              ['Seedream 4.5', SEEDREAM_CREDITS_COST],
              ['Banana Pro', mp('comingSoon')],
            ]}
          />
        </section>

        {/* Video Generation */}
        <section>
          <SectionTitle icon={<Video className="w-4 h-4 text-cyan-400" />} title={mp('tabs.video')} />
          <div className="space-y-3">
            <VideoModelCard name="Kling 3" gradient="bg-gradient-to-b from-indigo-500 to-purple-500">
              <div className="text-xs text-content-tertiary leading-relaxed space-y-1">
                <p><span className="text-content-secondary font-medium">Pro</span>: {mp('withAudio')} 39 {mp('perSecond')} / {mp('withoutAudio')} 23 {mp('perSecond')}</p>
                <p><span className="text-content-secondary font-medium">Std</span>: {mp('withAudio')} 31 {mp('perSecond')} / {mp('withoutAudio')} 17 {mp('perSecond')}</p>
                <p><span className="text-content-secondary font-medium">Omni Pro / V2V</span>: {mp('withAudio')} 28 {mp('perSecond')} / {mp('withoutAudio')} 22 {mp('perSecond')}</p>
                <p><span className="text-content-secondary font-medium">Omni Std / V2V</span>: {mp('withAudio')} 22 {mp('perSecond')} / {mp('withoutAudio')} 17 {mp('perSecond')}</p>
                <p className="text-content-tertiary/60 mt-1">3-15s</p>
              </div>
            </VideoModelCard>

            <VideoModelCard name="Wan" gradient="bg-gradient-to-b from-blue-500 to-violet-500">
              <PricingTable creditLabel={creditLabel}
                headers={[h('resolution'), h('duration'), h('credits')]}
                rows={[
                  ['720p', s(5), getWanCreditsCost('720p', '5')],
                  ['720p', s(10), getWanCreditsCost('720p', '10')],
                  ['720p', s(15), getWanCreditsCost('720p', '15')],
                  ['1080p', s(5), getWanCreditsCost('1080p', '5')],
                  ['1080p', s(10), getWanCreditsCost('1080p', '10')],
                  ['1080p', s(15), getWanCreditsCost('1080p', '15')],
                ]}
              />
            </VideoModelCard>

            <VideoModelCard name="Minimax Hailuo" gradient="bg-gradient-to-b from-cyan-500 to-blue-500">
              <PricingTable creditLabel={creditLabel}
                headers={[h('resolution'), h('duration'), h('credits')]}
                rows={[
                  ['768p', s(6), getMinimaxCreditsCost('768p', 6)],
                  ['768p', s(10), getMinimaxCreditsCost('768p', 10)],
                  ['1080p', s(6), getMinimaxCreditsCost('1080p', 6)],
                ]}
              />
            </VideoModelCard>

            <VideoModelCard name="Runway Gen 4.5" gradient="bg-gradient-to-b from-amber-500 to-orange-500">
              <div className="space-y-4">
                <div className="text-xs text-content-tertiary">
                  <span className="text-content-secondary font-medium">{mp('billingRule')}</span>: 12 {mp('perSecond')}, 5/8/10s
                </div>
                <PricingTable creditLabel={creditLabel}
                  headers={[h('duration'), h('credits')]}
                  rows={[
                    [s(5), getRunwayCreditsCost(5)],
                    [s(8), getRunwayCreditsCost(8)],
                    [s(10), getRunwayCreditsCost(10)],
                  ]}
                />
              </div>
            </VideoModelCard>

            <VideoModelCard name="PixVerse V5" gradient="bg-gradient-to-b from-pink-500 to-rose-500">
              <PricingTable creditLabel={creditLabel}
                headers={[h('resolution'), h('duration'), h('credits')]}
                rows={[
                  ['360p', s(5), getPixVerseCreditsCost('360p', 5)],
                  ['540p', s(5), getPixVerseCreditsCost('540p', 5)],
                  ['720p', s(5), getPixVerseCreditsCost('720p', 5)],
                  ['720p', s(8), getPixVerseCreditsCost('720p', 8)],
                  ['1080p', s(5), getPixVerseCreditsCost('1080p', 5)],
                  ['1080p', s(8), getPixVerseCreditsCost('1080p', 8)],
                ]}
              />
            </VideoModelCard>

            <VideoModelCard name="LTX Video 2.0 Pro" gradient="bg-gradient-to-b from-emerald-500 to-cyan-500">
              <PricingTable creditLabel={creditLabel}
                headers={[h('resolution'), h('duration'), h('credits')]}
                rows={[
                  ['1080p', s(6), getLtxCreditsCost('1080p', 6)],
                  ['1080p', s(8), getLtxCreditsCost('1080p', 8)],
                  ['1080p', s(10), getLtxCreditsCost('1080p', 10)],
                  ['1440p', s(6), getLtxCreditsCost('1440p', 6)],
                  ['1440p', s(8), getLtxCreditsCost('1440p', 8)],
                  ['1440p', s(10), getLtxCreditsCost('1440p', 10)],
                  ['2160p', s(6), getLtxCreditsCost('2160p', 6)],
                  ['2160p', s(8), getLtxCreditsCost('2160p', 8)],
                  ['2160p', s(10), getLtxCreditsCost('2160p', 10)],
                ]}
              />
            </VideoModelCard>
          </div>
        </section>

        {/* HD Upscale */}
        <section>
          <SectionTitle icon={<Maximize className="w-4 h-4 text-amber-400" />} title={mp('tabs.upscale')} />
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-content-secondary">{mp('magnificNote')}</span>
          </div>
          <PricingTable creditLabel={creditLabel}
            headers={[h('outputSize'), h('credits')]}
            rows={[
              ['≤ 2048px', 10],
              ['≤ 4096px', 20],
              ['> 4096px (max 10K)', 120],
            ]}
          />
        </section>

        {/* Remove BG */}
        <section>
          <SectionTitle icon={<Scissors className="w-4 h-4 text-emerald-400" />} title={mp('tabs.removebg')} />
          <PricingTable creditLabel={creditLabel}
            headers={[h('operation'), h('credits')]}
            rows={[
              [mp('tabs.removebg'), REMOVE_BG_CREDITS_COST],
            ]}
          />
          <p className="text-xs text-content-tertiary mt-3">{mp('removeBgNote').replace('{{cost}}', String(REMOVE_BG_CREDITS_COST))}</p>
        </section>
      </div>
    </div>
  );
};

export default ModelPricingPage;

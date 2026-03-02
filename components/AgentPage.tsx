import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, DollarSign, Users, Package, ArrowDownCircle, RefreshCw,
  Copy, Plus, Ticket, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Settings
} from 'lucide-react';
import { useGeneration } from '../context/GenerationContext';
import { agentQuery, agentAction } from '../services/api';
import { AgentTransaction, AgentWithdrawal } from '../types';

type AgentTab = 'overview' | 'codes' | 'pricing' | 'transactions' | 'withdraw' | 'users' | 'settings';

const AgentPage: React.FC = () => {
  const { userId, addNotification } = useGeneration();
  const [tab, setTab] = useState<AgentTab>('overview');
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAgent = useCallback(async () => {
    setLoading(true);
    const res = await agentQuery('my_info');
    if (res.success) setAgentInfo(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-content-muted">加载中...</div>;
  if (!agentInfo) return <div className="flex-1 flex items-center justify-center text-content-muted">未找到代理信息</div>;

  const tabs: { id: AgentTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '概览', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'codes', label: '兑换码', icon: <Ticket className="w-4 h-4" /> },
    { id: 'pricing', label: '套餐定价', icon: <Package className="w-4 h-4" /> },
    { id: 'transactions', label: '流水', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'withdraw', label: '提现', icon: <ArrowDownCircle className="w-4 h-4" /> },
    { id: 'users', label: '用户', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: '设置', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Store className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold text-content">代理中心</h1>
          <span className="text-xs text-content-muted bg-surface-hover px-2 py-0.5 rounded-full">{agentInfo.domain}</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-content-secondary">
            余额: <span className="text-accent font-semibold">¥{Number(agentInfo.balance).toFixed(2)}</span>
          </div>
          <button onClick={loadAgent} className="p-1.5 rounded-lg hover:bg-surface-hover text-content-muted">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex border-b border-border px-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center space-x-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && <OverviewTab agent={agentInfo} />}
        {tab === 'codes' && <CodesTab agentId={agentInfo.id} creditsRate={agentInfo.credits_rate} onBalanceChange={loadAgent} />}
        {tab === 'pricing' && <PricingTab agentId={agentInfo.id} onUpdate={loadAgent} />}
        {tab === 'transactions' && <TransactionsTab agentId={agentInfo.id} />}
        {tab === 'withdraw' && <WithdrawTab agentId={agentInfo.id} balance={agentInfo.balance} onSuccess={loadAgent} />}
        {tab === 'users' && <UsersTab agentId={agentInfo.id} />}
        {tab === 'settings' && <SettingsTab agent={agentInfo} onUpdate={loadAgent} />}
      </div>
    </div>
  );
};

// ============================================================
// 概览
// ============================================================
const OverviewTab: React.FC<{ agent: any }> = ({ agent }) => {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    agentQuery('stats').then(res => { if (res.success) setStats(res.data); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="余额" value={`¥${Number(agent.balance).toFixed(2)}`} icon={<DollarSign className="w-5 h-5 text-emerald-400" />} />
        <StatCard label="积分汇率" value={`${agent.credits_rate} 积分/元`} icon={<TrendingUp className="w-5 h-5 text-blue-400" />} />
        <StatCard label="总用户" value={stats?.total_users ?? '-'} icon={<Users className="w-5 h-5 text-purple-400" />} />
        <StatCard label="总分成" value={stats ? `¥${Number(stats.total_commission).toFixed(2)}` : '-'} icon={<DollarSign className="w-5 h-5 text-amber-400" />} />
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-medium text-content mb-2">代理信息</h3>
        <div className="text-xs text-content-muted space-y-1">
          <div>品牌名: {agent.brand_name}</div>
          <div>域名: {agent.domain}</div>
          <div>状态: <span className={agent.status === 'active' ? 'text-emerald-400' : 'text-red-400'}>{agent.status}</span></div>
          <div>创建时间: {new Date(agent.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="card p-4 flex items-center space-x-3">
    <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center">{icon}</div>
    <div>
      <div className="text-xs text-content-muted">{label}</div>
      <div className="text-lg font-semibold text-content">{value}</div>
    </div>
  </div>
);

// ============================================================
// 兑换码管理
// ============================================================
const CodesTab: React.FC<{ agentId: string; creditsRate: number; onBalanceChange: () => void }> = ({ agentId, creditsRate, onBalanceChange }) => {
  const { addNotification } = useGeneration();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [codeType, setCodeType] = useState<'promo' | 'subscription'>('promo');
  const [creditsAmount, setCreditsAmount] = useState(100);
  const [tierId, setTierId] = useState('starter');
  const [maxUses, setMaxUses] = useState(1);
  const [creating, setCreating] = useState(false);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    const res = await agentQuery('my_codes');
    if (res.success) setCodes(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleCreate = async () => {
    setCreating(true);
    const res = await agentAction('create_code', {
      code_type: codeType,
      credits_amount: codeType === 'promo' ? creditsAmount : 0,
      tier_id: codeType === 'subscription' ? tierId : undefined,
      max_uses: maxUses,
    });
    if (res.success) {
      loadCodes();
      onBalanceChange();
      setShowCreate(false);
      addNotification('兑换码创建成功', 'success');
    } else {
      addNotification(res.error || '创建失败', 'error');
    }
    setCreating(false);
  };

  const estimateCost = () => {
    if (codeType === 'promo') return ((creditsAmount / creditsRate) * maxUses).toFixed(2);
    return '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-content">我的兑换码</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-xs px-3 py-1.5 flex items-center space-x-1">
          <Plus className="w-3 h-3" /><span>创建兑换码</span>
        </button>
      </div>

      {showCreate && (
        <div className="card p-4 space-y-3">
          <div className="flex space-x-2">
            <button onClick={() => setCodeType('promo')} className={`text-xs px-3 py-1 rounded-lg ${codeType === 'promo' ? 'bg-accent text-white' : 'bg-surface-hover text-content-muted'}`}>积分码</button>
            <button onClick={() => setCodeType('subscription')} className={`text-xs px-3 py-1 rounded-lg ${codeType === 'subscription' ? 'bg-accent text-white' : 'bg-surface-hover text-content-muted'}`}>订阅码</button>
          </div>
          {codeType === 'promo' && (
            <div>
              <label className="text-xs text-content-muted">积分数量</label>
              <input type="number" value={creditsAmount} onChange={e => setCreditsAmount(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-surface border border-surface-border rounded-lg text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent" min={1} />
            </div>
          )}
          {codeType === 'subscription' && (
            <div>
              <label className="text-xs text-content-muted">套餐</label>
              <select value={tierId} onChange={e => setTierId(e.target.value)} className="w-full mt-1 px-3 py-2 bg-surface border border-surface-border rounded-lg text-content focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="starter">入门版</option>
                <option value="advanced">进阶版</option>
                <option value="flagship">旗舰版</option>
                <option value="studio">工作室版</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-content-muted">可用次数</label>
            <input type="number" value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} className="w-full mt-1 px-3 py-2 bg-surface border border-surface-border rounded-lg text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent" min={1} />
          </div>
          <div className="text-xs text-content-muted">预估扣费: ¥{estimateCost()}</div>
          <button onClick={handleCreate} disabled={creating} className="btn-primary text-xs px-4 py-1.5">
            {creating ? '创建中...' : '确认创建'}
          </button>
        </div>
      )}

      {loading ? <div className="text-center text-content-muted text-sm py-8">加载中...</div> : (
        <div className="space-y-2">
          {codes.length === 0 ? <div className="text-center text-content-muted text-sm py-8">暂无兑换码</div> : codes.map(c => (
            <div key={c.id} className="card p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm text-content font-medium">{c.code}</span>
                  <button onClick={() => { navigator.clipboard.writeText(c.code); }} className="text-content-muted hover:text-content">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-content-muted mt-0.5">
                  {c.code_type === 'promo' ? `${c.credits_amount}积分` : `订阅:${c.tier_id}`}
                  {' · '}{c.current_uses}/{c.max_uses}次
                  {c.is_active ? '' : ' · 已停用'}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {c.is_active ? '有效' : '停用'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 套餐定价
// ============================================================
const PricingTab: React.FC<{ agentId: string; onUpdate: () => void }> = ({ agentId, onUpdate }) => {
  const { addNotification } = useGeneration();
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const TIER_NAMES: Record<string, string> = {
    starter: '入门版', advanced: '进阶版', flagship: '旗舰版', studio: '工作室版', enterprise: '企业版'
  };

  const ALL_TIERS = ['starter', 'advanced', 'flagship', 'studio', 'enterprise'];

  useEffect(() => {
    agentQuery('my_info').then(res => {
      if (res.success && res.data?.pricing) {
        // 确保所有套餐都显示，即使数据库中没有记录
        const fullPricing = ALL_TIERS.map(tier_id => {
          const existing = res.data.pricing.find((p: any) => p.tier_id === tier_id);
          return existing || { tier_id, cost_price: 0, sell_price: 0, is_active: false };
        });
        setPricing(fullPricing);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await agentAction('update_pricing', { pricing });
    if (res.success) {
      addNotification('定价更新成功', 'success');
      onUpdate();
    } else {
      addNotification(res.error || '更新失败', 'error');
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center text-content-muted text-sm py-8">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-medium text-content mb-3">套餐售价设置</h3>
        <p className="text-xs text-content-muted mb-4">设置您的套餐售价（必须 ≥ 成本价）。售价为 0 表示不启用该套餐。</p>

        <div className="space-y-3">
          {pricing.map((p, i) => (
            <div key={p.tier_id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium text-content">{TIER_NAMES[p.tier_id]}</div>
                <div className="text-xs text-content-muted mt-0.5">成本价: ¥{Number(p.cost_price).toFixed(2)}</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-content-muted">售价:</span>
                <input
                  type="number"
                  value={p.sell_price}
                  onChange={e => {
                    const arr = [...pricing];
                    arr[i] = { ...arr[i], sell_price: Number(e.target.value) };
                    setPricing(arr);
                  }}
                  className="w-24 px-2 py-1.5 bg-surface-hover border border-surface-border rounded text-content text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  min={0}
                  step={0.01}
                />
                <span className="text-xs text-content-muted">元</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full mt-4 py-2 text-sm"
        >
          {saving ? '保存中...' : '保存定价'}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// 流水
// ============================================================
const TransactionsTab: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [items, setItems] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentQuery('transactions').then(res => {
      if (res.success) setItems(res.data || []);
      setLoading(false);
    });
  }, []);

  const typeLabel: Record<string, string> = {
    commission: '分成', credits_purchase: '购买积分码', sub_code_purchase: '购买订阅码',
    withdrawal: '提现', withdrawal_reject: '提现退回', recharge: '充值', adjustment: '调整',
  };

  if (loading) return <div className="text-center text-content-muted text-sm py-8">加载中...</div>;

  return (
    <div className="space-y-2">
      {items.length === 0 ? <div className="text-center text-content-muted text-sm py-8">暂无流水</div> : items.map(tx => (
        <div key={tx.id} className="card p-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-content">{typeLabel[tx.type] || tx.type}</div>
            <div className="text-xs text-content-muted">{tx.description}</div>
            <div className="text-xs text-content-muted">{new Date(tx.created_at).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
            </div>
            <div className="text-xs text-content-muted">余额: ¥{Number(tx.balance_after).toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// 提现
// ============================================================
const WithdrawTab: React.FC<{ agentId: string; balance: number; onSuccess: () => void }> = ({ agentId, balance, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<AgentWithdrawal[]>([]);

  useEffect(() => {
    agentQuery('my_withdrawals').then(res => {
      if (res.success) setWithdrawals(res.data || []);
    });
  }, []);

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || val > balance) return;
    setSubmitting(true);
    const res = await agentAction('request_withdrawal', { amount: val });
    if (res.success) {
      setAmount('');
      onSuccess();
      agentQuery('my_withdrawals').then(r => { if (r.success) setWithdrawals(r.data || []); });
    }
    setSubmitting(false);
  };

  const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4 text-amber-400" />,
    approved: <CheckCircle className="w-4 h-4 text-blue-400" />,
    paid: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    rejected: <XCircle className="w-4 h-4 text-red-400" />,
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-medium text-content">申请提现</h3>
        <div className="text-xs text-content-muted">可提现余额: ¥{Number(balance).toFixed(2)}</div>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="输入提现金额"
          className="w-full px-3 py-2 bg-surface border border-surface-border rounded-lg text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent"
          min={0.01}
          max={balance}
          step={0.01}
        />
        <button onClick={handleSubmit} disabled={submitting || !amount} className="btn-primary text-xs px-4 py-1.5">
          {submitting ? '提交中...' : '提交申请'}
        </button>
      </div>

      <h3 className="text-sm font-medium text-content">提现记录</h3>
      <div className="space-y-2">
        {withdrawals.length === 0 ? <div className="text-center text-content-muted text-sm py-4">暂无记录</div> : withdrawals.map(w => (
          <div key={w.id} className="card p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {statusIcon[w.status]}
              <div>
                <div className="text-sm text-content">¥{Number(w.amount).toFixed(2)}</div>
                <div className="text-xs text-content-muted">{new Date(w.created_at).toLocaleString()}</div>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              w.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
              w.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
              'bg-amber-500/10 text-amber-400'
            }`}>
              {w.status === 'pending' ? '待处理' : w.status === 'approved' ? '已批准' : w.status === 'paid' ? '已打款' : '已拒绝'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// 用户
// ============================================================
const UsersTab: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentQuery('my_users').then(res => {
      if (res.success) setUsers(res.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center text-content-muted text-sm py-8">加载中...</div>;

  return (
    <div className="space-y-2">
      {users.length === 0 ? <div className="text-center text-content-muted text-sm py-8">暂无用户</div> : users.map(u => (
        <div key={u.id} className="card p-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-content">{u.phone || u.email || u.nickname}</div>
            <div className="text-xs text-content-muted">积分: {u.credits} · 注册: {new Date(u.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// 设置
// ============================================================
const SettingsTab: React.FC<{ agent: any; onUpdate: () => void }> = ({ agent, onUpdate }) => {
  const { addNotification } = useGeneration();
  const [wechat, setWechat] = useState(agent.contact_wechat || '');
  const [telegram, setTelegram] = useState(agent.contact_telegram || '');
  const [email, setEmail] = useState(agent.contact_email || '');
  const [enableTelegram, setEnableTelegram] = useState(agent.enable_telegram || false);
  const [enableEmail, setEnableEmail] = useState(agent.enable_email || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await agentAction('update_contact', {
      contact_wechat: wechat,
      contact_telegram: telegram,
      contact_email: email,
      enable_telegram: enableTelegram,
      enable_email: enableEmail,
    });
    if (res.success) {
      addNotification('联系方式已更新', 'success');
      onUpdate();
    } else {
      addNotification(res.error || '更新失败', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <h3 className="text-sm font-medium text-content mb-4">联系方式设置</h3>
        <p className="text-xs text-content-muted mb-6">这些联系方式将显示在您的代理站订阅页面的"联系销售"卡片中</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-content-secondary mb-2 block">微信号（必填）</label>
            <input
              type="text"
              value={wechat}
              onChange={e => setWechat(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-surface-border rounded text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="请输入微信号"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-content-secondary">Telegram</label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTelegram}
                  onChange={e => setEnableTelegram(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-border text-accent focus:ring-accent"
                />
                <span className="text-xs text-content-muted">启用</span>
              </label>
            </div>
            <input
              type="text"
              value={telegram}
              onChange={e => setTelegram(e.target.value)}
              disabled={!enableTelegram}
              className="w-full px-3 py-2 bg-surface border border-surface-border rounded text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="请输入 Telegram 用户名（如 @username）"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-content-secondary">邮箱</label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableEmail}
                  onChange={e => setEnableEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-border text-accent focus:ring-accent"
                />
                <span className="text-xs text-content-muted">启用</span>
              </label>
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!enableEmail}
              className="w-full px-3 py-2 bg-surface border border-surface-border rounded text-content placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="请输入邮箱地址"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !wechat}
          className="btn-primary w-full mt-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default AgentPage;

import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  Users,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  Tag,
  Gift,
  BellRing,
  Phone,
  Flame,
  Award,
  Filter,
} from 'lucide-react';
import { Customer, Promotion, PushNotification } from '../../types';
import { CURRENCY, storage } from '../../services/storage';

interface AdminLoyaltyPromosProps {
  customers: Customer[];
  promotions: Promotion[];
}

export const AdminLoyaltyPromos: React.FC<AdminLoyaltyPromosProps> = ({
  customers,
  promotions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'loyalty' | 'promotions' | 'push_dispatch'>('loyalty');

  // New promo state
  const [showNewPromoModal, setShowNewPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrder, setMinOrder] = useState<number>(200);

  // Push broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'customer' | 'admin' | 'pos'>('customer');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoTitle) return;

    storage.addPromotion({
      code: promoCode.toUpperCase().trim(),
      title: promoTitle,
      description: promoDesc,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrder),
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      isActive: true,
      bannerColor: 'from-amber-600 to-emerald-700',
      targetTier: 'All',
    });

    setShowNewPromoModal(false);
    setPromoCode('');
    setPromoTitle('');
    setPromoDesc('');
  };

  const handleBroadcastPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    storage.addNotification({
      title: broadcastTitle,
      message: broadcastMessage,
      type: 'discount_promo',
      targetRole: broadcastTarget,
      read: false,
      linkTab: 'promos',
    });

    setBroadcastSuccess(true);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setTimeout(() => setBroadcastSuccess(false), 3500);
  };

  const handleAwardPoints = (cust: Customer) => {
    const pointsToAdd = 50;
    cust.loyaltyPoints += pointsToAdd;
    storage.saveCustomers([...customers]);
    storage.addNotification({
      title: `🎁 +50 Loyalty Bonus Points Awarded!`,
      message: `${cust.name} received 50 bonus points for store loyalty engagement.`,
      type: 'loyalty_reward',
      targetRole: 'customer',
      read: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Loyalty Program & Promotions</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              VIP Patron Retention
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reward regular customers, run targeted discount codes, and broadcast personalized push alerts.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveSubTab('loyalty')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeSubTab === 'loyalty' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Loyalty Members ({customers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('promotions')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeSubTab === 'promotions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Promos & Deals ({promotions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('push_dispatch')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeSubTab === 'push_dispatch' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Push Alerts Sender
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LOYALTY PROGRAM MEMBERS & TIERS */}
      {activeSubTab === 'loyalty' && (
        <div className="space-y-6">
          {/* Tier Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Silver Tier */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Silver Tier</span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono border border-slate-200">0 - 1,199 Pts</span>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-2">1 pt per ₹10 spent</p>
              <p className="text-xs text-slate-500 mt-1">Welcome bonus 50 points + Standard birthday treat.</p>
            </div>

            {/* Gold Tier */}
            <div className="bg-white border border-amber-200 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Gold VIP
                </span>
                <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-mono border border-amber-200">
                  1,200 - 2,999 Pts
                </span>
              </div>
              <p className="text-lg font-bold text-amber-800 mt-2">1.5x Point Multiplier</p>
              <p className="text-xs text-slate-500 mt-1">10% instant discount on pre-orders + Priority Pan Bar queue.</p>
            </div>

            {/* Platinum Royal */}
            <div className="bg-white border border-emerald-300 p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Crown className="w-4 h-4 text-amber-500" /> Platinum Royal
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-mono border border-emerald-200">
                  3,000+ Pts
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-2">2x Points + 25% VIP Code</p>
              <p className="text-xs text-slate-500 mt-1">
                Complimentary seasonal gift boxes + personal pan master curation.
              </p>
            </div>
          </div>

          {/* Customer Directory Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">Loyalty Patrons & Point Ledgers</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Total Points Issued: {customers.reduce((s, c) => s + c.loyaltyPoints, 0)} pts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Patron Name</th>
                    <th className="py-3.5 px-3">Phone</th>
                    <th className="py-3.5 px-3">VIP Tier</th>
                    <th className="py-3.5 px-3">Loyalty Balance</th>
                    <th className="py-3.5 px-3">Total Spend</th>
                    <th className="py-3.5 px-3">Favorite Pan Items</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{cust.name}</td>
                      <td className="py-3.5 px-3 font-mono text-slate-500">{cust.phone}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            cust.tier === 'Platinum Royal'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : cust.tier === 'Gold'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {cust.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 text-sm">
                        {cust.loyaltyPoints} pts
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">{CURRENCY}{cust.totalSpent.toFixed(2)}</td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {cust.preferences && cust.preferences.length > 0
                          ? cust.preferences.join(', ')
                          : 'Royal Meetha Paan'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleAwardPoints(cust)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 transition-colors cursor-pointer"
                        >
                          +50 Bonus Pts
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PROMOTIONS & ACTIVE DEALS */}
      {activeSubTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base">Recurring Store Deals & Promo Codes</h3>
            <button
              onClick={() => setShowNewPromoModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Promo Code</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-white border border-slate-200 p-5 rounded-xl text-slate-900 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md">
                      {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `₹${promo.discountValue} OFF`}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${promo.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                      {promo.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900 tracking-tight">{promo.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{promo.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">COUPON CODE</span>
                    <span className="font-mono font-bold text-xs text-amber-700 tracking-wider bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      {promo.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => storage.togglePromotion(promo.id)}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-slate-200"
                    >
                      {promo.isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => storage.deletePromotion(promo.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* New Promo Modal */}
          {showNewPromoModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Create Store Promotion Campaign</h3>

                <form onSubmit={handleCreatePromo} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600 font-bold">Promo Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SPECIALPAN25"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 uppercase font-mono focus:outline-hidden focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-bold">Offer Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 25% Off Fire Paan & Shakes"
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 font-bold">Discount Type</label>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as any)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 font-bold">Value</label>
                      <input
                        type="number"
                        required
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-bold">Min Order Amount ({CURRENCY})</label>
                    <input
                      type="number"
                      required
                      value={minOrder}
                      onChange={(e) => setMinOrder(Number(e.target.value))}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-bold">Description</label>
                    <textarea
                      rows={2}
                      value={promoDesc}
                      onChange={(e) => setPromoDesc(e.target.value)}
                      placeholder="Special weekend delight discount for our esteemed patrons..."
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewPromoModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 border border-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      Publish Deal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: PUSH NOTIFICATION DISPATCHER */}
      {activeSubTab === 'push_dispatch' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Broadcast Personalized Push Alert</h3>
              <p className="text-xs text-slate-500">
                Send instant notification banners to customer devices & store POS screens.
              </p>
            </div>
          </div>

          {broadcastSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">Push notification broadcasted successfully to all active sessions!</span>
            </div>
          )}

          <form onSubmit={handleBroadcastPush} className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 font-bold">Target Audience</label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value as any)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
              >
                <option value="customer">All Ordering Customers</option>
                <option value="pos">POS Counter Sales Staff</option>
                <option value="admin">Store Managers & Admins</option>
                <option value="all">Everyone (Global Announcement)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 font-bold">Alert Title</label>
              <input
                type="text"
                required
                placeholder="e.g. 🍨 New Item Alert: Rose Gulkand Falooda!"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600 font-bold">Notification Message</label>
              <textarea
                rows={3}
                required
                placeholder="Indulge in our new artisanal falooda with freshly extracted organic gulkand and rabdi..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#1E293B] hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4 text-amber-400" />
              <span>Broadcast Notification Now</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

import { weapons, weaponIds, type WeaponId } from '../data/weapons';
import type { CombatSystem } from '../combat/CombatSystem';
import type { WeaponMerchant } from '../world/WeaponMerchants';

export class WeaponShop {
  private root = document.createElement('section');
  private selection = 0;
  private merchant?: WeaponMerchant;
  open = false;
  onClose: () => void = () => {};
  onPurchase: (id: WeaponId) => void = () => {};
  constructor() {
    this.root.className = 'weapon-shop'; this.root.hidden = true;
    this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-labelledby', 'shop-title');
    this.root.innerHTML = `<header><div><span class="eyebrow">DAS NETZ DER FREIEN HÄNDLER</span><h2 id="shop-title"></h2></div><button class="shop-close">Schliessen · TAB</button></header>
      <div class="shop-account"><strong id="shop-money"></strong><span>Geld verdienen: Aufträge, Wachen, Tanks und befreite Basen.</span></div>
      <div class="shop-layout"><nav aria-label="Waffensortiment" class="shop-list"></nav><article class="shop-detail"><span class="eyebrow">DEINE NÄCHSTE AUSRÜSTUNG</span><h3 id="shop-name"></h3><p id="shop-description"></p><dl id="shop-stats"></dl><p id="shop-ownership"></p><button id="shop-buy" class="primary"></button><p class="shop-note">Einmal kaufen, dauerhaft behalten. Inklusive Munition. Nachschub füllt deine eigenen Waffen kostenlos auf.</p></article></div>
      <footer><span>↑ ↓ AUSWÄHLEN · E KAUFEN / AUSRÜSTEN · TAB SCHLIESSEN</span><p id="shop-message" role="status" aria-live="polite"></p></footer>`;
    document.getElementById('app')!.append(this.root);
    this.root.querySelector<HTMLButtonElement>('.shop-close')!.onclick = () => this.onClose();
    this.root.querySelector<HTMLButtonElement>('#shop-buy')!.onclick = () => this.confirm();
    this.root.querySelector('.shop-list')!.addEventListener('click', event => {
      const row = (event.target as Element).closest<HTMLButtonElement>('[data-weapon]');
      if (row) { this.selection = Number(row.dataset.weapon); this.onSelection?.(); }
    });
  }
  private onSelection?: () => void;
  show(merchant: WeaponMerchant, combat: CombatSystem) {
    this.merchant = merchant; this.open = true; this.root.hidden = false;
    this.selection = Math.max(0, weaponIds.indexOf(combat.weapons.selected));
    this.onSelection = () => this.render(combat);
    this.message(''); this.render(combat);
  }
  close() { this.open = false; this.root.hidden = true; this.merchant = undefined; }
  navigate(direction: number) { this.selection = (this.selection + direction + weaponIds.length) % weaponIds.length; this.onSelection?.(); }
  confirm() { if (this.open) this.onPurchase(weaponIds[this.selection]); }
  message(text: string) { this.root.querySelector('#shop-message')!.textContent = text; }
  render(combat: CombatSystem) {
    if (!this.merchant) return;
    const weapon = weapons[weaponIds[this.selection]], owned = combat.weapons.owned.has(weapon.id);
    this.root.querySelector('#shop-title')!.textContent = this.merchant.name;
    this.root.querySelector('#shop-money')!.textContent = `${combat.money.toLocaleString('de-CH')} Cr`;
    this.root.querySelector('.shop-list')!.innerHTML = weaponIds.map((id, index) => {
      const item = weapons[id], has = combat.weapons.owned.has(id);
      return `<button data-weapon="${index}" class="shop-row ${index === this.selection ? 'selected' : ''}" aria-current="${index === this.selection}"><span><strong>${item.name}</strong><small>${has ? combat.weapons.selected === id ? 'AUSGERÜSTET' : 'IM BESITZ' : 'ZUM KAUF VERFÜGBAR'}</small></span><b>${has ? '✓' : `${item.price.toLocaleString('de-CH')} Cr`}</b></button>`;
    }).join('');
    this.root.querySelector('#shop-name')!.textContent = weapon.name;
    this.root.querySelector('#shop-description')!.textContent = weapon.description;
    this.root.querySelector('#shop-stats')!.innerHTML = `<div><dt>Schaden</dt><dd>${weapon.damage}${weapon.pellets ? ` × ${weapon.pellets}` : ''}</dd></div><div><dt>Magazin</dt><dd>${weapon.magazineSize}</dd></div><div><dt>Reichweite</dt><dd>${weapon.range} m</dd></div><div><dt>Schüsse / Sek.</dt><dd>${weapon.fireRate}</dd></div><div><dt>Nachladen</dt><dd>${weapon.reloadTime} s</dd></div><div><dt>Reserve</dt><dd>${weapon.reserve}</dd></div>`;
    const missing = weapon.price - combat.money;
    this.root.querySelector('#shop-ownership')!.textContent = owned ? 'Diese Waffe gehört dir.' : missing > 0 ? `Noch ${missing.toLocaleString('de-CH')} Cr bis zu dieser Waffe.` : 'Bezahlbar · sofort einsatzbereit.';
    const buy = this.root.querySelector<HTMLButtonElement>('#shop-buy')!;
    buy.disabled = !owned && missing > 0;
    buy.textContent = owned ? 'E · AUSRÜSTEN' : `E · KAUFEN FÜR ${weapon.price.toLocaleString('de-CH')} Cr`;
    this.root.querySelector('.shop-row.selected')?.scrollIntoView({ block: 'nearest' });
  }
}

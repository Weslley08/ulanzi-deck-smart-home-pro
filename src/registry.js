// Adapter boundary: additional official integrations are registered without modifying action handling.
export class ProviderRegistry {
  #providers = new Map();
  register(id, provider) {
    if (!/^[a-z][a-z0-9-]*$/.test(id) || this.#providers.has(id)) throw new Error('Invalid or duplicate provider');
    for (const method of ['discoverDevices','getState','execute','subscribe','close'])
      if (typeof provider[method] !== 'function') throw new Error('Invalid provider: ' + method);
    this.#providers.set(id, provider);
    return provider;
  }
  get(id) { return this.#providers.get(id) ?? null; }
  async close() { for(const p of this.#providers.values()) p.close(); this.#providers.clear(); }
}

const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  // Auth
  verifyPin: (pin) => request('POST', '/auth/verify-pin', { pin }),
  verifyAdminPin: (pin) => request('POST', '/auth/verify-admin-pin', { pin }),
  setPin: (admin_pin, new_pin) => request('POST', '/auth/set-pin', { admin_pin, new_pin }),

  // Categories
  getCategories: () => request('GET', '/categories'),
  createCategory: (data) => request('POST', '/categories', data),
  updateCategory: (id, data) => request('PATCH', `/categories/${id}`, data),
  deleteCategory: (id) => request('DELETE', `/categories/${id}`),

  // Ingredients
  getIngredients: () => request('GET', '/ingredients'),
  createIngredient: (data) => request('POST', '/ingredients', data),
  deleteIngredient: (id) => request('DELETE', `/ingredients/${id}`),

  // Pumps (full — backoffice)
  getPumps: () => request('GET', '/pumps'),
  createPump: (data) => request('POST', '/pumps', data),
  updatePump: (id, data) => request('PATCH', `/pumps/${id}`, data),
  deletePump: (id) => request('DELETE', `/pumps/${id}`),

  // Pumps simple (bartender ingredient assignment)
  getPumpsSimple: () => request('GET', '/pumps/simple'),
  assignIngredient: (pumpId, ingredientId) =>
    request('PATCH', `/pumps/${pumpId}/ingredient`, { ingredient_id: ingredientId }),

  // Recipes
  getRecipes: () => request('GET', '/recipes'),
  createRecipe: (data) => request('POST', '/recipes', data),
  updateRecipe: (id, data) => request('PATCH', `/recipes/${id}`, data),
  deleteRecipe: (id) => request('DELETE', `/recipes/${id}`),
  uploadRecipeImage: async (id, file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/recipes/${id}/image`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // Glasses
  getGlasses: () => request('GET', '/glasses'),
  createGlass: (data) => request('POST', '/glasses', data),
  updateGlass: (id, data) => request('PATCH', `/glasses/${id}`, data),
  deleteGlass: (id) => request('DELETE', `/glasses/${id}`),

  // Scale / loadcell
  getWeight: () => request('GET', '/weight'),
  tare: () => request('POST', '/weight/tare'),
  getLoadcellPins: () => request('GET', '/system/loadcell-pins'),
  setLoadcellPins: (dout, sck) => request('POST', '/system/loadcell-pins', { dout_pin: dout, sck_pin: sck }),

  // Pour
  cancelPour: () => request('POST', '/pour/cancel'),

  // Favorites
  getFavorites: () => request('GET', '/favorites'),
  addFavorite: (recipeId) => request('POST', `/favorites/${recipeId}`),
  removeFavorite: (recipeId) => request('DELETE', `/favorites/${recipeId}`),

  // Pour history
  getPours: (limit = 50) => request('GET', `/pours?limit=${limit}`),
  createPour: (data) => request('POST', '/pours', data),
  getPourStats: () => request('GET', '/pours/stats'),

  // Machine model
  getMachineInfo: () => request('GET', '/system/machine'),
  setMachineModel: (model) => request('POST', '/system/machine', { model }),
}

export function createPourSocket(recipeId, scale, onMessage) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.hostname
  const port = import.meta.env.DEV ? '8000' : (window.location.port || '80')
  const scaleParam = scale && scale !== 1.0 ? `?scale=${scale.toFixed(4)}` : ''
  const ws = new WebSocket(`${proto}://${host}:${port}/ws/pour/${recipeId}${scaleParam}`)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  return ws
}

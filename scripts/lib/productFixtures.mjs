/** Synthetic PostgREST fixtures. NOT a hosted database or a substitute for SQL/RLS tests. */
import { randomUUID } from "node:crypto";
export function createProductFixtures() {
  const wardrobe = new Map(), outfits = new Map(), pieces = new Map();
  const state = { failReads: false, failWrites: false, failSave: false, failDelete: false, delay: 0 };
  const counts = { creates: 0, saves: 0, deletes: 0 };
  const time = () => new Date().toISOString();
  const equal = (url, name) => url.searchParams.get(name)?.replace(/^eq\./, "");
  async function handleData({ request, url, body, reply, failure, account }) {
    const name = url.pathname.split("/").at(-1);
    if (!["wardrobe_items", "saved_outfits", "outfit_items", "silvet_save_outfit"].includes(name)) return false;
    if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
    const object = Object.entries(request.headers).some(([k, v]) => k.toLowerCase() === "accept" && v.includes("vnd.pgrst.object"));
    const sendRows = (rows) => reply(object ? rows[0] ?? null : rows, 200, [{ name: "Content-Range", value: `0-${Math.max(rows.length - 1, 0)}/${rows.length}` }]);
    if (state.failReads && ["GET", "HEAD"].includes(request.method)) { await failure("XX000", 500); return true; }
    if (state.failWrites && !["GET", "HEAD"].includes(request.method)) { await failure("XX000", 500); return true; }
    if (name === "silvet_save_outfit") {
      if (state.failSave) { await failure("23505", 409); return true; }
      const previous = body._id ? outfits.get(body._id) : null;
      if (body._id && previous?.user_id !== account) { await failure("P0002"); return true; }
      if (body._input.pieces.some((p) => p.itemId && wardrobe.get(p.itemId)?.user_id !== account)) { await failure("22023"); return true; }
      const id = previous?.id ?? randomUUID();
      outfits.set(id, { id, user_id: account, name: body._input.name, notes: body._input.notes,
        source: body._input.source, created_at: previous?.created_at ?? time(), updated_at: time() });
      for (const [key, p] of pieces) if (p.outfit_id === id) pieces.delete(key);
      for (const p of body._input.pieces) {
        const pieceId = randomUUID();
        pieces.set(pieceId, { id: pieceId, user_id: account, outfit_id: id, item_id: p.itemId, slot: p.slot, position: p.position });
      }
      counts.saves++; await reply(id); return true;
    }
    const table = name === "wardrobe_items" ? wardrobe : name === "saved_outfits" ? outfits : pieces;
    const selected = [...table.values()].filter((row) => row.user_id === account &&
      (!equal(url, "id") || row.id === equal(url, "id")) &&
      (!equal(url, "user_id") || row.user_id === equal(url, "user_id")) &&
      (!equal(url, "outfit_id") || row.outfit_id === equal(url, "outfit_id")) &&
      (!equal(url, "item_id") || row.item_id === equal(url, "item_id")));
    if (["GET", "HEAD"].includes(request.method)) { await sendRows(selected); return true; }
    if (request.method === "POST" && name === "wardrobe_items") {
      if (body.user_id !== account) { await failure("42501", 403); return true; }
      const row = { ...body, id: randomUUID(), image_path: null, image_thumb_path: null, created_at: time(), updated_at: time() };
      wardrobe.set(row.id, row); counts.creates++; await sendRows([row]); return true;
    }
    if (request.method === "PATCH") {
      const changed = selected.map((row) => ({ ...row, ...body, updated_at: time() }));
      for (const row of changed) table.set(row.id, row);
      await sendRows(changed); return true;
    }
    if (request.method === "DELETE") {
      if (state.failDelete) { await failure("XX000", 500); return true; }
      for (const row of selected) {
        table.delete(row.id);
        for (const [key, p] of pieces) {
          if (name === "saved_outfits" && p.outfit_id === row.id) pieces.delete(key);
          if (name === "wardrobe_items" && p.item_id === row.id) pieces.set(key, { ...p, item_id: null });
        }
      }
      counts.deletes++; await sendRows(selected); return true;
    }
    await failure("unsupported_fixture_request"); return true;
  }
  return { wardrobe, outfits, pieces, state, counts, handleData };
}

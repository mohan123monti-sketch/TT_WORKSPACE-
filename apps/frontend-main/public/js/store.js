async function loadStore() {
    try {
        const user = await api.get('/auth/me');
        if (!user) return;
        
        document.getElementById('my-points').textContent = user.points || 0;

        const items = await api.get('/store/items');
        const grid = document.getElementById('store-grid');
        
        if (items.length === 0) {
            grid.innerHTML = '<div style="color:var(--text-muted); grid-column: 1/-1; text-align:center;">No items currently available in the store.</div>';
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="store-item">
                <div class="store-img">
                    ${item.image_url ? `<img src="${item.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : '<i class="fas fa-gift" style="font-size:3rem;color:var(--accent-secondary);"></i>'}
                </div>
                <div class="store-title">${item.title}</div>
                <div class="store-desc">${item.description || ''}</div>
                <div class="store-footer">
                    <div>
                        <div class="store-cost">${item.points_cost} pts</div>
                        <div class="store-stock">${item.stock} left</div>
                    </div>
                    <button class="btn-primary" style="padding:5px 15px; font-size:0.9rem;" onclick="purchaseItem(${item.id})" ${user.points < item.points_cost ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Buy</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load store', e);
    }
}

async function purchaseItem(id) {
    if(!confirm("Are you sure you want to spend your points on this item?")) return;
    try {
        await api.post('/store/purchase', { item_id: id });
        ui.showToast('Purchase successful! Item will be processed by Admin.', 'success');
        loadStore();
    } catch (e) {
        ui.showToast(e.message || 'Failed to purchase item', 'error');
    }
}

if (window.socket) {
    window.socket.on('storeUpdated', () => {
        console.log('[Socket] Store updated');
        loadStore();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    loadStore();
});

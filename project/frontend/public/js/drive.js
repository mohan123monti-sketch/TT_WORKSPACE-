const drive = {
    currentParentId: null,
    history: [],
    users: [],

    async init() {
        this.loadItems();
        this.setupEventListeners();
        if (auth.hasRole('admin')) {
            this.loadUsers();
        }
    },

    async loadItems(parentId = null) {
        this.currentParentId = parentId;
        const grid = document.getElementById('drive-items-grid');
        const emptyState = document.getElementById('drive-empty-state');
        
        grid.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:50px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
        
        try {
            const items = await api.get(`/drive/items?parentId=${parentId || ''}`);
            grid.innerHTML = '';
            
            if (!items || items.length === 0) {
                emptyState.style.display = 'block';
                this.updateBreadcrumbs();
                return;
            }
            emptyState.style.display = 'none';

            items.forEach(item => {
                const card = this.createItemCard(item);
                grid.appendChild(card);
            });
            
            this.updateBreadcrumbs();
        } catch (e) {
            showToast('Failed to load drive items', 'error');
            grid.innerHTML = '';
        }
    },

    createItemCard(item) {
        const div = document.createElement('div');
        div.className = `drive-item ${item.type} ${this.getFileClass(item.name)}`;
        
        const isFolder = item.type === 'folder';
        const icon = isFolder ? 'fa-folder' : this.getFileIcon(item.name);
        const meta = isFolder ? '' : this.formatSize(item.file_size);

        div.innerHTML = `
            <div class="drive-item-actions">
                ${auth.hasRole('admin') ? `<div class="action-btn" onclick="event.stopPropagation(); drive.openShareModal(${item.id}, '${item.name.replace(/'/g, "\\'")}')"><i class="fas fa-share-alt"></i></div>` : ''}
                ${!isFolder ? `<div class="action-btn" onclick="event.stopPropagation(); drive.downloadFile(${item.id})"><i class="fas fa-download"></i></div>` : ''}
                ${auth.hasRole('admin') ? `<div class="action-btn delete" onclick="event.stopPropagation(); drive.deleteItem(${item.id})"><i class="fas fa-trash-alt"></i></div>` : ''}
            </div>
            <i class="fas ${icon} drive-item-icon"></i>
            <div class="drive-item-name" title="${item.name}">${item.name}</div>
            <div class="drive-item-meta">${meta}</div>
        `;

        div.onclick = () => {
            if (isFolder) {
                this.history.push({ id: item.id, name: item.name });
                this.loadItems(item.id);
            } else {
                this.downloadFile(item.id);
            }
        };

        return div;
    },

    updateBreadcrumbs() {
        const bread = document.getElementById('drive-breadcrumbs');
        let html = '<span class="breadcrumb-part" onclick="drive.navigateTo(null)">Root</span>';
        
        this.history.forEach((h, idx) => {
            html += ` <i class="fas fa-chevron-right" style="font-size:0.7rem; opacity:0.3;"></i> `;
            if (idx === this.history.length - 1) {
                html += `<span class="breadcrumb-part active">${h.name}</span>`;
            } else {
                html += `<span class="breadcrumb-part" onclick="drive.navigateTo(${h.id}, ${idx})">${h.name}</span>`;
            }
        });
        
        bread.innerHTML = html;
    },

    navigateTo(id, historyIdx = -1) {
        if (id === null) {
            this.history = [];
        } else if (historyIdx !== -1) {
            this.history = this.history.slice(0, historyIdx + 1);
        }
        this.loadItems(id);
    },

    async loadUsers() {
        try {
            this.users = await api.get('/users');
            const select = document.getElementById('share-user-id');
            if (select) {
                select.innerHTML = '<option value="">Select an employee...</option>' + 
                    this.users.filter(u => u.is_active === 1).map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
            }
        } catch {}
    },

    setupEventListeners() {
        const folderForm = document.getElementById('create-folder-form');
        if (folderForm) {
            folderForm.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('folder-name').value;
                try {
                    await api.post('/drive/folder', { name, parentId: this.currentParentId });
                    showToast('Folder created', 'success');
                    document.getElementById('folder-modal').style.display = 'none';
                    this.loadItems(this.currentParentId);
                    folderForm.reset();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            };
        }

        const shareForm = document.getElementById('share-form');
        if (shareForm) {
            shareForm.onsubmit = async (e) => {
                e.preventDefault();
                const itemId = this.sharingItemId;
                const userId = document.getElementById('share-user-id').value;
                const accessLevel = document.getElementById('share-access-level').value;
                try {
                    await api.post('/drive/share', { itemId, userId, accessLevel });
                    showToast('Access granted', 'success');
                    this.renderPermissions(itemId);
                } catch (err) {
                    showToast(err.message, 'error');
                }
            };
        }
    },

    async openShareModal(itemId, itemName) {
        this.sharingItemId = itemId;
        document.getElementById('share-item-info').textContent = `Sharing: ${itemName}`;
        document.getElementById('share-modal').style.display = 'flex';
        this.renderPermissions(itemId);
    },

    async renderPermissions(itemId) {
        const list = document.getElementById('current-permissions-list');
        list.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const perms = await api.get(`/drive/permissions/${itemId}`);
            if (!perms || perms.length === 0) {
                list.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">No specific employee access granted.</div>';
                return;
            }
            list.innerHTML = perms.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:8px;">
                    <div>
                        <div style="font-weight:600; font-size:0.8rem;">${p.user_name}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${p.user_email}</div>
                    </div>
                    <div class="badge badge-info" style="font-size:0.6rem;">${p.access_level.toUpperCase()}</div>
                </div>
            `).join('');
        } catch {
            list.innerHTML = 'Error loading permissions.';
        }
    },

    async deleteItem(id) {
        if (!confirm('Permanently delete this item? This cannot be undone.')) return;
        try {
            await api.delete(`/drive/${id}`);
            showToast('Item deleted', 'success');
            this.loadItems(this.currentParentId);
        } catch (e) {
            showToast(e.message, 'error');
        }
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const progressContainer = document.getElementById('upload-progress-container');
        const progressBar = document.getElementById('upload-progress-bar');
        const progressText = document.getElementById('upload-progress-text');
        const cancelBtn = document.getElementById('upload-cancel-btn');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        progressContainer.style.display = 'block';

        let cancelRequested = false;
        let currentXhr = null;
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = 1;
        cancelBtn.onclick = () => {
            cancelRequested = true;
            if (currentXhr) currentXhr.abort();
            progressContainer.style.display = 'none';
            showToast('Upload canceled', 'error');
        };

        // Use chunked upload for files > 10MB
        const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > CHUNK_SIZE) {
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            const uploadId = Math.random().toString(36).substring(2) + Date.now();
            let uploaded = 0;
            for (let chunk = 0; chunk < totalChunks; chunk++) {
                if (cancelRequested) break;
                const start = chunk * CHUNK_SIZE;
                const end = Math.min(file.size, start + CHUNK_SIZE);
                const blob = file.slice(start, end);
                await new Promise((resolveChunk, rejectChunk) => {
                    const xhr = new XMLHttpRequest();
                    currentXhr = xhr;
                    xhr.open('POST', api.BASE + '/drive/upload-chunk', true);
                    const token = auth.getToken();
                    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                    xhr.setRequestHeader('x-chunk-number', chunk);
                    xhr.setRequestHeader('x-total-chunks', totalChunks);
                    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
                    xhr.setRequestHeader('x-upload-id', uploadId);
                    xhr.upload.onprogress = function (e) {
                        if (e.lengthComputable) {
                            const percent = Math.round(((uploaded + e.loaded) / file.size) * 100);
                            progressBar.style.width = percent + '%';
                            progressText.textContent = percent + '%';
                        }
                    };
                    xhr.onload = () => {
                        uploaded += blob.size;
                        const percent = Math.round((uploaded / file.size) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.textContent = percent + '%';
                        resolveChunk();
                    };
                    xhr.onerror = () => {
                        if (!cancelRequested) {
                            showToast('Chunk upload failed', 'error');
                        }
                        progressContainer.style.display = 'none';
                        rejectChunk();
                    };
                    xhr.onabort = () => {
                        // No toast here, handled by cancelBtn
                        resolveChunk();
                    };
                    xhr.send(blob);
                });
            }
            if (!cancelRequested) {
                progressBar.style.width = '100%';
                progressText.textContent = '100%';
                setTimeout(() => { progressContainer.style.display = 'none'; }, 800);
                showToast('Upload successful', 'success');
                this.loadItems(this.currentParentId);
            }
            cancelBtn.disabled = true;
            cancelBtn.style.opacity = 0.5;
            return;
        }

        // Fallback to normal upload for small files
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentId', this.currentParentId || '');
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            currentXhr = xhr;
            xhr.open('POST', api.BASE + '/drive/upload', true);
            const token = auth.getToken();
            if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percent + '%';
                    progressText.textContent = percent + '%';
                }
            };
            xhr.onload = () => {
                progressBar.style.width = '100%';
                progressText.textContent = '100%';
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 800);
                if (xhr.status >= 200 && xhr.status < 300) {
                    showToast('Upload successful', 'success');
                    this.loadItems(this.currentParentId);
                    resolve();
                } else {
                    let msg = 'Upload failed';
                    try { msg = JSON.parse(xhr.responseText).message || msg; } catch {}
                    showToast(msg, 'error');
                    resolve();
                }
                cancelBtn.disabled = true;
                cancelBtn.style.opacity = 0.5;
            };
            xhr.onerror = () => {
                if (!cancelRequested) {
                    showToast('Upload failed', 'error');
                }
                progressContainer.style.display = 'none';
                resolve();
                cancelBtn.disabled = true;
                cancelBtn.style.opacity = 0.5;
            };
            xhr.onabort = () => {
                // No toast here, handled by cancelBtn
                resolve();
                cancelBtn.disabled = true;
                cancelBtn.style.opacity = 0.5;
            };
            xhr.send(formData);
        });
    },

    downloadFile(id) {
        const token = auth.getToken();
        if (!token || token === 'null' || token === 'undefined') {
            showToast('Security session missing. Please log out and back in.', 'error');
            return;
        }
        const url = `${api.BASE}/drive/download/${id}?token=${encodeURIComponent(token)}`;
        // Create hidden link to trigger download
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
    },

    getFileIcon(name) {
        const ext = name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'fa-file-image';
        if (['pdf'].includes(ext)) return 'fa-file-pdf';
        if (['zip', 'rar', '7z', 'gz'].includes(ext)) return 'fa-file-archive';
        if (['doc', 'docx'].includes(ext)) return 'fa-file-word';
        if (['xls', 'xlsx'].includes(ext)) return 'fa-file-excel';
        if (['mp4', 'mkv', 'avi'].includes(ext)) return 'fa-file-video';
        if (['mp3', 'wav'].includes(ext)) return 'fa-file-audio';
        return 'fa-file-alt';
    },

    getFileClass(name) {
        const ext = name.split('.').pop().toLowerCase();
        if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
        return '';
    },

    formatSize(bytes) {
        if (!bytes) return '';
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
};

window.drive = drive;
window.initDrive = () => drive.init();
window.handleFileUpload = (e) => drive.handleFileUpload(e);
window.navigateTo = (id) => drive.navigateTo(id);

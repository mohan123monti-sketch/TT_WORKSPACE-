let canvas;
let currentTool = 'select';
let isPanning = false;
let isSpaceDown = false;
let lastPosX, lastPosY;
let zoom = 1;
// Global Settings State
let brushColor = '#ffffff';
let brushSize = 3;
let gridVisible = true;

document.addEventListener('DOMContentLoaded', () => {
    console.log('⚡ Tech-Turf Workspace Initializing...');
    initCanvas();
    setupEventListeners();
    loadWorkspace();
    setTool('select'); // Default tool
});

function initCanvas() {
    try {
        // Customize Textbox to have OneNote-like borders and a top handle
        const originalRenderBg = fabric.Textbox.prototype._renderBackground;
        fabric.Textbox.prototype._renderBackground = function (ctx) {
            originalRenderBg.call(this, ctx);
            const w = this.width + (this.padding * 2);
            const h = this.height + (this.padding * 2);
            const x = -this.width / 2 - this.padding;
            const y = -this.height / 2 - this.padding;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, w, h);

            // Top drag handle (...)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(0 - 5, y + 6, 2, 2);
            ctx.fillRect(0, y + 6, 2, 2);
            ctx.fillRect(0 + 5, y + 6, 2, 2);
        };

        canvas = new fabric.Canvas('whiteboard-canvas', {
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 'transparent',
            isDrawingMode: false,
            selection: true,
            preserveObjectStacking: true
        });

        window.addEventListener('resize', () => {
            canvas.setWidth(window.innerWidth);
            canvas.setHeight(window.innerHeight);
            canvas.renderAll();
        });

        // Handle auto-save on modifications
        canvas.on('object:modified', saveWorkspaceDebounced);
        canvas.on('path:created', (opt) => {
            // If we're using the fallback eraser (PencilBrush with destination-out)
            // we must ensure the resulting path object keeps that composite operation
            if (currentTool === 'eraser' && (!fabric.EraserBrush || !(canvas.freeDrawingBrush instanceof fabric.EraserBrush))) {
                opt.path.set({
                    globalCompositeOperation: 'destination-out',
                    stroke: 'rgba(0,0,0,1)'
                });
                canvas.renderAll();
            }
            saveWorkspaceDebounced();
        });
        canvas.on('object:added', (e) => {
            // Paths trigger path:created, others trigger object:added
            if (!e.target.isType('path')) {
                // Ensure new objects are erasable for the plugin
                e.target.set('erasable', true);
                saveWorkspaceDebounced();
            }
            syncLayersPanel();
        });
        canvas.on('object:removed', syncLayersPanel);
        canvas.on('object:modified', syncLayersPanel);

        console.log('✅ Canvas initialized');
    } catch (err) {
        console.error('❌ Canvas initialization failed:', err);
    }
}

function setupEventListeners() {
    // Helper to add listener Safely
    const safeListen = (id, event, fn) => {
        const el = document.getElementById(id) || document.querySelector(id);
        if (el) {
            el.addEventListener(event, fn);
        } else {
            console.warn(`⚠️ Element not found for listener: ${id}`);
        }
    };

    // Toolbar Tools
    safeListen('tool-select', 'click', () => setTool('select'));
    safeListen('tool-pencil', 'click', () => setTool('pencil'));
    safeListen('tool-rect', 'click', () => setTool('rect'));
    safeListen('tool-circle', 'click', () => setTool('circle'));
    safeListen('tool-text', 'click', () => setTool('text'));
    safeListen('tool-sticky', 'click', () => setTool('sticky'));
    safeListen('tool-eraser', 'click', () => setTool('eraser'));
    safeListen('tool-image', 'click', () => document.getElementById('image-upload').click());
    safeListen('grid-toggle', 'click', toggleGrid);
    safeListen('ctx-lock', 'click', toggleLock);

    safeListen('tool-clear', 'click', () => {
        if (confirm('Clear entire canvas?')) {
            canvas.clear();
            saveWorkspace();
        }
    });

    // Image Upload Logic
    safeListen('image-upload', 'change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (f) => {
            const data = f.target.result;
            fabric.Image.fromURL(data, (oImg) => {
                oImg.scaleToWidth(300);
                canvas.add(oImg);
                canvas.centerObject(oImg);
                canvas.setActiveObject(oImg);
                canvas.renderAll();
                saveWorkspace();
                showToast('Image imported', 'success');
            });
        };
        reader.readAsDataURL(file);
    });

    // Zoom Controls
    safeListen('zoom-in', 'click', () => adjustZoom(0.1));
    safeListen('zoom-out', 'click', () => adjustZoom(-0.1));

    // Header Actions
    safeListen('.settings-icon', 'click', toggleSettings);
    safeListen('close-settings', 'click', toggleSettings);
    safeListen('.btn-share', 'click', shareWorkspace);
    safeListen('.workspace-title-edit-icon', 'click', editTitle);
    safeListen('wb-title', 'click', editTitle);

    // Settings Modal Functionality
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            brushColor = swatch.dataset.color;
            updateBrushSettings();
        });
    });

    safeListen('brush-size', 'input', (e) => {
        brushSize = parseInt(e.target.value);
        document.getElementById('brush-size-val').innerText = brushSize + 'px';
        updateBrushSettings();
    });

    safeListen('save-settings', 'click', toggleSettings);

    // Chat Sidebar Interactivity
    safeListen('.minimize-chat', 'click', () => {
        const panel = document.querySelector('.nexus-chat-panel');
        panel.classList.toggle('minimized');
        const icon = document.querySelector('.minimize-chat');
        if (panel.classList.contains('minimized')) {
            icon.classList.replace('fa-minus', 'fa-expand-alt');
        } else {
            icon.classList.replace('fa-expand-alt', 'fa-minus');
        }
    });

    // Mock Actions for secondary UI
    safeListen('.fa-microphone', 'click', () => showToast('Nexus Voice command active...', 'info'));
    safeListen('.fa-paperclip', 'click', () => showToast('Attachment system coming soon', 'info'));

    // Unified Sidebar Logic
    const sidebar = document.getElementById('sidebar-main');
    const toggleHandle = document.getElementById('sidebar-toggle-handle');
    const tabs = document.querySelectorAll('.sidebar-tab');
    const tabContents = document.querySelectorAll('.sidebar-tab-content');

    if (toggleHandle && sidebar) {
        toggleHandle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // If sidebar is collapsed, open it
            if (sidebar.classList.contains('sidebar-collapsed')) {
                sidebar.classList.remove('sidebar-collapsed');
            }

            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update content view
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${target}`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Custom Link Listeners
    const addLinkBtn = document.getElementById('add-custom-link-btn');
    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => {
            const name = prompt('Shortcut Name:');
            if (!name) return;
            const urlRaw = prompt('URL:');
            if (!urlRaw) return;
            const url = urlRaw.startsWith('http') ? urlRaw : 'https://' + urlRaw;
            addCustomShortcut(name, url);
        });
    }
    // Template Listeners
    document.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.template;
            applyTemplate(type);
        });
    });

    // Global Keyboard Shortcuts for Drawing
    document.addEventListener('keydown', (e) => {
        // Ignore if user is typing in chat or editing text
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            isSpaceDown = true;
            canvas.defaultCursor = 'grab';
            e.preventDefault(); // Prevent page scroll
        }

        switch (e.key.toLowerCase()) {
            case 'v': setTool('select'); break;
            case 'p': setTool('pencil'); break;
            case 'r': setTool('rect'); break;
            case 'o': setTool('circle'); break;
            case 't': setTool('text'); break;
            case 'i':
                const imagePrompt = document.getElementById('image-upload');
                if (imagePrompt) imagePrompt.click();
                break;
            case 'e': setTool('eraser'); break;
            case 'backspace':
            case 'delete':
                const activeObjects = canvas.getActiveObjects();
                if (activeObjects.length > 0) {
                    // Prevent deleting if user is typing text in an active IText block
                    const activeObj = canvas.getActiveObject();
                    if (activeObj && activeObj.isEditing) return;

                    activeObjects.forEach(obj => canvas.remove(obj));
                    canvas.discardActiveObject();
                    saveWorkspaceDebounced();
                } else if (e.key.toLowerCase() === 'delete') {
                    if (confirm('Clear entire canvas?')) {
                        canvas.clear();
                        saveWorkspace();
                    }
                }
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpaceDown = false;
            canvas.defaultCursor = 'default';
        }
    });

    // Canvas Events for Drawing Shapes / Pan
    canvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        // Middle click is button === 1. Space + Left click. Alt + Left click.
        if (evt.button === 1 || evt.altKey === true || isSpaceDown || currentTool === 'pan') {
            isPanning = true;
            canvas.selection = false;
            canvas.defaultCursor = 'grabbing';
            lastPosX = evt.clientX;
            lastPosY = evt.clientY;
        } else if (evt.button === 0 && currentTool !== 'select' && currentTool !== 'pencil' && currentTool !== 'eraser') {
            createShape(opt);
        }
    });

    canvas.on('mouse:move', (opt) => {
        if (isPanning) {
            const e = opt.e;
            const vpt = canvas.viewportTransform;
            vpt[4] += e.clientX - lastPosX;
            vpt[5] += e.clientY - lastPosY;
            canvas.requestRenderAll();
            lastPosX = e.clientX;
            lastPosY = e.clientY;
            updateImageToolbar();
        }
    });

    canvas.on('mouse:up', () => {
        canvas.setViewportTransform(canvas.viewportTransform);
        isPanning = false;
        canvas.selection = true;
        canvas.defaultCursor = isSpaceDown ? 'grab' : 'default';
        updateImageToolbar();
    });

    canvas.on('mouse:wheel', (opt) => {
        const e = opt.e;
        if (e.ctrlKey) {
            // Zooming
            const delta = e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 20) zoom = 20;
            if (zoom < 0.01) zoom = 0.01;
            canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
            updateZoomLabel(zoom);
        } else {
            // Panning
            const vpt = canvas.viewportTransform;
            vpt[4] -= e.deltaX;
            vpt[5] -= e.deltaY;
            canvas.requestRenderAll();
        }
        e.preventDefault();
        e.stopPropagation();
        updateImageToolbar();
    });

    // --- Image Toolbar Logic ---
    const imageToolbar = document.getElementById('image-toolbar');

    function updateImageToolbar() {
        if (!imageToolbar) return;
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type === 'image') {
            // Get the precise top-center point of the object in world coordinates
            const topCenter = activeObj.getPointByOrigin('center', 'top');

            // Project it to the current viewport (accounts for pan and zoom)
            const vpPoint = fabric.util.transformPoint(topCenter, canvas.viewportTransform);

            const canvasEl = canvas.getElement();
            const canvasRect = canvasEl.getBoundingClientRect();

            // Calculate final screen coordinates
            const screenLeft = canvasRect.left + vpPoint.x;
            let screenTop = canvasRect.top + vpPoint.y;

            // Offset to be above the image
            screenTop -= 20;

            // Constrain to prevent going behind the header (100px safety zone)
            if (screenTop < 100) screenTop = 100;

            imageToolbar.style.display = 'flex';
            imageToolbar.style.left = screenLeft + 'px';
            imageToolbar.style.top = screenTop + 'px';
        } else {
            imageToolbar.style.display = 'none';
        }
    }

    canvas.on('selection:created', updateImageToolbar);
    canvas.on('selection:updated', updateImageToolbar);
    canvas.on('selection:cleared', updateImageToolbar);
    canvas.on('object:moving', updateImageToolbar);
    canvas.on('object:moved', updateImageToolbar);
    canvas.on('object:scaling', updateImageToolbar);
    canvas.on('object:scaled', updateImageToolbar);
    canvas.on('object:rotating', updateImageToolbar);
    canvas.on('object:rotated', updateImageToolbar);


    // --- Image Toolbar Actions ---
    function handleToolbarClick(e, action) {
        const activeObj = canvas.getActiveObject();
        if (!activeObj || activeObj.type !== 'image') return;

        e.stopPropagation();
        e.preventDefault();

        switch (action) {
            case 'border':
                const colors = [null, '#ffffff', '#102a96', '#00ff00', '#ff4d4d'];
                let currentIdx = colors.indexOf(activeObj.stroke);
                let nextIdx = (currentIdx + 1) % colors.length;
                activeObj.set({
                    stroke: colors[nextIdx],
                    strokeWidth: colors[nextIdx] ? 4 : 0,
                    strokeUniform: true
                });
                break;
            case 'resize':
                activeObj.scale(1).set({ angle: 0 });
                canvas.centerObject(activeObj);
                updateImageToolbar();
                break;
            case 'send-back':
                activeObj.sendToBack();
                break;
            case 'tag':
                const tagName = prompt('Enter tag name:');
                if (tagName) {
                    const textTag = new fabric.Text(tagName.toUpperCase(), {
                        left: activeObj.left + (activeObj.width * activeObj.scaleX / 2),
                        top: activeObj.top + (activeObj.height * activeObj.scaleY) + 10,
                        fontSize: 14,
                        fill: '#ffffff',
                        backgroundColor: '#102a96',
                        padding: 6,
                        fontFamily: 'Rajdhani',
                        fontWeight: 'bold',
                        originX: 'center',
                        erasable: true
                    });
                    canvas.add(textTag);
                }
                break;
            case 'filter':
                openImageEditor(activeObj);
                return; // Modal handles its own render
            case 'crop':
                performCenterCrop(activeObj);
                break;
            case 'download':
                downloadImage(activeObj);
                break;
            case 'info':
                const infoMsg = `Dimensions: ${Math.round(activeObj.getScaledWidth())}x${Math.round(activeObj.getScaledHeight())}\n` +
                    `Position: (${Math.round(activeObj.left)}, ${Math.round(activeObj.top)})\n` +
                    `Type: ${activeObj.src ? 'Remote Image' : 'Local Resource'}`;
                showToast(infoMsg, 'info');
                return;
        }

        canvas.renderAll();
        saveWorkspaceDebounced();
    }

    // --- Image Studio (Editor) Logic ---
    let editingObj = null;

    function openImageEditor(obj) {
        editingObj = obj;
        document.getElementById('editor-modal').style.display = 'flex';
        document.getElementById('editor-preview-img').src = obj.src || obj._element.src;

        // Reset sliders
        document.getElementById('filter-brightness').value = 0;
        document.getElementById('filter-contrast').value = 0;
    }

    function applyFilters() {
        if (!editingObj) return;

        const brightness = parseFloat(document.getElementById('filter-brightness').value);
        const contrast = parseFloat(document.getElementById('filter-contrast').value);

        editingObj.filters = [];
        if (brightness !== 0) editingObj.filters.push(new fabric.Image.filters.Brightness({ brightness }));
        if (contrast !== 0) editingObj.filters.push(new fabric.Image.filters.Contrast({ contrast }));

        editingObj.applyFilters();
        canvas.renderAll();
        saveWorkspaceDebounced();
        closeEditor();
        showToast('Processing complete', 'success');
    }

    function addPresetFilter(type) {
        if (!editingObj) return;
        let filter;
        switch (type) {
            case 'grayscale': filter = new fabric.Image.filters.Grayscale(); break;
            case 'sepia': filter = new fabric.Image.filters.Sepia(); break;
            case 'invert': filter = new fabric.Image.filters.Invert(); break;
            case 'pixelate': filter = new fabric.Image.filters.Pixelate({ blocksize: 8 }); break;
            case 'blur': filter = new fabric.Image.filters.Blur({ blur: 0.5 }); break;
        }
        if (filter) {
            editingObj.filters.push(filter);
            editingObj.applyFilters();
            canvas.renderAll();
        }
    }

    function performCenterCrop(obj) {
        // Simple Center Square Crop Logic
        const size = Math.min(obj.width, obj.height);
        obj.set({
            cropX: (obj.width - size) / 2,
            cropY: (obj.height - size) / 2,
            width: size,
            height: size
        });
        obj.setCoords(); // CRITICAL: Updates the selection box and handles
        canvas.renderAll();
        saveWorkspaceDebounced();
        showToast('Square crop applied', 'success');
    }

    function downloadImage(obj) {
        try {
            const dataURL = obj.toDataURL({
                format: 'png',
                quality: 1
            });
            const link = document.createElement('a');
            link.download = `tech-turf-export-${Date.now()}.png`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Image download started', 'success');
        } catch (err) {
            console.error('Download failed:', err);
            showToast('Download failed (might be cross-origin)', 'error');
        }
    }

    function closeEditor() {
        document.getElementById('editor-modal').style.display = 'none';
        editingObj = null;
    }

    // Modal listeners
    safeListen('close-editor', 'click', closeEditor);
    safeListen('cancel-editor', 'click', closeEditor);
    safeListen('apply-editor', 'click', applyFilters);
    safeListen('filter-reset', 'click', () => {
        if (editingObj) {
            editingObj.filters = [];
            editingObj.applyFilters();
            canvas.renderAll();
            document.getElementById('filter-brightness').value = 0;
            document.getElementById('filter-contrast').value = 0;
        }
    });

    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => addPresetFilter(btn.dataset.filter));
    });

    safeListen('ctx-border', 'click', (e) => handleToolbarClick(e, 'border'));
    safeListen('ctx-resize', 'click', (e) => handleToolbarClick(e, 'resize'));
    safeListen('ctx-send-back', 'click', (e) => handleToolbarClick(e, 'send-back'));
    safeListen('ctx-tag', 'click', (e) => handleToolbarClick(e, 'tag'));
    safeListen('ctx-edit', 'click', (e) => handleToolbarClick(e, 'filter'));
    safeListen('ctx-crop', 'click', (e) => handleToolbarClick(e, 'crop'));
    safeListen('ctx-download', 'click', (e) => handleToolbarClick(e, 'download'));
    safeListen('ctx-info', 'click', (e) => handleToolbarClick(e, 'info'));

    // Chat functionality
    safeListen('chat-send', 'click', sendMessage);
    safeListen('chat-textarea', 'keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function updateBrushSettings() {
    if (canvas.isDrawingMode) {
        if (currentTool === 'eraser') {
            if (!fabric.EraserBrush) {
                console.warn('EraserBrush plugin not loaded yet');
                return;
            }
            if (!(canvas.freeDrawingBrush instanceof fabric.EraserBrush)) {
                canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
            }
            canvas.freeDrawingBrush.width = brushSize * 10;
        } else {
            if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            }
            canvas.freeDrawingBrush.color = brushColor;
            canvas.freeDrawingBrush.width = brushSize;
        }
    }
}

function setTool(toolName) {
    currentTool = toolName;

    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const toolEl = document.getElementById(`tool-${toolName}`);
    if (toolEl) toolEl.classList.add('active');

    canvas.isDrawingMode = (toolName === 'pencil' || toolName === 'eraser');

    if (canvas.isDrawingMode) {
        if (toolName === 'eraser') {
            if (fabric.EraserBrush) {
                canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
                canvas.freeDrawingBrush.width = brushSize * 10;
            } else {
                // Fallback for emergency
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                canvas.freeDrawingBrush.globalCompositeOperation = 'destination-out';
                canvas.freeDrawingBrush.width = brushSize * 10;
                canvas.freeDrawingBrush.color = 'rgba(0,0,0,1)';
            }
        } else {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = brushColor;
            canvas.freeDrawingBrush.width = brushSize;
        }
    }
}

function createShape(opt) {
    const pointer = canvas.getPointer(opt.e);
    let shape;

    const commonProps = {
        left: pointer.x,
        top: pointer.y,
        fill: 'transparent',
        stroke: brushColor,
        strokeWidth: 2,
        erasable: true // Required for Fabric.js EraserBrush plugin
    };

    switch (currentTool) {
        case 'rect':
            shape = new fabric.Rect({ ...commonProps, width: 100, height: 100 });
            break;
        case 'circle':
            shape = new fabric.Circle({ ...commonProps, radius: 50 });
            break;
        case 'text':
            shape = new fabric.Textbox('Type something...', {
                left: pointer.x,
                top: pointer.y - 15,
                width: 300,
                padding: 10,
                fill: brushColor,
                fontFamily: 'Rajdhani',
                fontSize: 22,
                backgroundColor: 'rgba(5, 5, 10, 0.7)',
                cornerColor: '#102a96',
                cornerSize: 10,
                transparentCorners: false,
                borderColor: '#102a96',
                editingBorderColor: '#102a96',
                erasable: true
            });
            break;
        case 'sticky':
            shape = new fabric.Textbox('New Note', {
                left: pointer.x,
                top: pointer.y - 15,
                width: 180,
                height: 180,
                padding: 20,
                fill: '#000000',
                fontFamily: 'Rajdhani',
                fontSize: 18,
                backgroundColor: '#ffff88',
                textAlign: 'center',
                cornerColor: '#102a96',
                cornerSize: 8,
                transparentCorners: false,
                borderColor: '#102a96',
                editingBorderColor: '#102a96',
                erasable: true,
                shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.3)',
                    blur: 15,
                    offsetX: 5,
                    offsetY: 5
                })
            });
            break;
    }

    if (shape) {
        canvas.add(shape);
        canvas.setActiveObject(shape);

        if (currentTool === 'text') {
            shape.enterEditing();
            shape.hiddenTextarea.focus();

            shape.on('editing:exited', () => {
                if (!shape.text || shape.text.trim() === '') {
                    canvas.remove(shape);
                    canvas.renderAll();
                } else {
                    saveWorkspaceDebounced();
                }
            });
        }

        setTool('select'); // Back to select tool after placing shape
    }
}

function adjustZoom(delta) {
    let zoom = canvas.getZoom();
    zoom += delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    canvas.setZoom(zoom);
    updateZoomLabel(zoom);
    updateImageToolbar();
}

function updateZoomLabel(zoom) {
    const el = document.getElementById('zoom-level');
    if (el) el.innerText = Math.round(zoom * 100) + '%';
}

function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = (modal.style.display === 'none' || !modal.style.display) ? 'flex' : 'none';
        console.log('Settings toggled:', modal.style.display);
    }
}

function shareWorkspace() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Sharable link copied to clipboard!', 'info');
    }).catch(err => {
        console.error('Copy failed', err);
        showToast('Failed to copy link', 'error');
    });
}

function editTitle() {
    const newTitle = prompt('Enter workspace title:', document.getElementById('wb-title').innerText);
    if (newTitle && newTitle.trim()) {
        document.getElementById('wb-title').innerText = newTitle.toUpperCase();
        saveWorkspace();
    }
}

// State Persistence with Debouncing
let saveTimeout;
function saveWorkspaceDebounced() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveWorkspace, 3000);
}

async function saveWorkspace() {
    if (!canvas) return;
    const content = JSON.stringify(canvas.toJSON(['globalCompositeOperation', 'eraser']));
    const preview = canvas.toDataURL({ format: 'png', quality: 0.1 });
    const title = document.getElementById('wb-title').innerText;

    try {
        const res = await api.post('/workspace/save', {
            id: window.workspaceId,
            title: title,
            content_json: content,
            last_preview_base64: preview
        });
        if (res && res.success) {
            window.workspaceId = res.id;
        }
    } catch (err) {
        console.error('💾 Save failed:', err.message);
    }
}

async function loadWorkspace() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return;

    window.workspaceId = id;
    try {
        const res = await api.get(`/workspace/${id}`);
        if (res && res.content_json) {
            canvas.loadFromJSON(res.content_json, () => {
                // Ensure all objects are erasable for the plugin
                canvas.getObjects().forEach(obj => obj.set('erasable', true));
                canvas.renderAll();
                document.getElementById('wb-title').innerText = res.title || 'UNTITLED';
                console.log('✅ Workspace loaded');
            });
        }
    } catch (err) {
        console.error('❌ Load failed:', err);
    }
}

function sendMessage() {
    const input = document.getElementById('chat-textarea');
    const text = input.value.trim();
    if (!text) return;

    const messages = document.getElementById('chat-messages');
    const noMessages = messages.querySelector('.no-messages');
    if (noMessages) noMessages.remove();

    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.style.display = 'flex';
    userMsg.style.justifyContent = 'flex-end';
    userMsg.innerHTML = `<div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; font-size: 0.9rem; max-width: 80%; border: 1px solid rgba(255,255,255,0.1);">${text}</div>`;
    messages.appendChild(userMsg);

    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Simulate Nexus response
    setTimeout(() => {
        const nexusMsg = document.createElement('div');
        nexusMsg.className = 'message nexus-message';
        nexusMsg.innerHTML = `<div style="background: rgba(16,42,150,0.1); border-left: 3px solid var(--accent-primary); padding: 12px; border-radius: 4px 12px 12px 4px; font-size: 0.9rem; align-self: flex-start; max-width: 80%;"><i class="fas fa-brain" style="margin-right: 8px; color: var(--accent-primary);"></i> Nexus is ready. All whiteboard data is indexed. How can I assist?</div>`;
        messages.appendChild(nexusMsg);
        messages.scrollTop = messages.scrollHeight;
    }, 800);
}

// ------ Custom Links Logic ------
function getCustomShortcuts() {
    try {
        const storage = localStorage.getItem('techTurfLinks');
        if (storage) return JSON.parse(storage);
    } catch (err) {
        console.warn('Could not parse techTurfLinks', err);
    }
    return [
        { name: 'ChatGPT', url: 'https://chat.openai.com' },
        { name: 'Stitch', url: 'https://stitch.com' },
        { name: 'Google', url: 'https://google.com' }
    ];
}

function saveCustomShortcuts(links) {
    localStorage.setItem('techTurfLinks', JSON.stringify(links));
}

function renderCustomShortcuts() {
    const list = document.getElementById('custom-links-container');
    if (!list) return;

    list.innerHTML = '';
    const links = getCustomShortcuts();

    links.forEach((link, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="${link.url}" target="_blank">
                <img src="https://www.google.com/s2/favicons?domain=${link.url}" width="16" height="16" style="border-radius: 4px;">
                ${link.name}
            </a>
            <i class="fas fa-times remove-link" data-idx="${idx}" title="Remove Shortcut"></i>
        `;
        list.appendChild(li);
    });

    // Attach remove listeners
    list.querySelectorAll('.remove-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            removeCustomShortcut(idx);
        });
    });
}

function addCustomShortcut(name, url) {
    const links = getCustomShortcuts();
    links.push({ name, url });
    saveCustomShortcuts(links);
    renderCustomShortcuts();
}

function removeCustomShortcut(index) {
    const links = getCustomShortcuts();
    links.splice(index, 1);
    saveCustomShortcuts(links);
    renderCustomShortcuts();
}

// ------ New Feature Logic ------

function toggleGrid() {
    gridVisible = !gridVisible;
    const container = document.querySelector('.workspace-container');
    if (gridVisible) {
        container.style.backgroundImage = `
            radial-gradient(circle at 50% 50%, rgba(16, 42, 150, 0.05) 0%, transparent 50%),
            radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`;
    } else {
        container.style.backgroundImage = 'none';
    }
    showToast(`Grid ${gridVisible ? 'Enabled' : 'Disabled'}`, 'info');
}

function toggleLock() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    const isLocked = !activeObj.lockMovementX;
    activeObj.set({
        lockMovementX: isLocked,
        lockMovementY: isLocked,
        lockScalingX: isLocked,
        lockScalingY: isLocked,
        lockRotation: isLocked,
        hasControls: !isLocked
    });

    const icon = document.querySelector('#ctx-lock i');
    if (icon) {
        icon.className = isLocked ? 'fas fa-unlock' : 'fas fa-lock';
    }

    canvas.renderAll();
    syncLayersPanel();
    showToast(`Object ${isLocked ? 'Locked' : 'Unlocked'}`, 'info');
}

function syncLayersPanel() {
    const list = document.getElementById('layers-list');
    if (!list) return;

    const objects = canvas.getObjects().filter(o => o.type !== 'path'); // Skip free drawing paths for simplicity

    if (objects.length === 0) {
        list.innerHTML = '<div class="no-layers">No objects on canvas</div>';
        return;
    }

    list.innerHTML = '';
    // Reverse to show top-most at top of list
    [...objects].reverse().forEach((obj, idx) => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        if (canvas.getActiveObject() === obj) item.classList.add('active');

        const typeIcon = getLayerIcon(obj.type);
        const name = obj.type.charAt(0).toUpperCase() + obj.type.slice(1);

        item.innerHTML = `
            <div class="layer-icon"><i class="fas ${typeIcon}"></i></div>
            <div class="layer-name">${name} ${objects.length - idx}</div>
            <div class="layer-actions">
                <i class="fas ${obj.lockMovementX ? 'fa-lock' : 'fa-unlock'} layer-action-btn toggle-lock" title="Lock/Unlock"></i>
                <i class="fas ${obj.visible ? 'fa-eye' : 'fa-eye-slash'} layer-action-btn toggle-visibility" title="Show/Hide"></i>
                <i class="fas fa-trash layer-action-btn delete-layer" title="Delete"></i>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('layer-action-btn')) return;
            canvas.setActiveObject(obj);
            canvas.renderAll();
            syncLayersPanel();
        });

        item.querySelector('.toggle-lock').addEventListener('click', () => {
            const l = !obj.lockMovementX;
            obj.set({
                lockMovementX: l, lockMovementY: l,
                lockScalingX: l, lockScalingY: l,
                lockRotation: l, hasControls: !l
            });
            canvas.renderAll();
            syncLayersPanel();
        });

        item.querySelector('.toggle-visibility').addEventListener('click', () => {
            obj.set('visible', !obj.visible);
            canvas.renderAll();
            syncLayersPanel();
        });

        item.querySelector('.delete-layer').addEventListener('click', () => {
            canvas.remove(obj);
            canvas.renderAll();
            syncLayersPanel();
        });

        list.appendChild(item);
    });
}

function getLayerIcon(type) {
    switch (type) {
        case 'image': return 'fa-image';
        case 'textbox': return 'fa-font';
        case 'rect': return 'fa-square';
        case 'circle': return 'fa-circle';
        case 'sticky': return 'fa-note-sticky';
        default: return 'fa-shapes';
    }
}

function applyTemplate(type) {
    if (!confirm('This will clear the current canvas. Continue?')) return;
    canvas.clear();

    switch (type) {
        case 'brainstorm':
            const centerText = new fabric.Textbox('CORE IDEA', {
                left: canvas.width / 2, top: canvas.height / 2,
                originX: 'center', originY: 'center',
                backgroundColor: '#102a96', fill: '#fff', padding: 20, fontSize: 30, borderRadius: 10
            });
            canvas.add(centerText);

            const radius = 250;
            const themes = ['User Needs', 'Market Trends', 'Feasibility', 'Innovation'];
            themes.forEach((t, i) => {
                const angle = (i / themes.length) * Math.PI * 2;
                const x = (canvas.width / 2) + Math.cos(angle) * radius;
                const y = (canvas.height / 2) + Math.sin(angle) * radius;

                const note = new fabric.Textbox(t, {
                    left: x, top: y, originX: 'center', originY: 'center',
                    backgroundColor: '#ffff88', fill: '#000', padding: 15, fontSize: 18, shadow: 'rgba(0,0,0,0.2) 5px 5px 10px'
                });
                canvas.add(note);
            });
            break;

        case 'kanban':
            const cols = ['TO DO', 'IN PROGRESS', 'DONE'];
            const w = canvas.width / 4;
            cols.forEach((col, i) => {
                const rect = new fabric.Rect({
                    left: (i + 1) * w - w / 2, top: 100,
                    width: w - 40, height: canvas.height - 200,
                    fill: 'rgba(255,255,255,0.05)', stroke: '#102a96', strokeWidth: 2, rx: 10, ry: 10
                });
                const head = new fabric.Textbox(col, {
                    left: (i + 1) * w - w / 2, top: 60,
                    originX: 'center', fill: '#102a96', fontWeight: 'bold', fontSize: 24
                });
                canvas.add(rect, head);
            });
            break;

        case 'flowchart':
            const start = new fabric.Circle({
                left: canvas.width / 2, top: 100, radius: 40,
                fill: '#2ecc71', originX: 'center'
            });
            const startText = new fabric.Text('START', {
                left: canvas.width / 2, top: 110, originX: 'center', fill: '#fff', fontSize: 14
            });

            const step1 = new fabric.Rect({
                left: canvas.width / 2, top: 250, width: 150, height: 60,
                fill: '#102a96', originX: 'center', rx: 5, ry: 5
            });
            const step1Text = new fabric.Textbox('PROCESS 1', {
                left: canvas.width / 2, top: 265, originX: 'center', fill: '#fff', fontSize: 16, textAlign: 'center', width: 140
            });

            canvas.add(start, startText, step1, step1Text);
            break;
    }

    canvas.renderAll();
    saveWorkspace();
    syncLayersPanel();
    showToast(`Template '${type}' applied`, 'success');
}

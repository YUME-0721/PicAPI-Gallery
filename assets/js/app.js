
// Configuration
const CONFIG = {
    totalHorizontal: 882,
    totalVertical: 3289,
    batchSize: 30, // 增加批量加载数量，提前预加载更多图片
    pathH: '/ri/h/',
    pathV: '/ri/v/'
};

// State
let state = {
    images: [], // Full list of objects {id, type, url}
    visibleImages: [], // Currently filtered list
    loadedCount: 0,
    currentMode: 'all', // 'all', 'h', 'v'
    isLoading: false,
    hasMore: true,
    columns: [], // 瀑布流列元素
    columnHeights: [] // 每列的当前高度
};

// Elements
const dom = {
    grid: document.getElementById('gallery-grid'),
    loader: document.getElementById('loader'),
    endMessage: document.getElementById('end-message'),
    filters: document.querySelectorAll('.filter-btn'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close')
};

// --- Initialization ---

function init() {
    // 确保 DOM 元素存在
    if (!dom.grid) {
        return;
    }

    generateImageList();
    shuffleImages(state.images);
    state.visibleImages = [...state.images]; // Start with all

    // Initialize masonry columns
    initColumns();

    // Setup event listeners
    setupFilters();
    setupLightbox();
    setupInfiniteScroll();

    // Initial load
    loadMoreImages();

    // Scroll-aware Navbar
    setupScrollNavbar();

    // Setup resize handler
    window.addEventListener('resize', handleResize);
}

function setupScrollNavbar() {
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 60) {
            // Scroll Down
            navbar.classList.add('hidden');
        } else {
            // Scroll Up
            navbar.classList.remove('hidden');
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });
}

// Generate the list of all available images
function generateImageList() {
    const list = [];

    // Add horizontal images
    for (let i = 1; i <= CONFIG.totalHorizontal; i++) {
        list.push({
            id: i,
            type: 'h',
            url: `${CONFIG.pathH}${i}.webp`
        });
    }

    // Add vertical images
    for (let i = 1; i <= CONFIG.totalVertical; i++) {
        list.push({
            id: i,
            type: 'v',
            url: `${CONFIG.pathV}${i}.webp`
        });
    }

    state.images = list;
}

// Fisher-Yates Shuffle
function shuffleImages(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Rendering ---

function loadMoreImages() {
    if (state.isLoading || !state.hasMore) return;

    // 确保列已经初始化
    if (state.columns.length === 0) {
        initColumns();
    }

    state.isLoading = true;
    dom.loader.classList.add('active');

    const columnCount = state.columns.length;
    const nextBatch = state.visibleImages.slice(state.loadedCount, state.loadedCount + CONFIG.batchSize);

    if (nextBatch.length === 0) {
        state.hasMore = false;
        state.isLoading = false;
        dom.loader.classList.remove('active');
        dom.endMessage.style.display = 'block';
        return;
    }

    // 按行加载图片
    for (let i = 0; i < nextBatch.length; i++) {
        const imgData = nextBatch[i];
        // 为初始加载的图片设置高优先级，确保它们优先加载
        const isPriority = state.loadedCount < columnCount * 4; // 前四行图片优先加载，增加预加载数量
        const item = createGalleryItem(imgData, isPriority);
        
        // 按顺序分配到列中，实现一行一行加载
        const columnIndex = i % columnCount;
        const column = state.columns[columnIndex];
        if (column) {
            column.appendChild(item);

            // Update column height when image loads
            const img = item.querySelector('img');
            img.onload = function() {
                item.classList.add('loaded');
                
                // Update column height
                state.columnHeights[columnIndex] = column.offsetHeight;
                
                // 图片加载完成后淡入显示
                setTimeout(() => {
                    item.classList.remove('opacity-0');
                }, 100);
            };

            img.onerror = function() {
                // Even if image fails to load, mark as loaded to remove placeholder
                item.classList.add('loaded');
                item.classList.remove('opacity-0');
                // Optionally, we could add an error indicator
                img.style.backgroundColor = '#333';
                img.style.display = 'flex';
                img.style.alignItems = 'center';
                img.style.justifyContent = 'center';
                img.textContent = '加载失败';
                
                // Update column height
                state.columnHeights[columnIndex] = column.offsetHeight;
            };
        } else {
            // Column not found, skip
        }
    }

    // 延迟更新加载状态，确保图片有足够时间开始加载
    setTimeout(() => {
        state.loadedCount += nextBatch.length;
        state.isLoading = false;
        dom.loader.classList.remove('active');

        // 设置 gallery-grid 为 ready 状态，触发淡入效果
        if (state.loadedCount > 0) {
            dom.grid.dataset.ready = 'true';
        }

        // Check if we already exhausted the list
        if (state.loadedCount >= state.visibleImages.length) {
            state.hasMore = false;
            dom.endMessage.style.display = 'block';
        }
    }, 100);

    // 如果还有更多图片且加载器可见，继续加载
    if (state.hasMore) {
        const rect = dom.loader.getBoundingClientRect();
        if (rect.top < window.innerHeight + 600) {
            // 使用 setTimeout 避免堆栈过深，并允许 UI 刷新
            setTimeout(() => loadMoreImages(), 50);
        }
    }
}

function createGalleryItem(data, isPriority = false) {
    const div = document.createElement('div');
    div.className = 'gallery-item opacity-0'; // 初始隐藏，用于淡入效果

    const img = document.createElement('img');
    // 为优先加载的图片设置更高的加载优先级
    img.loading = isPriority ? 'eager' : 'lazy'; // 视口内的图片立即加载
    img.fetchpriority = isPriority ? 'high' : 'auto'; // 视口内的图片设置高优先级
    img.decoding = 'async'; // 异步解码，提升性能
    img.alt = `Gallery Image ${data.type.toUpperCase()} ${data.id}`;

    // 直接设置 src，让浏览器自己处理懒加载
    img.src = data.url;

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'item-overlay';

    const badge = document.createElement('span');
    badge.className = 'item-badge';
    badge.textContent = data.type === 'h' ? '横屏' : '竖屏';

    overlay.appendChild(badge);
    div.appendChild(img);
    div.appendChild(overlay);

    // Click to open lightbox
    div.addEventListener('click', () => openLightbox(data.url));

    return div;
}

// --- Filters ---

function setupFilters() {
    dom.filters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.filter;
            if (mode === state.currentMode) return;

            // Update UI
            dom.filters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Apply filter
            applyFilter(mode);
        });
    });
}

function applyFilter(mode) {
    state.currentMode = mode;
    state.loadedCount = 0;
    state.hasMore = true;
    dom.endMessage.style.display = 'none';

    // Reinitialize columns
    initColumns();

    // Filter data
    if (mode === 'all') {
        state.visibleImages = [...state.images];
        // We might want to re-shuffle "all" or keep original shuffle order
        // Let's keep original random order for consistency
    } else {
        state.visibleImages = state.images.filter(img => img.type === mode);
    }

    // Trigger load
    loadMoreImages();
}

// --- Lightbox ---

function setupLightbox() {
    dom.lightboxClose.addEventListener('click', closeLightbox);

    // Close on background click
    dom.lightbox.addEventListener('click', (e) => {
        if (e.target === dom.lightbox) closeLightbox();
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dom.lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}

function openLightbox(url) {
    dom.lightboxImg.src = url;
    dom.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeLightbox() {
    dom.lightbox.classList.remove('active');
    setTimeout(() => {
        dom.lightboxImg.src = '';
    }, 300); // Clear after transition
    document.body.style.overflow = '';
}

// --- Masonry Layout --- 

function initColumns() {
    // Clear existing columns
    state.columns = [];
    state.columnHeights = [];
    dom.grid.innerHTML = '';

    // Determine number of columns based on screen width
    const columnCount = getColumnCount();

    // Create columns
    for (let i = 0; i < columnCount; i++) {
        const column = document.createElement('div');
        column.className = 'gallery-column';
        dom.grid.appendChild(column);
        state.columns.push(column);
        state.columnHeights.push(0);
    }
}

function getColumnCount() {
    const width = window.innerWidth;
    if (width >= 1600) return 5;
    if (width >= 1200) return 4;
    if (width >= 800) return 3;
    if (width >= 500) return 2;
    return 1;
}

function handleResize() {
    // Only reinitialize if column count changes
    const currentColumnCount = state.columns.length;
    const newColumnCount = getColumnCount();

    if (currentColumnCount !== newColumnCount) {
        // Save current images
        const currentImages = state.visibleImages;
        const currentMode = state.currentMode;

        // Reinitialize
        initColumns();
        state.visibleImages = currentImages;
        state.currentMode = currentMode;
        state.loadedCount = 0;
        state.hasMore = true;

        // Reload images
        loadMoreImages();
    }
}

function getShortestColumnIndex() {
    return state.columnHeights.indexOf(Math.min(...state.columnHeights));
}

// --- Infinite Scroll ---
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && state.hasMore && !state.isLoading) {
            loadMoreImages();
        }
    }, {
        rootMargin: '600px 0px' // 增加预加载距离，提升用户体验
    });

    observer.observe(dom.loader); // Observe the loader element at bottom
}

// Run
document.addEventListener('DOMContentLoaded', function() {
    init();
});

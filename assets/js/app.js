
// Configuration
const CONFIG = {
    totalHorizontal: 882,
    totalVertical: 3289,
    batchSize: 30,
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
    hasMore: true
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
    generateImageList();
    shuffleImages(state.images);
    state.visibleImages = [...state.images]; // Start with all

    // Setup event listeners
    setupFilters();
    setupLightbox();
    setupInfiniteScroll();

    // Initial load
    loadMoreImages();

    // Scroll-aware Navbar
    setupScrollNavbar();
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

    state.isLoading = true;
    dom.loader.classList.add('active');

    const nextBatch = state.visibleImages.slice(state.loadedCount, state.loadedCount + CONFIG.batchSize);

    if (nextBatch.length === 0) {
        state.hasMore = false;
        state.isLoading = false;
        dom.loader.classList.remove('active');
        dom.endMessage.style.display = 'block';
        return;
    }

    // Create a fragment for performance
    const fragment = document.createDocumentFragment();

    nextBatch.forEach(imgData => {
        const item = createGalleryItem(imgData);
        fragment.appendChild(item);
    });

    dom.grid.appendChild(fragment);

    state.loadedCount += nextBatch.length;
    state.isLoading = false;
    dom.loader.classList.remove('active');

    // Check if we already exhausted the list
    if (state.loadedCount >= state.visibleImages.length) {
        state.hasMore = false;
        dom.endMessage.style.display = 'block';
    }
}

function createGalleryItem(data) {
    const div = document.createElement('div');
    div.className = 'gallery-item';

    // Pre-calculate aspect ratio class? 
    // Since we don't know the exact dimensions of every image without loading, 
    // masonry handles the height naturally.

    const img = document.createElement('img');
    img.loading = 'lazy'; // Native lazy loading
    img.src = data.url;
    img.alt = `Gallery Image ${data.type.toUpperCase()} ${data.id}`;

    img.onload = () => {
        div.classList.add('loaded');
    };

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

    // Clear grid
    dom.grid.innerHTML = '';

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

// --- Infinite Scroll ---
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && state.hasMore && !state.isLoading) {
            loadMoreImages();
        }
    }, {
        rootMargin: '200px' // Load before reaching bottom
    });

    observer.observe(dom.loader); // Observe the loader element at bottom
}

// Run
document.addEventListener('DOMContentLoaded', init);


async function loadHTML(containerId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`HTTP помилка: ${response.status}`);
        const html = await response.text();
        document.getElementById(containerId).innerHTML = html;
    } catch (error) {
        console.error(`Не вдалося завантажити ${filePath}:`, error);
    }
}

export async function loadAllComponents() {
    
    await Promise.all([
        loadHTML('c-modals', './components/modals.html'),
        loadHTML('c-dashboard', './components/dashboard.html'),
        loadHTML('c-news', './components/news.html'),
        loadHTML('c-map', './components/map.html'),
        loadHTML('c-list', './components/list.html')
    ]);
}
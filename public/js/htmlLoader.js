export async function loadComponents() {
    // Список HTML-модулів
    const components = [
        'components/modals.html',
        'components/dashboard.html',
        'components/news.html',
        'components/map.html',
        'components/list.html'
    ];

    let combinedHTML = '';
    
    // Завантажуємо кожен файл
    for (const url of components) {
        const response = await fetch(url);
        combinedHTML += await response.text();
    }
    
    // Вставляємо все в головний контейнер
    document.getElementById('app-root').innerHTML = combinedHTML;
}
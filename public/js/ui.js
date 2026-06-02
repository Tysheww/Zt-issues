import { state } from './state.js';
import { loadIssuesForList } from './issues.js';
import { initWelcomeChart } from './dashboard.js';

export function showScreen(screenName, addToHistory = true) {
    const screens = ['start-container', 'map', 'list-view', 'news-view', 'all-news-view'];

    screens.forEach(s => {
        const el = document.getElementById(s);

        if (el) {
            el.style.display = 'none';
        }
    });

    const mapBackBtn = document.getElementById('map-back-btn');
    const locateBtn = document.getElementById('locate-btn');

    if (mapBackBtn) mapBackBtn.style.display = 'none';
    if (locateBtn) locateBtn.style.display = 'none';

    if (screenName === 'menu') {
        const startContainer = document.getElementById('start-container');

        if (startContainer) {
            startContainer.style.display = 'flex';
        }

        initWelcomeChart();
    }

    if (screenName === 'map') {
        const mapEl = document.getElementById('map');

        if (mapEl) {
            mapEl.style.display = 'block';
        }

        if (mapBackBtn) mapBackBtn.style.display = 'block';
        if (locateBtn) locateBtn.style.display = 'block';

        setTimeout(() => {
            if (state.map) {
                state.map.invalidateSize();
            }
        }, 300);
    }

    if (screenName === 'list') {
        const listView = document.getElementById('list-view');

        if (listView) {
            listView.style.display = 'block';
        }
    }

    if (screenName === 'news') {
        const newsView = document.getElementById('news-view');

        if (newsView) {
            newsView.style.display = 'block';
        }
    }

    if (screenName === 'all-news') {
        const allNewsView = document.getElementById('all-news-view');

        if (allNewsView) {
            allNewsView.style.display = 'block';
        }
    }

    if (addToHistory) {
        window.history.pushState(
            {
                screen: screenName,
                isCabinet: state.isCabinetMode
            },
            '',
            '#' + screenName
        );
    }
}

window.openNews = function(title, date, content) {
    document.getElementById('news-detail-title').textContent = title;
    document.getElementById('news-detail-date').textContent = date;
    document.getElementById('news-detail-content').textContent = content;
    showScreen('news');
};

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.screen) {
        state.isCabinetMode = e.state.isCabinet || false;
        showScreen(e.state.screen, false);

        if (e.state.screen === 'list') {
            loadIssuesForList();
        }
    } else {
        showScreen('menu', false);
    }
});

import { EMAILJS_KEY } from './config.js';
import { state } from './state.js';
import { initAuth, setupAuthUI } from './auth.js';
import { showScreen } from './ui.js';
import { loadIssuesForList } from './issues.js';
import { updateMapData } from './map.js';
import { showToast } from './utils.js';
import { loadAllComponents } from './loader.js';

window.showScreen = showScreen;

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllComponents();

    if (typeof window.emailjs !== 'undefined') {
        window.emailjs.init({ publicKey: EMAILJS_KEY });
    }

    window.history.replaceState({ screen: 'menu', isCabinet: false }, '', '#menu');

    initAuth();
    setupAuthUI();

    const filterSelect = document.getElementById('filter-category');
    const searchInput = document.getElementById('search-input');
    const locateBtn = document.getElementById('locate-btn');
    const allNewsLink = document.getElementById('all-news-link');
    const cabinetFilter = document.getElementById('cabinet-filter');

    document.getElementById('map-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('map');
        updateMapData();
    });

    document.getElementById('list-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        state.isCabinetMode = false;
        showScreen('list');
        await loadIssuesForList();
    });

    document.getElementById('user-cabinet-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        state.isCabinetMode = true;
        state.cabinetFilter = "my";

        if (cabinetFilter) {
            cabinetFilter.value = "my";
        }

        showScreen('list');
        await loadIssuesForList();
    });

    allNewsLink?.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('all-news');
    });

    filterSelect?.addEventListener('change', () => {
        loadIssuesForList();
    });

    searchInput?.addEventListener('input', () => {
        loadIssuesForList();
    });

    cabinetFilter?.addEventListener('change', async () => {
        state.cabinetFilter = cabinetFilter.value;
        await loadIssuesForList();
    });

    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                return showToast("Ваш оглядач не підтримує геолокацію.", true);
            }

            locateBtn.innerHTML = "Визначення координат...";

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    locateBtn.innerHTML = "Знайти мою локацію";

                    if (state.map) {
                        state.map.flyTo([lat, lng], 17, {
                            animate: true,
                            duration: 1.5
                        });

                        if (state.userLocationMarker) {
                            state.map.removeLayer(state.userLocationMarker);
                        }

                        state.userLocationMarker = L.circleMarker([lat, lng], {
                            radius: 8,
                            fillColor: "#0A3663",
                            color: "#DDA22A",
                            weight: 3,
                            opacity: 1,
                            fillOpacity: 0.9
                        })
                            .addTo(state.map)
                            .bindPopup("<b>Поточна позиція</b>")
                            .openPopup();
                    }
                },
                () => {
                    locateBtn.innerHTML = "Знайти мою локацію";
                    showToast("Помилка визначення координат. Перевірте дозволи браузера.", true);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000
                }
            );
        });
    }
});

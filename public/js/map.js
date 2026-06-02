import { state } from './state.js';
import { escapeHTML, getStatusLabel, normalizeCategory } from './utils.js';
import { fetchIssues } from './issues.js';
import { showScreen } from './ui.js';

function createStatusIcon(status) {
    let className = 'municipal-marker marker-new';

    if (status === 'process') {
        className = 'municipal-marker marker-process';
    }

    if (status === 'done') {
        className = 'municipal-marker marker-done';
    }

    return L.divIcon({
        className,
        html: '<span></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -12]
    });
}

export async function updateMapData() {
    if (!state.map) {
        initMapBase();
    }

    setTimeout(() => {
        if (state.map) {
            state.map.invalidateSize();
        }
    }, 200);

    if (state.markersLayer) {
        state.markersLayer.clearLayers();
    }

    const issues = await fetchIssues();

    issues.forEach(issue => addMarkerToMap(issue));
}

export function initMapBase() {
    const mapElement = document.getElementById('map');

    if (!mapElement) return;

    if (state.map) {
        return;
    }

    state.map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView([50.2547, 28.6587], 13);

   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(state.map);

    state.markersLayer = L.layerGroup().addTo(state.map);

    state.map.on('click', function(e) {
        if (!state.currentUser) {
            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <div class="map-access-denied">
                        <b>Доступ обмежено</b>
                        <span>Щоб створити звернення, увійдіть до системи.</span>
                    </div>
                `)
                .openOn(state.map);

            return;
        }

        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);

        const popupDiv = document.createElement('div');
        popupDiv.className = 'popup-form';

        popupDiv.innerHTML = `
            <h3>Нове звернення</h3>

            <label>Категорія</label>
            <select id="cat">
                <option value="Пошкодження від прильотів">Пошкодження від прильотів</option>
                <option value="Дороги / Ями">Дороги / Ями</option>
                <option value="Освітлення">Освітлення</option>
                <option value="Сміття">Сміття</option>
                <option value="Водоканал">Водоканал</option>
                <option value="Інше">Інше</option>
            </select>

            <label>Опис проблеми</label>
            <textarea id="desc" rows="3" placeholder="Коротко опишіть проблему"></textarea>

            <label>Фото - до 5 МБ</label>
            <input type="file" id="photo" accept="image/jpeg, image/png, image/webp">
        `;

        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Надіслати звернення';
        submitBtn.addEventListener('click', () => window.saveIssue(lat, lng));

        popupDiv.appendChild(submitBtn);

        L.popup({
            maxWidth: 320,
            minWidth: 260
        })
            .setLatLng(e.latlng)
            .setContent(popupDiv)
            .openOn(state.map);
    });
}

export function addMarkerToMap(issue) {
    if (!issue.lat || !issue.lng) return;

    const safeCategory = escapeHTML(normalizeCategory(issue.category));
    const safeDesc = escapeHTML(issue.description || "Опис відсутній");
    const safeAuthor = escapeHTML(issue.author || "Невідомо");
    const safeAddress = escapeHTML(issue.address || "");

    const addressText = safeAddress
        ? `<small class="popup-address">Адреса: ${safeAddress}</small>`
        : '';

    const canViewPhoto = state.isAdmin;
    let photoHtml = '';

    if (issue.photoUrl && canViewPhoto && issue.photoUrl.startsWith('https://')) {
        const safePhotoUrl = escapeHTML(issue.photoUrl);

        photoHtml = `
            <a href="${safePhotoUrl}" target="_blank">
                <img src="${safePhotoUrl}" class="popup-photo" alt="Фото звернення">
            </a>
        `;
    }

    const upvotesCount = issue.upvotes ? issue.upvotes.length : 0;

    const marker = L.marker([issue.lat, issue.lng], {
        icon: createStatusIcon(issue.status)
    });

    marker.bindPopup(`
        <div class="issue-popup">
            <b>${safeCategory}</b>
            <div class="popup-status">${getStatusLabel(issue.status)}</div>
            <div class="popup-watch">Відстежують: ${upvotesCount}</div>
            <p>${safeDesc}</p>
            ${photoHtml}
            ${addressText}
            <hr>
            <small>Заявник: ${safeAuthor}</small>
        </div>
    `);

    if (state.markersLayer) {
        state.markersLayer.addLayer(marker);
    }
}

window.showOnMap = async function(lat, lng, category, desc) {
    showScreen('map');

    await updateMapData();

    setTimeout(() => {
        if (state.map) {
            const safeCategory = escapeHTML(normalizeCategory(category));
            const safeDesc = escapeHTML(desc);

            state.map.invalidateSize();

            state.map.flyTo([lat, lng], 17, {
                animate: true,
                duration: 1.5
            });

            L.popup()
                .setLatLng([lat, lng])
                .setContent(`
                    <div class="issue-popup">
                        <b>${safeCategory}</b>
                        <p>${safeDesc}</p>
                    </div>
                `)
                .openOn(state.map);
        }
    }, 250);
};

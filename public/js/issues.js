import { db } from './firebase.js';
import { state } from './state.js';
import {
    escapeHTML,
    showToast,
    showConfirm,
    getStatusLabel,
    normalizeCategory,
    normalizeIssue,
    formatDate,
    formatDateTime
} from './utils.js';
import { CLOUD_NAME, UPLOAD_PRESET, WEBHOOK_URL } from './config.js';
import { addMarkerToMap, updateMapData } from './map.js';
import { updateDashboard } from './dashboard.js';

export async function fetchIssues() {
    try {
        const snapshot = await db.collection('issues').get();
        const issues = [];

        snapshot.forEach(doc => {
            issues.push(normalizeIssue({ id: doc.id, ...doc.data() }));
        });

        return issues;
    } catch (error) {
        console.error("Помилка:", error);
        return [];
    }
}

export async function loadIssuesForList() {
    const issuesListUl = document.getElementById('issues-list');
    if (!issuesListUl) return;

    issuesListUl.innerHTML = '<p class="loading-message">Завантаження даних...</p>';

    const listTitle = document.getElementById('list-title');
    const listSubtitle = document.getElementById('list-subtitle');
    const cabinetFilter = document.getElementById('cabinet-filter');

    if (cabinetFilter) {
        cabinetFilter.style.display = state.isCabinetMode ? 'inline-block' : 'none';
        state.cabinetFilter = cabinetFilter.value || "my";
    }

    if (listTitle) {
        if (state.isCabinetMode) {
            listTitle.textContent = state.cabinetFilter === "followed"
                ? "Особистий кабінет: Відстежувані проблеми"
                : "Особистий кабінет: Мої звернення";
        } else {
            listTitle.textContent = "Єдиний реєстр звернень";
        }
    }

    if (listSubtitle) {
        if (state.isCabinetMode && state.cabinetFilter === "followed") {
            listSubtitle.textContent = "Проблеми, які ви підтримали та відстежуєте";
        } else if (state.isCabinetMode) {
            listSubtitle.textContent = "Ваші особисті звернення до контактного центру";
        } else {
            listSubtitle.textContent = "Відкритий перелік інфраструктурних проблем міста";
        }
    }

    let issues = await fetchIssues();

    if (state.isCabinetMode && state.currentUser) {
        if (state.cabinetFilter === "followed") {
            issues = issues.filter(issue => issue.upvotes.includes(state.currentUser.email));
        } else {
            issues = issues.filter(issue => issue.author === state.currentUser.email);
        }
    }

    updateDashboard(issues);

    const filterVal = document.getElementById('filter-category')?.value || "all";

    if (filterVal !== 'all') {
        issues = issues.filter(issue => normalizeCategory(issue.category) === filterVal);
    }

    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || "";

    if (searchVal) {
        issues = issues.filter(issue =>
            (issue.description && issue.description.toLowerCase().includes(searchVal)) ||
            (issue.address && issue.address.toLowerCase().includes(searchVal)) ||
            (normalizeCategory(issue.category).toLowerCase().includes(searchVal))
        );
    }

    issuesListUl.innerHTML = '';

    if (issues.length === 0) {
        const emptyText = state.isCabinetMode && state.cabinetFilter === "followed"
            ? "Ви ще не підтримали жодної проблеми."
            : "Записів не знайдено.";

        issuesListUl.innerHTML = `<p class="empty-message">${emptyText}</p>`;
        return;
    }

    issues.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    issues.forEach(issue => {
        issuesListUl.appendChild(createIssueListItem(issue));
    });
}

function createIssueListItem(issue) {
    const li = document.createElement('li');
    li.className = 'issue-item';

    const safeCategory = escapeHTML(normalizeCategory(issue.category));
    const safeDesc = escapeHTML(issue.description || "Опис відсутній");
    const safeAuthor = escapeHTML(issue.author || "Невідомо");
    const safeAddressText = escapeHTML(issue.address || "");
    const dateStr = formatDate(issue.timestamp);

    const isAuthor = state.currentUser && state.currentUser.email === issue.author;
    const canViewPhoto = state.isAdmin || (isAuthor && state.isCabinetMode);
    const upvotes = issue.upvotes || [];
    const hasUpvoted = state.currentUser && upvotes.includes(state.currentUser.email);

    const addressHtml = safeAddressText
        ? `<div class="issue-address">Адреса: ${safeAddressText}</div>`
        : '';

    let photoLink = '';

    if (issue.photoUrl && canViewPhoto && issue.photoUrl.startsWith('https://')) {
        photoLink = `
            <div class="photo-link">
                <a href="${escapeHTML(issue.photoUrl)}" target="_blank">Переглянути прикріплене фото</a>
            </div>
        `;
    }

    const comments = issue.comments || [];

    const commentsHtml = comments.map(c => `
        <div class="comment-item">
            <b>${escapeHTML(c.author)}:</b> ${escapeHTML(c.text)}
            <div class="comment-date">${formatDateTime(c.date)}</div>
        </div>
    `).join('');

    const commentInputHtml = state.currentUser ? `
        <div class="comment-form">
            <input id="comment-input-${issue.id}" placeholder="Додати коментар...">
            <button onclick="addComment('${issue.id}')">Надіслати</button>
        </div>
    ` : '<p class="comment-login-note">Авторизуйтесь, щоб залишити коментар</p>';

    li.innerHTML = `
        <div class="issue-top">
            <div>
                <strong>${safeCategory}</strong>
                <div class="issue-status-row">
                    ${getStatusLabel(issue.status)}
                    <span class="watch-count">Відстежують: ${upvotes.length}</span>
                </div>
            </div>

            <button class="btn-map-show" onclick="showOnMap(${issue.lat}, ${issue.lng}, '${safeCategory.replace(/'/g, "\\'")}', '${safeDesc.replace(/'/g, "\\'")}')">
                Показати на мапі
            </button>
        </div>

        <p class="issue-desc">${safeDesc}</p>

        <button onclick="toggleUpvote('${issue.id}')" class="upvote-btn ${hasUpvoted ? 'active' : ''}">
            ${hasUpvoted ? 'Відстежується' : 'Підтримати і відстежувати'} (${upvotes.length})
        </button>

        ${photoLink}
        ${addressHtml}

        <div class="comments-box">
            <h4>Обговорення (${comments.length})</h4>
            ${commentsHtml}
            ${commentInputHtml}
        </div>

        <div class="issue-meta">
            <span>Заявник: ${safeAuthor}</span>
            <span>Дата: ${dateStr}</span>
        </div>
    `;

    if (state.isAdmin) {
        const adminDiv = document.createElement('div');
        adminDiv.className = 'admin-controls';

        adminDiv.innerHTML = `
            <button class="btn-admin btn-process" onclick="changeStatus('${issue.id}', 'process')">Прийняти в роботу</button>
            <button class="btn-admin btn-done" onclick="changeStatus('${issue.id}', 'done')">Позначити виконаним</button>
            <button class="btn-admin btn-delete" onclick="deleteIssue('${issue.id}')">Анулювати заявку</button>
        `;

        li.appendChild(adminDiv);
    }

    return li;
}

window.saveIssue = async function(lat, lng) {
    if (!state.currentUser) {
        return showToast("Будь ласка, авторизуйтесь для створення звернення.", true);
    }

    const author = state.currentUser.email;
    const rawCategory = document.getElementById('cat').value.trim();
    const category = normalizeCategory(rawCategory);
    const description = document.getElementById('desc').value.trim();
    const photoFile = document.getElementById('photo') ? document.getElementById('photo').files[0] : null;

    if (!description || description.length < 10) {
        return showToast("Опис проблеми має містити мінімум 10 символів.", true);
    }

    if (description.length > 1000) {
        return showToast("Опис надто довгий - максимум 1000 символів.", true);
    }

    if (photoFile) {
        if (!photoFile.type.startsWith('image/')) {
            return showToast("Дозволено завантажувати лише зображення.", true);
        }

        if (photoFile.size > 5 * 1024 * 1024) {
            return showToast("Розмір фотографії не повинен перевищувати 5 МБ.", true);
        }
    }

    try {
        const submitBtn = document.querySelector('.popup-form button');

        if (submitBtn) {
            submitBtn.textContent = "Обробка запиту...";
            submitBtn.disabled = true;
        }

        let photoUrl = "";

        if (photoFile) {
            const formData = new FormData();
            formData.append("file", photoFile);
            formData.append("upload_preset", UPLOAD_PRESET);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            photoUrl = data.secure_url || "";
        }

        let address = "Координати встановлено";

        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uk`);
            const geoData = await geoRes.json();

            if (geoData && geoData.display_name) {
                address = geoData.display_name;
            }
        } catch (e) {}

        const newIssueData = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            address,
            category,
            description,
            author,
            status: 'new',
            timestamp: Date.now(),
            photoUrl,
            upvotes: [],
            comments: []
        };

        const docRef = await db.collection('issues').add(newIssueData);
        const newIssue = normalizeIssue({ id: docRef.id, ...newIssueData });

        addMarkerToMap(newIssue);

        if (state.map) {
            state.map.closePopup();
        }

        if (category === "Пошкодження від прильотів" && window.emailjs) {
            window.emailjs.send('service_xxl44tf', 'template_hiv7ip7', { ...newIssueData, lat, lng }).catch(console.error);
        }

        // === ОНОВЛЕНИЙ НАДІЙНИЙ БЛОК ВІДПРАВКИ В GOOGLE SHEETS ===
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzseTEKnQe2YMPSMqsmyUtQPI9UAkIt7xFrl4oL0Zw3R_MLZ2zEh4rwdppthnv5YTSV/exec"; 
        
        const sheetData = { 
            ...newIssueData, 
            lat: lat,
            lng: lng,
            date: new Date().toLocaleString("uk-UA") 
        };

        fetch(WEBHOOK_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(sheetData)
        }).then(() => {
            console.log("Дані успішно відправлено в Google Sheets");
        }).catch(error => {
            console.error("Помилка відправки в таблицю:", error);
        });
        // =========================================================

        showToast("Звернення успішно зареєстровано в системі!");
    } catch (error) {
        console.error(error);
        showToast("Виникла помилка під час збереження даних.", true);
    }
};

window.changeStatus = async function(id, newStatus) {
    if (!state.isAdmin) return;

    try {
        await db.collection('issues').doc(id).update({ status: newStatus });

        await loadIssuesForList();

        if (state.map) {
            await updateMapData();
        }

        showToast("Статус успішно оновлено");
    } catch (e) {
        showToast("Помилка доступу", true);
    }
};

window.deleteIssue = async function(id) {
    if (!state.isAdmin) return;

    showConfirm("Видалення", "Підтвердіть анулювання запису з бази даних.", async () => {
        try {
            await db.collection('issues').doc(id).delete();

            await loadIssuesForList();

            if (state.map) {
                await updateMapData();
            }

            showToast("Запис видалено");
        } catch (error) {
            showToast("Помилка видалення", true);
        }
    });
};

window.toggleUpvote = async function(id) {
    if (!state.currentUser) {
        return showToast("Будь ласка, авторизуйтесь для підтримки заявки.", true);
    }

    const email = state.currentUser.email;
    const ref = db.collection('issues').doc(id);

    try {
        const doc = await ref.get();

        if (!doc.exists) {
            return showToast("Звернення не знайдено.", true);
        }

        const issue = normalizeIssue(doc.data());
        const alreadyWatching = issue.upvotes.includes(email);

        if (alreadyWatching) {
            await ref.update({
                upvotes: window.firebase.firestore.FieldValue.arrayRemove(email)
            });

            showToast("Проблему прибрано з відстежуваних.");
        } else {
            await ref.update({
                upvotes: window.firebase.firestore.FieldValue.arrayUnion(email)
            });

            showToast("Проблему додано до відстежуваних.");
        }

        await loadIssuesForList();

        if (state.map) {
            await updateMapData();
        }
    } catch (e) {
        console.error(e);
        showToast("Помилка оновлення", true);
    }
};

window.addComment = async function(id) {
    if (!state.currentUser) {
        return showToast("Будь ласка, авторизуйтесь.", true);
    }

    const input = document.getElementById(`comment-input-${id}`);
    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    if (text.length > 500) {
        return showToast("Коментар надто довгий - максимум 500 символів.", true);
    }

    const newComment = {
        author: state.currentUser.email,
        text,
        date: Date.now()
    };

    try {
        await db.collection('issues').doc(id).update({
            comments: window.firebase.firestore.FieldValue.arrayUnion(newComment)
        });

        input.value = "";
        await loadIssuesForList();

        showToast("Коментар успішно додано");
    } catch (e) {
        showToast("Помилка додавання", true);
    }
};

// --- КОНФІГУРАЦІЯ FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC7c5rB7UvZSBlWzmnzXg8-J-mGNO9nQDc",
    authDomain: "zhytomyr-issues.firebaseapp.com",
    projectId: "zhytomyr-issues",
    storageBucket: "zhytomyr-issues.firebasestorage.app",
    messagingSenderId: "767660965523",
    appId: "1:767660965523:web:3d79e57b630b2786155766"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    console.log("Скрипт ініціалізовано, DOM готовий!");
    
    // Елементи інтерфейсу
    const container = document.getElementById('start-container');
    const mapDiv = document.getElementById('map');
    const mapLink = document.getElementById('map-link');
    const mapBackBtn = document.getElementById('map-back-btn');
    const listView = document.getElementById('list-view');
    const listLink = document.getElementById('list-link');
    const listBackBtn = document.getElementById('list-back-btn');
    const issuesListUl = document.getElementById('issues-list');
    const sortSelect = document.getElementById('sort-select');
    
    // Елементи авторизації (оновлені)
    const ADMIN_EMAIL = "admin@example.com"; // ЗАМІНІТЬ НА ВАШ EMAIL АДМІНА
    let currentUser = null; 
    let isAdmin = false;

    const userAuthBtn = document.getElementById('user-auth-btn');
    const userLogoutBtn = document.getElementById('user-logout-btn');
    const loginModal = document.getElementById('login-modal');
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-pass');
    const authError = document.getElementById('auth-error');
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    const btnRegisterSubmit = document.getElementById('btn-register-submit');
    const btnAuthCancel = document.getElementById('btn-auth-cancel');

    const API_URL = '/issues';

    // ЗМІННІ КАРТИ
    let map = null;           
    let markersLayer = null;  

    // --- 1. ІКОНКИ КАРТИ ---
    const iconBase = {
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    };

    const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', ...iconBase });
    const orangeIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png', ...iconBase });
    const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', ...iconBase });

    // --- 2. ЛОГІКА АВТОРИЗАЦІЇ (FIREBASE AUTH) ---
    
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            isAdmin = (user.email === ADMIN_EMAIL);
            if(userAuthBtn) userAuthBtn.style.display = 'none';
            if(userLogoutBtn) {
                userLogoutBtn.style.display = 'inline-block';
                userLogoutBtn.innerHTML = `🚪 Вийти <br><small style="font-size:10px;">(${user.email})</small>`;
            }
        } else {
            isAdmin = false;
            if(userAuthBtn) userAuthBtn.style.display = 'inline-block';
            if(userLogoutBtn) userLogoutBtn.style.display = 'none';
        }
        
        if (listView && listView.style.display === 'block') loadIssuesForList();
    });

    if (userAuthBtn) {
        userAuthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'flex';
        });
    }

    if (btnAuthCancel) {
        btnAuthCancel.addEventListener('click', closeModalAndClear);
    }

    if (btnLoginSubmit) {
        btnLoginSubmit.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passInput.value.trim();
            if (!email || !password) return showError("Введіть email та пароль!");

            try {
                await auth.signInWithEmailAndPassword(email, password);
                closeModalAndClear();
                alert("Успішний вхід!");
            } catch (error) { showError("Помилка входу: " + error.message); }
        });
    }

    if (btnRegisterSubmit) {
        btnRegisterSubmit.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passInput.value.trim();
            if (!email || !password) return showError("Введіть email та пароль!");
            if (password.length < 6) return showError("Пароль має бути мінімум 6 символів!");

            try {
                await auth.createUserWithEmailAndPassword(email, password);
                closeModalAndClear();
                alert("Акаунт успішно створено! Ви увійшли в систему.");
            } catch (error) { showError("Помилка реєстрації: " + error.message); }
        });
    }

    if (userLogoutBtn) {
        userLogoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            alert("Ви вийшли з облікового запису.");
        });
    }

    function showError(msg) {
        authError.textContent = msg;
        authError.style.display = 'block';
    }

    function closeModalAndClear() {
        loginModal.style.display = 'none';
        authError.style.display = 'none';
        emailInput.value = ''; passInput.value = '';
    }

    // --- 3. ЗАВАНТАЖЕННЯ ДАНИХ З СЕРВЕРА ---
    async function fetchIssues() {
        try {
            const response = await fetch(API_URL);
            return await response.json();
        } catch (error) { 
            console.error("Помилка завантаження даних:", error);
            return []; 
        }
    }

    // --- 4. ГРАФІК НА ВІТАЛЬНОМУ ЕКРАНІ ---
    async function initWelcomeChart() {
        const ctx = document.getElementById('welcomeChart');
        const chartContainer = document.querySelector('.chart-container');
        if (!ctx) return;

        const issues = await fetchIssues();
        if (issues.length === 0) return; 

        const categoryCounts = { "Дороги / Ями": 0, "Освітлення": 0, "Сміття": 0, "Водоканал": 0, "Інше": 0 };

        issues.forEach(issue => {
            const cat = issue.category;
            if (categoryCounts[cat] !== undefined) categoryCounts[cat]++;
            else categoryCounts["Інше"]++;
        });

        const labels = Object.keys(categoryCounts).filter(key => categoryCounts[key] > 0);
        const data = labels.map(key => categoryCounts[key]);

        if(chartContainer) chartContainer.style.display = 'block';

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#e74c3c', '#f1c40f', '#8e44ad', '#3498db', '#95a5a6'],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11, family: "'Segoe UI', sans-serif" } } },
                    tooltip: { callbacks: { label: function(context) { return ` ${context.label}: ${context.raw} заяв.`; } } }
                },
                cutout: '65%'
            }
        });
    }

    initWelcomeChart(); 

    // --- 5. ФУНКЦІЯ ОНОВЛЕННЯ СТАТИСТИКИ (DASHBOARD) ---
    function updateDashboard(issues) {
        const total = issues.length;
        const newCount = issues.filter(i => i.status === 'new' || !i.status).length;
        const resolvedCount = issues.filter(i => i.status === 'done').length;

        const totalEl = document.getElementById('total-count');
        const newEl = document.getElementById('new-count');
        const resolvedEl = document.getElementById('resolved-count');

        if (totalEl) totalEl.innerText = total;
        if (newEl) newEl.innerText = newCount;
        if (resolvedEl) resolvedEl.innerText = resolvedCount;
    }

    // --- 6. ПЕРЕМИКАННЯ ЕКРАНІВ ---
    if (mapLink) mapLink.addEventListener('click', (e) => { e.preventDefault(); showScreen('map'); updateMapData(); });
    if (listLink) listLink.addEventListener('click', async (e) => { e.preventDefault(); showScreen('list'); await loadIssuesForList(); });
    if (mapBackBtn) mapBackBtn.addEventListener('click', () => showScreen('menu'));
    if (listBackBtn) listBackBtn.addEventListener('click', () => showScreen('menu'));
    if (sortSelect) sortSelect.addEventListener('change', () => loadIssuesForList());

    function showScreen(screenName) {
        if (container) container.style.display = 'none';
        if (mapDiv) mapDiv.style.display = 'none';
        if (mapBackBtn) mapBackBtn.style.display = 'none';
        if (listView) listView.style.display = 'none';
        
        if (screenName === 'menu') {
            if (container) container.style.display = 'flex'; 
        } else if (screenName === 'map') {
            if (mapDiv) mapDiv.style.display = 'block';
            if (mapBackBtn) mapBackBtn.style.display = 'block';
            if (map) setTimeout(() => { map.invalidateSize(); }, 100);
        } else if (screenName === 'list') {
            if (listView) listView.style.display = 'block';
        }
    }

    // --- 7. КАРТА ТА МАРКЕРИ ---
    async function updateMapData() {
        if (!map) initMapBase(); 
        if (markersLayer) markersLayer.clearLayers();

        const issues = await fetchIssues();
        updateDashboard(issues);
        issues.forEach(issue => addMarkerToMap(issue));
    }

    function initMapBase() {
        map = L.map('map').setView([50.2547, 28.6587], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);

        map.on('click', function(e) {
            // ПЕРЕВІРКА АВТОРИЗАЦІЇ ДЛЯ ДОДАВАННЯ МІТКИ
            if (!currentUser) {
                L.popup()
                    .setLatLng(e.latlng)
                    .setContent(`
                        <div style="text-align:center; padding:10px;">
                            <b style="color:#e74c3c;">Увага!</b><br>
                            Тільки авторизовані користувачі можуть додавати проблеми.<br>
                            <small>Будь ласка, поверніться в меню та увійдіть.</small>
                        </div>
                    `)
                    .openOn(map);
                return;
            }

            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            
            const popupDiv = document.createElement('div');
            popupDiv.className = 'popup-form';
            
            popupDiv.innerHTML = `
                <h3>Нова проблема</h3>
                <label>Ваш Email:</label>
                <input type="text" id="author" value="${currentUser.email}" disabled style="background:#eee; color:#666;">
                
                <label>Категорія:</label>
                <input list="category-options" id="cat" placeholder="Оберіть...">
                <datalist id="category-options">
                    <option value="Дороги / Ями">
                    <option value="Освітлення">
                    <option value="Сміття">
                    <option value="Водоканал">
                </datalist>
                
                <label>Опис: <span style="color:red">*</span></label>
                <textarea id="desc" rows="3"></textarea>
            `;
            
            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'Надіслати заявку';
            submitBtn.addEventListener('click', () => saveIssue(lat, lng));
            
            popupDiv.appendChild(submitBtn);
            L.popup().setLatLng(e.latlng).setContent(popupDiv).openOn(map);
        });
    }

    window.saveIssue = async function(lat, lng) {
        const author = document.getElementById('author').value.trim();
        const category = document.getElementById('cat').value.trim() || "Інше";
        const description = document.getElementById('desc').value.trim();

        if (!description) { alert("Будь ласка, заповніть опис проблеми!"); return; }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng, category, description, author }) 
            });
            
            if (response.ok) {
                const newIssue = await response.json();
                addMarkerToMap(newIssue);
                map.closePopup();
            } else { alert("Помилка сервера"); }
        } catch (error) { console.error(error); alert("Помилка з'єднання."); }
    };

    function getStatusLabel(status) {
        if (status === 'process') return '<span class="badge process"> Розглядається</span>';
        if (status === 'done') return '<span class="badge done"> Виконано</span>';
        return '<span class="badge new"> Нова</span>';
    }

    function addMarkerToMap(issue) {
        const authorName = issue.author ? issue.author : "Анонім";
        const statusLabel = getStatusLabel(issue.status);

        let markerIcon = redIcon;
        if (issue.status === 'process') markerIcon = orangeIcon;
        else if (issue.status === 'done') markerIcon = greenIcon;

        const marker = L.marker([issue.lat, issue.lng], { icon: markerIcon });
        marker.bindPopup(`
            <b>${issue.category}</b> ${statusLabel}<br>
            ${issue.description}<br>
            <hr style="margin: 5px 0; border: 0; border-top: 1px solid #ccc;">
            <small style="color: #666;">Автор: ${authorName}</small>
        `);
        
        if (markersLayer) markersLayer.addLayer(marker);
    }

    // --- 8. ДІЇ АДМІНІСТРАТОРА ---
    window.changeStatus = async function(id, newStatus) {
        if (!isAdmin) return;
        const token = await auth.currentUser.getIdToken();

        try {
            const response = await fetch('/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus, token: token })
            });
            if (response.ok) {
                alert("Статус змінено!");
                loadIssuesForList();
                if (map) updateMapData(); 
            } else alert("Помилка (Можливо немає прав)");
        } catch (e) { alert("Помилка з'єднання"); }
    };

    window.deleteIssue = async function(id) {
        if (!isAdmin) return;
        if (!confirm("Видалити запис?")) return;

        const token = await auth.currentUser.getIdToken();

        try {
            const response = await fetch('/delete-issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, token: token })
            });

            if (response.ok) {
                loadIssuesForList(); 
                if (map) updateMapData();
            } else alert("Помилка видалення.");
        } catch (error) { alert("Помилка з'єднання."); }
    };

    // --- 9. СПИСОК ПРОБЛЕМ ---
    async function loadIssuesForList() {
        if (!issuesListUl) return;
        issuesListUl.innerHTML = '<p>Завантаження...</p>';
        
        let issues = await fetchIssues();
        updateDashboard(issues);
        
        issuesListUl.innerHTML = ''; 
        
        if (issues.length === 0) {
            issuesListUl.innerHTML = '<p>Список порожній.</p>';
            return;
        }

        const sortType = sortSelect ? sortSelect.value : 'newest';
        if (sortType === 'newest') issues.reverse();
        else if (sortType === 'category') issues.sort((a, b) => a.category.localeCompare(b.category));

        const categoryClasses = { "Дороги / Ями": "cat-roads", "Освітлення": "cat-light", "Сміття": "cat-trash", "Водоканал": "cat-water" };

        issues.forEach(issue => {
            const li = document.createElement('li');
            li.className = 'issue-item';
            
            const catClass = categoryClasses[issue.category] || "";
            if (catClass) li.classList.add(catClass);

            const statusLabel = getStatusLabel(issue.status);
            const safeDesc = issue.description.replace(/"/g, "&quot;").replace(/\n/g, " ");
            
            const topDiv = document.createElement('div');
            topDiv.style.cssText = "display: flex; justify-content: space-between; align-items: flex-start;";
            
            const infoDiv = document.createElement('div');
            infoDiv.innerHTML = `<strong>${issue.category}</strong><div style="margin-top: 2px;">${statusLabel}</div>`;
            
            const mapBtn = document.createElement('button');
            mapBtn.className = 'btn-map-show';
            mapBtn.textContent = '📍 На карті';
            mapBtn.addEventListener('click', () => showOnMap(issue.lat, issue.lng, issue.category, safeDesc));
            
            topDiv.appendChild(infoDiv);
            topDiv.appendChild(mapBtn);
            
            const descP = document.createElement('p');
            descP.style.marginTop = '8px';
            descP.textContent = issue.description;
            
            const metaDiv = document.createElement('div');
            metaDiv.style.cssText = "display: flex; justify-content: space-between; font-size: 12px; color: #999;";
            const dateStr = issue.id ? new Date(issue.id).toLocaleDateString() : '';
            metaDiv.innerHTML = `<span>Автор: ${issue.author || "Анонім"}</span><span>${dateStr}</span>`;
            
            li.appendChild(topDiv);
            li.appendChild(descP);
            li.appendChild(metaDiv);

            if (isAdmin) {
                const adminDiv = document.createElement('div');
                adminDiv.className = 'admin-controls';
                
                const processBtn = document.createElement('button');
                processBtn.className = 'btn-admin btn-process';
                processBtn.textContent = 'В роботу';
                processBtn.addEventListener('click', () => changeStatus(issue.id, 'process'));

                const doneBtn = document.createElement('button');
                doneBtn.className = 'btn-admin btn-done';
                doneBtn.textContent = 'Готово';
                doneBtn.addEventListener('click', () => changeStatus(issue.id, 'done'));

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-admin btn-delete';
                deleteBtn.textContent = 'Видалити';
                deleteBtn.addEventListener('click', () => deleteIssue(issue.id));

                adminDiv.appendChild(processBtn);
                adminDiv.appendChild(doneBtn);
                adminDiv.appendChild(deleteBtn);
                
                li.appendChild(adminDiv);
            }

            issuesListUl.appendChild(li);
        });
    }

    // --- 10. АНІМАЦІЯ ПЕРЕХОДУ НА КАРТУ ЗІ СПИСКУ ---
    window.showOnMap = async function(lat, lng, category, desc) {
        showScreen('map');
        await updateMapData();
        
        setTimeout(() => {
            if(map) {
                map.invalidateSize(); 
                map.flyTo([lat, lng], 17, { animate: true, duration: 1.5 });
                L.popup().setLatLng([lat, lng]).setContent(`<b>${category}</b><br>${desc}`).openOn(map);
            }
        }, 150);
    }
});
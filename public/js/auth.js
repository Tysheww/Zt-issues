import { auth } from './firebase.js';
import { state, ADMIN_EMAIL } from './state.js';
import { showToast, showConfirm } from './utils.js';
import { showScreen } from './ui.js';
import { loadIssuesForList } from './issues.js';
import { updateMapData } from './map.js';
import { initWelcomeChart } from './dashboard.js';

export function initAuth() {
    auth.onAuthStateChanged(user => {
        state.currentUser = user;
        const userAuthBtn = document.getElementById('user-auth-btn');
        const userCabinetBtn = document.getElementById('user-cabinet-btn');
        const userLogoutBtn = document.getElementById('user-logout-btn');

        if (user) {
            state.isAdmin = (user.email === ADMIN_EMAIL);
            if(userAuthBtn) userAuthBtn.style.display = 'none';
            if(userCabinetBtn) userCabinetBtn.style.display = 'inline-flex';
            if(userLogoutBtn) userLogoutBtn.style.display = 'inline-block';
        } else {
            state.isAdmin = false;
            if(userAuthBtn) userAuthBtn.style.display = 'inline-flex';
            if(userCabinetBtn) userCabinetBtn.style.display = 'none'; 
            if(userLogoutBtn) userLogoutBtn.style.display = 'none';
        }
        
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash === 'list') {
            loadIssuesForList();
        } else if (currentHash === 'map') {
            updateMapData();
        } else {
            initWelcomeChart();
        }
    });
}

export function setupAuthUI() {
    document.getElementById('user-auth-btn').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-modal').style.display = 'flex'; });
    document.getElementById('btn-auth-cancel').addEventListener('click', closeModalAndClear);

    document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
        e.preventDefault();
        state.isLoginMode = !state.isLoginMode; 
        document.getElementById('auth-error').style.display = 'none'; 
        
        if (state.isLoginMode) {
            document.getElementById('auth-modal-title').textContent = "Авторизація";
            document.getElementById('auth-modal-desc').textContent = "Вхід до особистого кабінету мешканця.";
            document.getElementById('btn-auth-submit').textContent = "УВІЙТИ";
            document.getElementById('btn-auth-submit').classList.remove('btn-green');
            document.getElementById('auth-toggle-text').textContent = "Немає облікового запису?";
            e.target.textContent = "Зареєструватися";
        } else {
            document.getElementById('auth-modal-title').textContent = "Реєстрація";
            document.getElementById('auth-modal-desc').textContent = "Створення нового облікового запису.";
            document.getElementById('btn-auth-submit').textContent = "СТВОРИТИ АКАУНТ";
            document.getElementById('btn-auth-submit').classList.add('btn-green'); 
            document.getElementById('auth-toggle-text').textContent = "Вже є акаунт?";
            e.target.textContent = "Увійти";
        }
    });

    document.getElementById('btn-auth-submit').addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-pass').value.trim();
        
        if (!email || !password) return showError("Введіть електронну пошту та пароль.");
        if (!state.isLoginMode && password.length < 6) return showError("Пароль має містити щонайменше 6 символів.");
        try {
            if (state.isLoginMode) {
                await auth.signInWithEmailAndPassword(email, password);
                showToast("Успішно авторизовано!");
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
                showToast("Обліковий запис успішно створено!");
            }
            closeModalAndClear();
       } catch (error) { 
            let userFriendlyMessage = error.message;

           
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                userFriendlyMessage = "Неправильний логін або пароль.";
            } else if (error.code === 'auth/email-already-in-use') {
                userFriendlyMessage = "Користувач з такою поштою вже зареєстрований.";
            } else if (error.code === 'auth/invalid-email') {
                userFriendlyMessage = "Введено некоректну електронну адресу.";
            } else if (error.code === 'auth/weak-password') {
                userFriendlyMessage = "Пароль надто слабкий (мінімум 6 символів).";
            } else if (error.code === 'auth/too-many-requests') {
                userFriendlyMessage = "Забагато невдалих спроб входу. Спробуйте пізніше.";
            }

            showError((state.isLoginMode ? "Помилка входу: " : "Помилка реєстрації: ") + userFriendlyMessage); 
        }
    });

    document.getElementById('user-logout-btn').addEventListener('click', () => { 
        showConfirm("Вихід з акаунту", "Чи точно ви хочете вийти з особистого кабінету?", async () => {
            await auth.signOut(); 
            state.isCabinetMode = false; 
            showToast("Ви вийшли з облікового запису."); 
            showScreen('menu'); 
        });
    });

    function showError(msg) { 
        const err = document.getElementById('auth-error');
        err.textContent = msg; err.style.display = 'block'; 
    }
    
    function closeModalAndClear() { 
        document.getElementById('login-modal').style.display = 'none'; 
        document.getElementById('auth-error').style.display = 'none'; 
        document.getElementById('auth-email').value = ''; 
        document.getElementById('auth-pass').value = ''; 
        state.isLoginMode = true;
        document.getElementById('auth-modal-title').textContent = "Авторизація";
        document.getElementById('auth-modal-desc').textContent = "Вхід до особистого кабінету мешканця.";
        const btnSubmit = document.getElementById('btn-auth-submit');
        btnSubmit.textContent = "УВІЙТИ"; btnSubmit.classList.remove('btn-green');
        document.getElementById('auth-toggle-text').textContent = "Немає облікового запису?";
        document.getElementById('auth-toggle-link').textContent = "Зареєструватися";
    }
}
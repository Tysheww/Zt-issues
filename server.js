require('dotenv').config(); // ПІДКЛЮЧАЄМОdotenv
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');


// 1. Оновлені імпорти (додано initializeFirestore)
const { initializeApp } = require('firebase/app');
const { 
    getFirestore, 
    collection, 
    getDocs, 
    setDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    initializeFirestore 
} = require('firebase/firestore');

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASS || "admin";

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// --- КОНФІГУРАЦІЯ FIREBASE ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "zhytomyr-issues.firebaseapp.com",
  projectId: "zhytomyr-issues",
  storageBucket: "zhytomyr-issues.firebasestorage.app",
  messagingSenderId: "767660965523",
  appId: "1:767660965523:web:409c6afb1e374f05155766"
};

const firebaseApp = initializeApp(firebaseConfig);

// Використовуємо спеціальну ініціалізацію для стабільності Node.js
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
});

// --- КОНФІГУРАЦІЯ ПОШТИ ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmergencyEmail(issue) {
    const mailOptions = {
        from: '"Система Житомир 🚨" <tysheww@gmail.com>',
        to: 'tysheww@gmail.com',
        subject: `КРИТИЧНО: ${issue.category} - ${issue.author}`,
        html: `
            <div style="font-family: sans-serif; border: 2px solid #e74c3c; padding: 20px; border-radius: 10px;">
                <h2 style="color: #e74c3c;">🚨 Виявлено екстрену проблему!</h2>
                <p><b>Категорія:</b> ${issue.category}</p>
                <p><b>Автор:</b> ${issue.author}</p>
                <p><b>Опис:</b> ${issue.description}</p>
                <p><b>Координати:</b> ${issue.lat}, ${issue.lng}</p>
                <br>
                <a href="http://localhost:3000" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Відкрити карту</a>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("📧 Лист успішно надіслано!");
    } catch (error) {
        console.error("❌ Помилка відправки пошти:", error);
    }
}

// ==========================================
// API РОУТИ
// ==========================================

// Отримати всі заявки
app.get('/issues', async (req, res) => {
    try {
        const querySnapshot = await getDocs(collection(db, "issues"));
        const issues = [];
        querySnapshot.forEach((doc) => issues.push(doc.data()));
        res.json(issues);
    } catch (e) { 
        console.error("Помилка отримання:", e);
        res.status(500).send(e.message); 
    }
});

// Створити нову заявку
app.post('/issues', async (req, res) => {
    console.log("🚀 Отримано дані від браузера:", req.body);

    try {
        const newId = Date.now().toString();
        const newIssue = {
            id: Number(newId),
            status: 'new',  
            ...req.body
        };
        
        // 1. Зберігаємо в Firebase
        await setDoc(doc(db, "issues", newId), newIssue);
        console.log("✅ Збережено в Firebase");
        
        // 2. Перевірка на екстреність
        const emergencyCategories = ["Дороги / Ями", "Водоканал"];
        
        if (emergencyCategories.includes(newIssue.category)) {
            console.log(`⚠️ Категорія "${newIssue.category}" екстрена! Надсилаю лист...`);
            sendEmergencyEmail(newIssue); 
        }

        res.status(201).json(newIssue);
    } catch (error) {
        console.error("❌ Помилка створення:", error);
        res.status(500).json({ error: "Помилка сервера" });
    }
});

app.post('/update-status', async (req, res) => {
    const { id, status, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "Пароль!" });
    try {
        await updateDoc(doc(db, "issues", id.toString()), { status });
        res.json({ success: true });
    } catch (e) { res.status(404).json({ error: "Не знайдено" }); }
});

app.post('/delete-issue', async (req, res) => {
    const { id, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: "Пароль!" });
    try {
        await deleteDoc(doc(db, "issues", id.toString()));
        res.json({ success: true });
    } catch (e) { res.status(404).json({ error: "Помилка" }); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
    console.log(`Сервер працює на http://localhost:${PORT}`);
    console.log("База Firebase готова до роботи!");
});
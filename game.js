// --- 數據結構 ---
let masteredWords = new Set(); // 永久掌握的單字 (儲存單字字串)
let difficultWords = new Set(); // 永久錯題本 (儲存單字字串)

let currentLevelWords = []; // 目前關卡的單字資料物件
let remainingWords = []; // 目前測驗中剩餘的單字
let learnedCount = 0; // 本次對話中新學會的數量
let wrongWords = new Set(); // 本次對話暫時的錯題
let totalSessionWords = 0;
let isMuted = false;
let hasUnlockedSpeech = false;

// DOM 元素
const levelScreen = document.getElementById('level-screen');
const gameApp = document.getElementById('app');
const levelGrid = document.getElementById('level-grid');
const levelTag = document.getElementById('level-tag');
const backToLevelsBtn = document.getElementById('back-to-levels');
const flashcard = document.getElementById('flashcard');
const cardTrigger = document.getElementById('card-trigger');
const wordMain = document.getElementById('card-word');
const wordType = document.getElementById('card-type');
const meaningMain = document.getElementById('card-meaning');
const learnedCountEl = document.getElementById('learned-count');
const remainingCountEl = document.getElementById('remaining-count');
const progressBar = document.getElementById('progress-bar');
const btnWrong = document.getElementById('btn-wrong');
const btnRight = document.getElementById('btn-right');
const winScreen = document.getElementById('win-screen');
const soundToggle = document.getElementById('sound-toggle');
const btnReview = document.getElementById('btn-review');
const wrongTotalEl = document.getElementById('wrong-total');

// --- 儲存邏輯 ---
function saveToStorage() {
    localStorage.setItem('vocab_mastered', JSON.stringify(Array.from(masteredWords)));
    localStorage.setItem('vocab_difficult', JSON.stringify(Array.from(difficultWords)));
}

function loadFromStorage() {
    const mastered = localStorage.getItem('vocab_mastered');
    const difficult = localStorage.getItem('vocab_difficult');
    if (mastered) masteredWords = new Set(JSON.parse(mastered));
    if (difficult) difficultWords = new Set(JSON.parse(difficult));
}

// --- 關卡邏輯 ---
function getLevelProgress(level) {
    const startIdx = (level - 1) * 100;
    const endIdx = startIdx + 100;
    const levelWordsArr = VOCAB_DATA.slice(startIdx, endIdx);
    const masteredCount = levelWordsArr.filter(w => masteredWords.has(w.w)).length;
    return { mastered: masteredCount, total: levelWordsArr.length };
}

function createLevelSelection() {
    levelGrid.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
        const progress = getLevelProgress(i);
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        if (progress.mastered === progress.total && progress.total > 0) {
            btn.style.borderColor = 'var(--secondary)';
            btn.style.background = 'rgba(236, 72, 153, 0.1)';
        }
        
        btn.innerHTML = `
            <div style="font-size: 1.2rem">LV ${i}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px">
                ${progress.mastered} / ${progress.total}
            </div>
        `;
        btn.onclick = () => startLevel(i);
        levelGrid.appendChild(btn);
    }
}

function startLevel(level) {
    unlockMobileSpeech();
    loadFromStorage();
    
    levelTag.textContent = `Level ${level}`;
    const startIdx = (level - 1) * 100;
    const endIdx = startIdx + 100;
    currentLevelWords = VOCAB_DATA.slice(startIdx, endIdx);
    
    // 只練習尚未掌握的單字 (或是可以選擇全部練習)
    // 這裡我們預設顯示所有單字，但標記已掌握的
    remainingWords = [...currentLevelWords];
    remainingWords.sort(() => Math.random() - 0.5);
    
    learnedCount = currentLevelWords.filter(w => masteredWords.has(w.w)).length;
    totalSessionWords = currentLevelWords.length;
    wrongWords = new Set();
    
    levelScreen.classList.remove('active');
    gameApp.classList.add('active');
    
    updateCounts();
    showCurrentWord(true);
}

function backToLevels() {
    gameApp.classList.remove('active');
    levelScreen.classList.add('active');
    window.speechSynthesis.cancel();
    createLevelSelection(); // 重新整理關卡進度數字
}

function updateCounts() {
    // 這裡顯示的是該關卡的總掌握數
    learnedCountEl.textContent = learnedCount;
    remainingCountEl.textContent = remainingWords.length;
    wrongTotalEl.textContent = difficultWords.size; // 顯示全域錯題本數量
    btnReview.style.display = difficultWords.size > 0 ? 'block' : 'none';
    
    const progress = totalSessionWords > 0 ? (learnedCount / totalSessionWords) * 100 : 0;
    progressBar.style.width = `${progress}%`;
}

function handleNext(isKnown) {
    if (remainingWords.length === 0) return;
    const currentWord = remainingWords.shift();

    if (isKnown) {
        if (!masteredWords.has(currentWord.w)) {
            masteredWords.add(currentWord.w);
            learnedCount++;
        }
        difficultWords.delete(currentWord.w); // 如果學會了，從錯題本移除
        flashcard.style.transform = 'translateX(100px) rotate(10deg) scale(0.9)';
    } else {
        difficultWords.add(currentWord.w);
        remainingWords.push(currentWord); // 放到本次對話最後面重測
        flashcard.style.transform = 'translateX(-100px) rotate(-10deg) scale(0.9)';
    }
    
    saveToStorage();
    flashcard.style.opacity = '0';
    updateCounts();
    
    setTimeout(() => {
        showCurrentWord();
        flashcard.style.transform = '';
        flashcard.style.opacity = '1';
    }, 250);
}

function startReviewMode() {
    if (difficultWords.size === 0) return;
    
    // 從 VOCAB_DATA 中找出與錯題本字串相符的完整物件
    const reviewQueue = VOCAB_DATA.filter(w => difficultWords.has(w.w));
    remainingWords = [...reviewQueue];
    remainingWords.sort(() => Math.random() - 0.5);
    
    learnedCount = 0; // 在複習模式中重置計數
    totalSessionWords = remainingWords.length;
    
    updateCounts();
    showCurrentWord(true);
}

// --- 其餘輔助功能 (發音、翻面等) ---
function unlockMobileSpeech() {
    if (hasUnlockedSpeech) return;
    const silentUtterance = new SpeechSynthesisUtterance(' ');
    silentUtterance.volume = 0;
    window.speechSynthesis.speak(silentUtterance);
    hasUnlockedSpeech = true;
}

function speak(text) {
    if (isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.includes('en-US') || v.lang.includes('en_US'));
    if (enVoice) utterance.voice = enVoice;
    window.speechSynthesis.speak(utterance);
}

function showCurrentWord(immediateSpeak = false) {
    if (remainingWords.length === 0) {
        showWinScreen();
        return;
    }
    const currentWord = remainingWords[0];
    wordMain.textContent = currentWord.w;
    wordType.textContent = currentWord.t;
    meaningMain.textContent = currentWord.m;
    flashcard.classList.remove('flipped');
    
    if (immediateSpeak) speak(currentWord.w);
    else setTimeout(() => speak(currentWord.w), 300);
}

function showWinScreen() {
    winScreen.style.display = 'flex';
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#ec4899', '#ffffff'] });
}

function toggleFlip() {
    flashcard.classList.toggle('flipped');
    if (!flashcard.classList.contains('flipped')) speak(wordMain.textContent);
}

// 事件監聽
cardTrigger.addEventListener('click', toggleFlip);
btnWrong.addEventListener('click', (e) => { e.stopPropagation(); unlockMobileSpeech(); handleNext(false); });
btnRight.addEventListener('click', (e) => { e.stopPropagation(); unlockMobileSpeech(); handleNext(true); });
btnReview.addEventListener('click', (e) => { e.stopPropagation(); unlockMobileSpeech(); startReviewMode(); });
backToLevelsBtn.addEventListener('click', backToLevels);
soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    soundToggle.classList.toggle('muted', isMuted);
    soundToggle.querySelector('.icon').textContent = isMuted ? '❌' : '🔊';
    if (!isMuted) { unlockMobileSpeech(); speak(wordMain.textContent); }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggleFlip(); }
    if (e.code === 'KeyS' || e.code === 'ArrowRight') { handleNext(true); }
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') { handleNext(false); }
    if (e.code === 'KeyR') { startReviewMode(); }
    if (e.code === 'Escape') { backToLevels(); }
});

// 初始化
loadFromStorage();
createLevelSelection();
window.speechSynthesis.getVoices();

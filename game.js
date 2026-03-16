// --- 數據結構 ---
let masteredWords = new Set();
let difficultWords = new Set();

let currentLevelWords = [];
let remainingWords = [];
let learnedCount = 0;
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

// --- 語音系統 (手機優化版) ---
function speak(text) {
    if (isMuted) return;
    
    // 1. 先停止所有發音
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    // 2. 針對手機：獲取所有可用語音
    let voices = window.speechSynthesis.getVoices();
    
    // 3. 嘗試精準匹配英文語音
    const enVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US') 
                 || voices.find(v => v.lang.startsWith('en'));
    
    if (enVoice) {
        utterance.voice = enVoice;
    }

    // 4. 發音
    window.speechSynthesis.speak(utterance);
}

// 解鎖語音 (需在 Click 事件內首位調用)
function unlockMobileSpeech() {
    if (hasUnlockedSpeech) return;
    const silentUtterance = new SpeechSynthesisUtterance('');
    silentUtterance.volume = 0;
    window.speechSynthesis.speak(silentUtterance);
    hasUnlockedSpeech = true;
}

// --- 核心展示邏輯 ---
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
    
    // 如果是手機，盡量採用 immediateSpeak = true (由點擊事件直接觸發)
    if (immediateSpeak) {
        speak(currentWord.w);
    } else {
        // 短暫延遲是為了讓渲染流暢，但在手機上有時會失效
        setTimeout(() => speak(currentWord.w), 100);
    }
}

// --- 測驗控制 ---
function handleNext(isKnown) {
    unlockMobileSpeech(); // 每次點擊都嘗試解鎖/維持權限
    
    if (remainingWords.length === 0) return;
    const currentWord = remainingWords.shift();

    if (isKnown) {
        if (!masteredWords.has(currentWord.w)) {
            masteredWords.add(currentWord.w);
            learnedCount++;
        }
        difficultWords.delete(currentWord.w);
        flashcard.style.transform = 'translateX(100px) rotate(10deg) scale(0.9)';
    } else {
        difficultWords.add(currentWord.w);
        remainingWords.push(currentWord);
        flashcard.style.transform = 'translateX(-100px) rotate(-10deg) scale(0.9)';
    }
    
    saveToStorage();
    flashcard.style.opacity = '0';
    updateCounts();
    
    // 重點：先預備下一個單字的顯示內容
    if (remainingWords.length > 0) {
        const nextWord = remainingWords[0];
        // 動畫到一半時立即發音，這樣還在「點擊動作」的反應時間內
        speak(nextWord.w);
        
        setTimeout(() => {
            wordMain.textContent = nextWord.w;
            wordType.textContent = nextWord.t;
            meaningMain.textContent = nextWord.m;
            flashcard.classList.remove('flipped');
            flashcard.style.transform = '';
            flashcard.style.opacity = '1';
        }, 200);
    } else {
        showWinScreen();
    }
}

// --- 關卡邏輯 ---
function createLevelSelection() {
    levelGrid.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
        const p = getLevelProgress(i);
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        if (p.mastered === p.total && p.total > 0) {
            btn.style.borderColor = 'var(--secondary)';
            btn.style.background = 'rgba(236, 72, 153, 0.1)';
        }
        btn.innerHTML = `
            <div style="font-size: 1.2rem">LV ${i}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px">${p.mastered} / ${p.total}</div>
        `;
        btn.onclick = () => {
            unlockMobileSpeech();
            startLevel(i);
        };
        levelGrid.appendChild(btn);
    }
}

function getLevelProgress(level) {
    const startIdx = (level - 1) * 100;
    const endIdx = startIdx + 100;
    const levelWordsArr = VOCAB_DATA.slice(startIdx, endIdx);
    const masteredCount = levelWordsArr.filter(w => masteredWords.has(w.w)).length;
    return { mastered: masteredCount, total: levelWordsArr.length };
}

function startLevel(level) {
    loadFromStorage();
    levelTag.textContent = `Level ${level}`;
    const startIdx = (level - 1) * 100;
    const endIdx = startIdx + 100;
    currentLevelWords = VOCAB_DATA.slice(startIdx, endIdx);
    remainingWords = [...currentLevelWords];
    remainingWords.sort(() => Math.random() - 0.5);
    learnedCount = currentLevelWords.filter(w => masteredWords.has(w.w)).length;
    totalSessionWords = currentLevelWords.length;
    levelScreen.classList.remove('active');
    gameApp.classList.add('active');
    updateCounts();
    showCurrentWord(true); // 由按鈕點擊事件觸發，100% 有聲
}

function backToLevels() {
    gameApp.classList.remove('active');
    levelScreen.classList.add('active');
    window.speechSynthesis.cancel();
    createLevelSelection();
}

function updateCounts() {
    learnedCountEl.textContent = learnedCount;
    remainingCountEl.textContent = remainingWords.length;
    wrongTotalEl.textContent = difficultWords.size;
    btnReview.style.display = difficultWords.size > 0 ? 'block' : 'none';
    const progress = totalSessionWords > 0 ? (learnedCount / totalSessionWords) * 100 : 0;
    progressBar.style.width = `${progress}%`;
}

function startReviewMode() {
    if (difficultWords.size === 0) return;
    const reviewQueue = VOCAB_DATA.filter(w => difficultWords.has(w.w));
    remainingWords = [...reviewQueue];
    remainingWords.sort(() => Math.random() - 0.5);
    learnedCount = 0;
    totalSessionWords = remainingWords.length;
    updateCounts();
    showCurrentWord(true); // 由按鈕點擊觸發
}

function showWinScreen() {
    winScreen.style.display = 'flex';
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#ec4899', '#ffffff'] });
}

function toggleFlip() {
    unlockMobileSpeech();
    flashcard.classList.toggle('flipped');
    if (!flashcard.classList.contains('flipped')) speak(wordMain.textContent);
}

// 事件監聽
cardTrigger.addEventListener('click', toggleFlip);
btnWrong.addEventListener('click', (e) => { e.stopPropagation(); handleNext(false); });
btnRight.addEventListener('click', (e) => { e.stopPropagation(); handleNext(true); });
btnReview.addEventListener('click', (e) => { e.stopPropagation(); startReviewMode(); });
backToLevelsBtn.addEventListener('click', backToLevels);
soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    soundToggle.classList.toggle('muted', isMuted);
    soundToggle.querySelector('.icon').textContent = isMuted ? '❌' : '🔊';
    if (!isMuted) { unlockMobileSpeech(); speak(wordMain.textContent); }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggleFlip(); }
    if (e.code === 'KeyX' || e.code === 'ArrowRight') { handleNext(true); }
    if (e.code === 'KeyZ' || e.code === 'ArrowLeft') { handleNext(false); }
    if (e.code === 'KeyR') { startReviewMode(); }
    if (e.code === 'Escape') { backToLevels(); }
});

// 初始化
loadFromStorage();
createLevelSelection();
// Chrome 修正：需監聽 voiceschanged 確保語音包載入
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

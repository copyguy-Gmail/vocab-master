let currentLevel = 1;
let learnedCount = 0;
let remainingWords = [];
let wrongWords = new Set();
let isMuted = false;
let totalSessionWords = 0;

// DOM Elements
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

function createLevelSelection() {
    levelGrid.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = `LV ${i}`;
        btn.onclick = () => startLevel(i);
        levelGrid.appendChild(btn);
    }
}

function startLevel(level) {
    currentLevel = level;
    levelTag.textContent = `Level ${level}`;
    
    // Calculate word range
    const startIdx = (level - 1) * 100;
    const endIdx = startIdx + 100;
    
    // Get words for this level
    // If we have fewer than endIdx words, it just takes what's available
    const levelWords = VOCAB_DATA.slice(startIdx, endIdx);
    
    if (levelWords.length === 0) {
        alert("這一關目前沒有單字數據！");
        return;
    }

    remainingWords = [...levelWords];
    remainingWords.sort(() => Math.random() - 0.5);
    
    // Reset stats
    learnedCount = 0;
    totalSessionWords = remainingWords.length;
    wrongWords = new Set();
    
    // Switch screens
    levelScreen.classList.remove('active');
    gameApp.classList.add('active');
    
    updateCounts();
    showCurrentWord();
}

function backToLevels() {
    gameApp.classList.remove('active');
    levelScreen.classList.add('active');
    window.speechSynthesis.cancel();
}

function updateCounts() {
    learnedCountEl.textContent = learnedCount;
    remainingCountEl.textContent = remainingWords.length;
    wrongTotalEl.textContent = wrongWords.size;
    btnReview.style.display = wrongWords.size > 0 ? 'block' : 'none';
    
    const progress = totalSessionWords > 0 ? (learnedCount / totalSessionWords) * 100 : 0;
    progressBar.style.width = `${progress}%`;
}

function speak(text) {
    if (isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

function showCurrentWord() {
    if (remainingWords.length === 0) {
        showWinScreen();
        return;
    }

    const currentWord = remainingWords[0];
    wordMain.textContent = currentWord.w;
    wordType.textContent = currentWord.t;
    meaningMain.textContent = currentWord.m;
    flashcard.classList.remove('flipped');
    
    setTimeout(() => {
        speak(currentWord.w);
    }, 400);
}

function showWinScreen() {
    winScreen.style.display = 'flex';
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#ffffff']
    });
}

function handleNext(isKnown) {
    if (remainingWords.length === 0) return;

    if (isKnown) {
        remainingWords.shift();
        learnedCount++;
        flashcard.style.transform = 'translateX(100px) rotate(10deg) scale(0.9)';
    } else {
        const currentWord = remainingWords.shift();
        wrongWords.add(currentWord);
        remainingWords.push(currentWord);
        flashcard.style.transform = 'translateX(-100px) rotate(-10deg) scale(0.9)';
    }
    
    flashcard.style.opacity = '0';
    updateCounts();
    
    setTimeout(() => {
        showCurrentWord();
        flashcard.style.transform = '';
        flashcard.style.opacity = '1';
    }, 300);
}

function startReviewMode() {
    if (wrongWords.size === 0) return;
    remainingWords = Array.from(wrongWords);
    remainingWords.sort(() => Math.random() - 0.5);
    learnedCount = 0;
    totalSessionWords = remainingWords.length;
    wrongWords = new Set();
    updateCounts();
    showCurrentWord();
}

function toggleFlip() {
    flashcard.classList.toggle('flipped');
}

// Event Listeners
cardTrigger.addEventListener('click', toggleFlip);
btnWrong.addEventListener('click', (e) => { e.stopPropagation(); handleNext(false); });
btnRight.addEventListener('click', (e) => { e.stopPropagation(); handleNext(true); });
btnReview.addEventListener('click', startReviewMode);
backToLevelsBtn.addEventListener('click', backToLevels);

soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    soundToggle.classList.toggle('muted', isMuted);
    soundToggle.querySelector('.icon').textContent = isMuted ? '❌' : '🔊';
});

// Keyboard Support
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggleFlip(); }
    if (e.code === 'KeyS' || e.code === 'ArrowRight') { handleNext(true); }
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') { handleNext(false); }
    if (e.code === 'KeyR') { startReviewMode(); }
    if (e.code === 'Escape') { backToLevels(); }
});

// Init Screen
createLevelSelection();

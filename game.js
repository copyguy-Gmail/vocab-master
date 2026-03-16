let currentLevel = 1;
let learnedCount = 0;
let remainingWords = [];
let wrongWords = new Set();
let isMuted = false;
let totalSessionWords = 0;
let hasUnlockedSpeech = false; // Flag for mobile audio unlock

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

// Special function to unlock speech on mobile
function unlockMobileSpeech() {
    if (hasUnlockedSpeech) return;
    const silentUtterance = new SpeechSynthesisUtterance(' ');
    silentUtterance.volume = 0;
    window.speechSynthesis.speak(silentUtterance);
    hasUnlockedSpeech = true;
}

function startLevel(level) {
    unlockMobileSpeech(); // Unlock on the very first button click
    
    currentLevel = level;
    levelTag.textContent = `Level ${level}`;
    
    const startIdx = (level - 1) * 100;
    const endIdx = startIdx + 100;
    const levelWords = VOCAB_DATA.slice(startIdx, endIdx);
    
    if (levelWords.length === 0) {
        alert("這一關目前沒有單字數據！");
        return;
    }

    remainingWords = [...levelWords];
    remainingWords.sort(() => Math.random() - 0.5);
    
    learnedCount = 0;
    totalSessionWords = remainingWords.length;
    wrongWords = new Set();
    
    levelScreen.classList.remove('active');
    gameApp.classList.add('active');
    
    updateCounts();
    showCurrentWord(true); // First word of level
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
    
    // In mobile, we cancel and then speak immediately
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    // Some mobile devices need this to ensure voices are loaded
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
    
    if (immediateSpeak) {
        speak(currentWord.w);
    } else {
        // Use a shorter delay to stay closer to the user interaction window
        setTimeout(() => {
            speak(currentWord.w);
        }, 300);
    }
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
    
    // Critical: Try to speak right here to maintain the "user-initiated" context if needed,
    // or at least ensure the next call is very close.
    // For mobile, immediate interaction is best.

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
    }, 250);
}

function startReviewMode() {
    if (wrongWords.size === 0) return;
    remainingWords = Array.from(wrongWords);
    remainingWords.sort(() => Math.random() - 0.5);
    learnedCount = 0;
    totalSessionWords = remainingWords.length;
    wrongWords = new Set();
    updateCounts();
    showCurrentWord(true); // Speak immediately on button click
}

function toggleFlip() {
    flashcard.classList.toggle('flipped');
    // Re-speak word on flip if front is shown (optional)
    if (!flashcard.classList.contains('flipped')) {
        speak(wordMain.textContent);
    }
}

// Event Listeners
cardTrigger.addEventListener('click', toggleFlip);
btnWrong.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    unlockMobileSpeech(); 
    handleNext(false); 
});
btnRight.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    unlockMobileSpeech(); 
    handleNext(true); 
});

btnReview.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockMobileSpeech();
    startReviewMode();
});

backToLevelsBtn.addEventListener('click', backToLevels);

soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    soundToggle.classList.toggle('muted', isMuted);
    soundToggle.querySelector('.icon').textContent = isMuted ? '❌' : '🔊';
    if (!isMuted) {
        unlockMobileSpeech();
        speak(wordMain.textContent);
    }
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
// Ensure voices load
window.speechSynthesis.getVoices();

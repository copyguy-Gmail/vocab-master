// --- 數據結構 ---
let currentSetKey = 'junior_high';
let masteredWords = new Set();
let difficultWords = new Set();
let challengerName = '';

let currentLevelWords = [];
let remainingWords = [];
let learnedCount = 0;
let totalSessionWords = 0;
let isMuted = false;
let hasUnlockedSpeech = false;

const WORDS_PER_LEVEL = 100;

document.addEventListener('DOMContentLoaded', () => {
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
    const wordCountHeader = document.querySelector('.word-count');
    const setBtns = document.querySelectorAll('.set-btn');

    // Ranking & Registration Elements
    const registerOverlay = document.getElementById('register-overlay');
    const challengerNameInput = document.getElementById('challenger-name-input');
    const btnRegister = document.getElementById('btn-register');
    const displayNameEl = document.getElementById('display-name');
    const btnShowRanking = document.getElementById('btn-show-ranking');
    const rankingSection = document.getElementById('ranking-section');
    const closeRankingBtn = document.getElementById('close-ranking');
    const rankingListEl = document.getElementById('ranking-list');

    // --- 儲存與註冊邏輯 ---
    function getStorageKey(suffix) {
        return `vocab_${currentSetKey}_${suffix}`;
    }

    function saveToStorage() {
        localStorage.setItem(getStorageKey('mastered'), JSON.stringify(Array.from(masteredWords)));
        localStorage.setItem(getStorageKey('difficult'), JSON.stringify(Array.from(difficultWords)));
        localStorage.setItem('vocab_last_set', currentSetKey);
    }

    function loadFromStorage() {
        challengerName = localStorage.getItem('vocab_challenger_name') || '';
        if (challengerName) {
            displayNameEl.textContent = challengerName;
            registerOverlay.classList.remove('active');
            registerOverlay.style.display = 'none'; // 強制隱藏
        } else {
            registerOverlay.classList.add('active');
            registerOverlay.style.display = 'grid'; // 強制顯示
        }

        const lastSet = localStorage.getItem('vocab_last_set');
        if (lastSet && VOCAB_SETS[lastSet]) {
            currentSetKey = lastSet;
            updateSetUI();
        }

        const mastered = localStorage.getItem(getStorageKey('mastered'));
        const difficult = localStorage.getItem(getStorageKey('difficult'));
        masteredWords = mastered ? new Set(JSON.parse(mastered)) : new Set();
        difficultWords = difficult ? new Set(JSON.parse(difficult)) : new Set();
    }

    btnRegister.onclick = () => {
        const name = challengerNameInput.value.trim();
        if (name) {
            challengerName = name;
            localStorage.setItem('vocab_challenger_name', name);
            displayNameEl.textContent = name;
            registerOverlay.classList.remove('active');
            registerOverlay.style.display = 'none';
            unlockMobileSpeech();
            createLevelSelection();
        } else {
            challengerNameInput.style.borderColor = 'red';
            setTimeout(() => challengerNameInput.style.borderColor = '', 1000);
        }
    };

    // --- 排行榜邏輯 ---
    function renderRankingList() {
        rankingListEl.innerHTML = '';
        const userMastered = masteredWords.size;
        const totalWords = VOCAB_SETS[currentSetKey].data.length;

        const competitors = [
            { name: "單字王者 Leo", score: Math.floor(totalWords * 0.95), isUser: false },
            { name: "詞彙大師 Sarah", score: Math.floor(totalWords * 0.85), isUser: false },
            { name: "閃電俠 Allen", score: Math.floor(totalWords * 0.75), isUser: false },
            { name: "努力家 Emily", score: Math.floor(totalWords * 0.60), isUser: false },
            { name: "初學者 Mike", score: Math.floor(totalWords * 0.30), isUser: false }
        ];

        competitors.push({ name: challengerName || "您", score: userMastered, isUser: true });
        competitors.sort((a, b) => b.score - a.score);

        competitors.forEach((c, index) => {
            const rank = index + 1;
            const item = document.createElement('div');
            item.className = `rank-item ${c.isUser ? 'is-user' : ''} ${rank === 1 ? 'king' : ''}`;
            
            let rankDisplay = rank;
            if (rank === 1) rankDisplay = '👑';

            item.innerHTML = `
                <div class="rank-info">
                    <div class="rank-num">${rankDisplay}</div>
                    <div class="rank-name">${c.name} ${rank === 1 ? '<span style="font-size: 0.8rem; background: #fbbf24; color: #000; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">王者</span>' : ''}</div>
                </div>
                <div class="rank-score">
                    <span class="score-val">${c.score}</span>
                    <span class="score-label">掌握單字</span>
                </div>
            `;
            rankingListEl.appendChild(item);
        });
    }

    btnShowRanking.onclick = () => {
        rankingSection.classList.add('active');
        renderRankingList();
    };
    closeRankingBtn.onclick = () => rankingSection.classList.remove('active');

    // --- 語音系統 ---
    function speak(text) {
        if (isMuted) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }

    function unlockMobileSpeech() {
        if (hasUnlockedSpeech) return;
        const silentUtterance = new SpeechSynthesisUtterance('');
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
        hasUnlockedSpeech = true;
    }

    // --- 核心展示與邏輯 ---
    function showCurrentWord(immediateSpeak = false) {
        if (remainingWords.length === 0) {
            showWinScreen();
            return;
        }
        const currentWord = remainingWords[0];
        wordMain.textContent = currentWord.w;
        wordType.textContent = currentWord.t || '片語';
        meaningMain.textContent = currentWord.m;
        flashcard.classList.remove('flipped');
        if (immediateSpeak) speak(currentWord.w);
    }

    function handleNext(isKnown) {
        unlockMobileSpeech();
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
        
        if (remainingWords.length > 0) {
            const nextWord = remainingWords[0];
            speak(nextWord.w);
            setTimeout(() => {
                wordMain.textContent = nextWord.w;
                wordType.textContent = nextWord.t || '片語';
                meaningMain.textContent = nextWord.m;
                flashcard.classList.remove('flipped');
                flashcard.style.transform = '';
                flashcard.style.opacity = '1';
            }, 200);
        } else {
            showWinScreen();
        }
    }

    // --- 關卡系統 ---
    function createLevelSelection() {
        levelGrid.innerHTML = '';
        const data = VOCAB_SETS[currentSetKey].data;
        const totalLevels = Math.ceil(data.length / WORDS_PER_LEVEL);

        for (let i = 1; i <= totalLevels; i++) {
            const p = getLevelProgress(i);
            // 鎖定邏輯：如果不是第一關，且前一關的掌握數小於前一關的總題數
            const prevP = i > 1 ? getLevelProgress(i - 1) : null;
            const isLocked = i > 1 && prevP.mastered < prevP.total;
            
            const btn = document.createElement('button');
            btn.className = `level-btn ${isLocked ? 'locked' : ''}`;
            
            if (p.mastered === p.total && p.total > 0) {
                btn.style.borderColor = 'var(--secondary)';
                btn.style.background = 'rgba(236, 72, 153, 0.1)';
            }

            btn.innerHTML = `
                <span class="level-number">LV ${i}</span>
                <span class="level-progress">${p.mastered} / ${p.total}</span>
            `;
            
            btn.onclick = () => {
                if (isLocked) {
                    alert(`請先完成 LV ${i-1} 以解鎖此關卡！`);
                    return;
                }
                unlockMobileSpeech();
                startLevel(i);
            };
            levelGrid.appendChild(btn);
        }
    }

    function getLevelProgress(level) {
        const data = VOCAB_SETS[currentSetKey].data;
        const startIdx = (level - 1) * WORDS_PER_LEVEL;
        const endIdx = Math.min(startIdx + WORDS_PER_LEVEL, data.length);
        const levelWordsArr = data.slice(startIdx, endIdx);
        const masteredCount = levelWordsArr.filter(w => masteredWords.has(w.w)).length;
        return { mastered: masteredCount, total: levelWordsArr.length };
    }

    function startLevel(level) {
        loadFromStorage();
        levelTag.textContent = `Level ${level}`;
        const data = VOCAB_SETS[currentSetKey].data;
        const startIdx = (level - 1) * WORDS_PER_LEVEL;
        const endIdx = Math.min(startIdx + WORDS_PER_LEVEL, data.length);
        currentLevelWords = data.slice(startIdx, endIdx);
        remainingWords = [...currentLevelWords];
        remainingWords.sort(() => Math.random() - 0.5);
        learnedCount = currentLevelWords.filter(w => masteredWords.has(w.w)).length;
        totalSessionWords = currentLevelWords.length;
        levelScreen.classList.remove('active');
        gameApp.classList.add('active');
        updateCounts();
        showCurrentWord(true);
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

    function updateSetUI() {
        setBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.set === currentSetKey);
        });
        const setInfo = VOCAB_SETS[currentSetKey];
        wordCountHeader.textContent = setInfo.title;
    }

    function startReviewMode() {
        if (difficultWords.size === 0) return;
        const data = VOCAB_SETS[currentSetKey].data;
        const reviewQueue = data.filter(w => difficultWords.has(w.w));
        remainingWords = [...reviewQueue];
        remainingWords.sort(() => Math.random() - 0.5);
        learnedCount = 0;
        totalSessionWords = remainingWords.length;
        updateCounts();
        showCurrentWord(true);
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

    setBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentSetKey = btn.dataset.set;
            updateSetUI();
            loadFromStorage();
            createLevelSelection();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (registerOverlay.classList.contains('active')) return;
        if (e.code === 'Space') { e.preventDefault(); toggleFlip(); }
        if (e.code === 'KeyX' || e.code === 'ArrowRight') { handleNext(true); }
        if (e.code === 'KeyZ' || e.code === 'ArrowLeft') { handleNext(false); }
        if (e.code === 'KeyR') { startReviewMode(); }
        if (e.code === 'Escape') {
            if (rankingSection.classList.contains('active')) {
                rankingSection.classList.remove('active');
            } else {
                backToLevels();
            }
        }
    });

    // 初始化流程
    loadFromStorage();
    createLevelSelection();
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
});

const SUPABASE_URL = "https://lggbigmjrpwvjbisuqys.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnZ2JpZ21qcnB3dmpiaXN1cXlzIjcmlvZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzkzMDU3NzA1LCJleHAiOjIxMDg2MzM3MDVf";
const BACKEND_URL = `${SUPABASE_URL}/functions/v1/super-action`;

let currentWord = "";
let seenWords = [];
let selectedTilesStack = [];

// Persistent game save states
let score = parseInt(localStorage.getItem('wordpurse_score')) || 0;
let highScore = parseInt(localStorage.getItem('wordpurse_highscore')) || 0;
let streak = parseInt(localStorage.getItem('wordpurse_streak')) || 0;
let level = parseInt(localStorage.getItem('wordpurse_level')) || 1;

const clueText = document.getElementById('clueText');
const answerSlots = document.getElementById('answerSlots');
const letterWheel = document.getElementById('letterWheel');
const shuffleBtn = document.getElementById('shuffleBtn');
const hintBtn = document.getElementById('hintBtn');
const clearBtn = document.getElementById('clearBtn');
const submitBtn = document.getElementById('submitBtn');
const feedbackText = document.getElementById('feedbackText');
const loader = document.getElementById('loader');
const gameCard = document.getElementById('gameCard');
const categorySelect = document.getElementById('categorySelect');
const scoreVal = document.getElementById('scoreVal');
const highScoreVal = document.getElementById('highScoreVal');
const streakVal = document.getElementById('streakVal');
const levelBadge = document.getElementById('levelBadge');
const winModal = document.getElementById('winModal');
const winMessage = document.getElementById('winMessage');
const rewardVal = document.getElementById('rewardVal');
const nextPuzzleBtn = document.getElementById('nextPuzzleBtn');

updateUIStats();

function updateUIStats() {
    scoreVal.textContent = score;
    highScoreVal.textContent = highScore;
    streakVal.textContent = streak;
    levelBadge.textContent = `Level ${level}`;
}

function saveProgress() {
    localStorage.setItem('wordpurse_score', score);
    localStorage.setItem('wordpurse_highscore', highScore);
    localStorage.setItem('wordpurse_streak', streak);
    localStorage.setItem('wordpurse_level', level);
}

function setupWheelUI(word) {
    answerSlots.innerHTML = "";
    letterWheel.innerHTML = "";
    selectedTilesStack = [];
    
    for (let i = 0; i < word.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        answerSlots.appendChild(slot);
    }
    
    let scrambledArr = scrambleWord(word);
    const totalLetters = scrambledArr.length;
    const radius = 72;
    const centerX = 110;
    const centerY = 110;
    
    scrambledArr.forEach((char, index) => {
        const angle = (index * 2 * Math.PI) / totalLetters - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const tile = document.createElement('div');
        tile.className = 'wheel-tile';
        tile.textContent = char;
        tile.style.left = `${x}px`;
        tile.style.top = `${y}px`;
        tile.dataset.char = char;
        
        tile.addEventListener('click', () => {
            if (tile.classList.contains('used')) return;
            
            const slots = answerSlots.children;
            for (let s of slots) {
                if (!s.textContent) {
                    s.textContent = char;
                    s.classList.add('filled');
                    tile.classList.add('used');
                    selectedTilesStack.push({ tileEl: tile, char: char, slotEl: s });
                    break;
                }
            }
        });
        
        letterWheel.appendChild(tile);
    });
}

function scrambleWord(word) {
    let arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    let scrambled = arr.join('');
    if (scrambled === word && word.length > 1) return scrambleWord(word);
    return arr;
}

async function fetchNewPuzzle() {
    winModal.style.display = 'none';
    const category = categorySelect.value;
    loader.style.display = 'flex';
    gameCard.style.opacity = '0.3';
    feedbackText.textContent = "";
    
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                category: category,
                excludeList: seenWords,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) throw new Error("Backend connection failed");
        
        const puzzleData = await response.json();
        let fetchedWord = puzzleData.word.toLowerCase().trim();
        
        if (seenWords.includes(fetchedWord)) {
            return fetchNewPuzzle();
        }
        
        currentWord = fetchedWord;
        seenWords.push(currentWord);
        if (seenWords.length > 40) seenWords.shift();
        
        clueText.textContent = puzzleData.clue;
        setupWheelUI(currentWord);
        
    } catch (err) {
        console.warn("Using offline fallback mode:", err);
        
        const petroleumFallbacks = [
            { word: "drilling", clue: "Process of boring a hole into the earth for oil and gas." },
            { word: "reservoir", clue: "Subsurface pool of hydrocarbons contained in porous rock." },
            { word: "pipeline", clue: "Long distance transport system for petroleum products." },
            { word: "pressure", clue: "Force exerted per unit area inside a wellbore." },
            { word: "viscosity", clue: "Measure of a fluid's resistance to flow." },
            { word: "bitumen", clue: "A sticky, black, highly viscous form of petroleum." }
        ];
        
        const englishFallbacks = [
            { word: "ephemeral", clue: "Lasting for a very short time." },
            { word: "pragmatic", clue: "Dealing with things sensibly and realistically." },
            { word: "resilient", clue: "Able to withstand or recover quickly from difficult conditions." },
            { word: "ambiguous", clue: "Open to more than one interpretation." }
        ];
        
        let fallbacks = category === "Petroleum Engineering" ? petroleumFallbacks : englishFallbacks;
        let available = fallbacks.filter(f => !seenWords.includes(f.word));
        if (available.length === 0) { seenWords = [];
            available = fallbacks; }
        
        let chosen = available[Math.floor(Math.random() * available.length)];
        currentWord = chosen.word;
        seenWords.push(currentWord);
        
        clueText.textContent = `${chosen.clue} (Offline)`;
        setupWheelUI(currentWord);
    } finally {
        loader.style.display = 'none';
        gameCard.style.opacity = '1';
    }
}

// Hint System: reveals correct letter in next empty slot
hintBtn.addEventListener('click', () => {
    if (score < 5) {
        feedbackText.textContent = "Not enough score for hint! (Needs 5pts)";
        feedbackText.className = "feedback error";
        return;
    }
    
    const slots = answerSlots.children;
    for (let i = 0; i < slots.length; i++) {
        const expectedChar = currentWord[i];
        if (slots[i].textContent.toLowerCase() !== expectedChar) {
            // Clear current invalid slot letter if any
            slots[i].textContent = expectedChar.toUpperCase();
            slots[i].className = "slot hinted";
            
            // Deduct cost
            score -= 5;
            updateUIStats();
            saveProgress();
            
            feedbackText.textContent = "Hint revealed (-5 pts) 💡";
            feedbackText.className = "feedback success";
            return;
        }
    }
});

clearBtn.addEventListener('click', () => {
    selectedTilesStack.forEach(item => {
        item.tileEl.classList.remove('used');
    });
    const slots = answerSlots.children;
    for (let s of slots) {
        if (!s.classList.contains('hinted')) {
            s.textContent = '';
            s.classList.remove('filled');
        }
    }
    selectedTilesStack = [];
});

shuffleBtn.addEventListener('click', () => {
    setupWheelUI(currentWord);
});

function checkAnswer() {
    let userGuess = "";
    const slots = answerSlots.children;
    for (let s of slots) {
        userGuess += s.textContent;
    }
    userGuess = userGuess.toLowerCase();
    
    if (userGuess.length < currentWord.length) {
        feedbackText.textContent = "Fill all slots! ⚠️";
        feedbackText.className = "feedback error";
        return;
    }
    
    if (userGuess === currentWord) {
        let earned = 15;
        score += earned;
        streak += 1;
        level += 1;
        if (score > highScore) highScore = score;
        
        updateUIStats();
        saveProgress();
        
        winMessage.textContent = `Word: "${currentWord.toUpperCase()}"`;
        rewardVal.textContent = `+${earned} Points`;
        winModal.style.display = 'flex';
    } else {
        feedbackText.textContent = "Incorrect, try again! ❌";
        feedbackText.className = "feedback error";
        streak = 0;
        updateUIStats();
        saveProgress();
    }
}

submitBtn.addEventListener('click', checkAnswer);
nextPuzzleBtn.addEventListener('click', fetchNewPuzzle);
categorySelect.addEventListener('change', fetchNewPuzzle);

fetchNewPuzzle();
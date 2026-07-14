const settings = {
  easy: {
    spawnInterval: 1000,
    dropSpeed: 4.6,
    goodDropChance: 0.75,
    timeLimit: 30,
    scoreGoal: 10,
    badPenalty: 1,
  },
  normal: {
    spawnInterval: 900,
    dropSpeed: 4.0,
    goodDropChance: 0.65,
    timeLimit: 20,
    scoreGoal: 12,
    badPenalty: 2,
  },
  hard: {
    spawnInterval: 700,
    dropSpeed: 3.3,
    goodDropChance: 0.55,
    timeLimit: 20,
    scoreGoal: 15,
    badPenalty: 3,
  },
};

let gameRunning = false;
let dropMaker = null;
let timerInterval = null;
let score = 0;
let timeLeft = 0;
let difficulty = "normal";
let goodStreak = 0;
let timerEnded = false;

const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const startButton = document.getElementById("start-btn");
const difficultySelect = document.getElementById("difficulty");
const gameContainer = document.getElementById("game-container");
const messageBox = document.getElementById("message");
const goalInfo = document.getElementById("goal-info");
const catcher = document.getElementById("catcher");
const completionPopup = document.getElementById("completion-popup");
const completionText = document.getElementById("completion-text");
const nextLevelBtn = document.getElementById("next-level-btn");

let catcherDragging = false;
let catcherOffsetX = 0;
let animationFrameId = null;

difficultySelect.addEventListener("change", handleDifficultyChange);
startButton.addEventListener("click", startGame);
catcher.addEventListener("pointerdown", startCatcherDrag);
document.addEventListener("pointermove", trackCatcherMove);
document.addEventListener("pointerup", stopCatcherDrag);
nextLevelBtn.addEventListener("click", advanceToNextLevel);

handleDifficultyChange();
initializeCatcher();
hideCompletionPopup();

function initializeCatcher() {
  const catcherWidth = catcher.offsetWidth;
  const maxLeft = gameContainer.clientWidth - catcherWidth;
  const centeredLeft = Math.max(0, maxLeft / 2);
  catcher.style.left = `${centeredLeft}px`;
  catcher.style.transform = "";
  hideCompletionPopup();
}

function handleDifficultyChange() {
  difficulty = difficultySelect.value;
  const currentSettings = settings[difficulty];
  goalInfo.innerHTML = `Goal: Reach <strong>${currentSettings.scoreGoal}</strong> points in <strong>${currentSettings.timeLimit}</strong> seconds`;
  messageBox.textContent = `${capitalize(difficulty)} mode selected. Press Start to begin.`;
}

function startGame() {
  if (gameRunning) return;

  gameRunning = true;
  score = 0;
  goodStreak = 0;
  timerEnded = false;
  timeLeft = settings[difficulty].timeLimit;

  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
  messageBox.textContent = "Catch the good drops and avoid the red ones!";
  startButton.textContent = "Playing...";
  startButton.disabled = true;
  difficultySelect.disabled = true;

  hideCompletionPopup();

  clearExistingDrops();

  dropMaker = setInterval(createDrop, settings[difficulty].spawnInterval);
  timerInterval = setInterval(() => {
    timeLeft -= 1;
    timeElement.textContent = timeLeft;

    if (timeLeft <= 0) {
      timerEnded = true;
      endGame();
    }
  }, 1000);
}

function createDrop() {
  const drop = document.createElement("div");
  const isGood = Math.random() < settings[difficulty].goodDropChance;

  drop.className = `water-drop ${isGood ? "good-drop" : "bad-drop"}`;
  drop.dataset.good = isGood ? "true" : "false";

  const size = Math.floor(Math.random() * 32) + 40;
  drop.style.width = `${size}px`;
  drop.style.height = `${size}px`;

  const maxLeft = gameContainer.clientWidth - size;
  const xPosition = Math.random() * Math.max(maxLeft, 0);
  drop.style.left = `${xPosition}px`;
  
  const speedVariance = Math.random() * 0.8;
  const duration = Math.max(settings[difficulty].dropSpeed - speedVariance, 2.2);
  drop.style.animationDuration = `${duration}s`;

  drop.addEventListener("click", () => handleDropClick(drop, isGood));
   drop.addEventListener("animationend", () => {
    if (!drop.classList.contains("caught")) {
      drop.remove();
    }
  });

  gameContainer.appendChild(drop);
}

function handleDropClick(drop, isGood) {
  if (!gameRunning || drop.classList.contains("caught")) return;

  drop.classList.add("caught");
  drop.style.pointerEvents = "none";
  drop.classList.add("clicked");

  if (isGood) {
    goodStreak += 1;
    score += 1;
    let bonusText = "";

    if (difficulty === "hard" && goodStreak > 0 && goodStreak % 3 === 0) {
      score += 1;
      bonusText = " +1 bonus streak point!";
    }

    messageBox.textContent = `Nice catch! Keep the water flowing.${bonusText}`;
  } else {
    score = Math.max(0, score - settings[difficulty].badPenalty);
    goodStreak = 0;
    messageBox.textContent = "That was a bad drop. Try a safer catch.";
  }

  scoreElement.textContent = score;
  setTimeout(() => drop.remove(), 220);
}

function endGame() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(timerInterval);
  dropMaker = null;
  timerInterval = null;
  startButton.disabled = false;
  difficultySelect.disabled = false;
  startButton.textContent = "Start Game";

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  const goal = settings[difficulty].scoreGoal;
  if (score >= goal) {
    if (timerEnded) {
      if (difficulty !== "hard") {
        const nextDifficulty = difficulty === "easy" ? "normal" : "hard";
        completionText.textContent = "Great water work.🏄‍♂️ Advance to the next level!";
        completionPopup.classList.remove("hidden");
        completionPopup.style.display = "flex";
        completionPopup.dataset.next = nextDifficulty;
      } else {
        completionText.textContent = "Congrats! You finished our game and continued the flow. Keep making a difference!";
        completionPopup.classList.remove("hidden");
        completionPopup.style.display = "flex";
        completionPopup.dataset.next = "finished";
        nextLevelBtn.textContent = "Finished";
      }
    }
    messageBox.innerHTML = `Great job! You completed <strong>${capitalize(difficulty)}</strong> mode with <strong>${score}</strong> points.`;
  } else {
    messageBox.innerHTML = `Time's up! You scored <strong>${score}</strong>. Reach <strong>${goal}</strong> points to win. Try again!`;
    hideCompletionPopup();
  }

  clearExistingDrops();
}

function advanceToNextLevel() {
  const nextDifficulty = completionPopup.dataset.next;
  if (!nextDifficulty || nextDifficulty === "finished") {
    completionPopup.classList.add("hidden");
    nextLevelBtn.textContent = "Next Level";
    return;
  }

  difficultySelect.value = nextDifficulty;
  difficulty = nextDifficulty;
  handleDifficultyChange();
  completionPopup.classList.add("hidden");
  nextLevelBtn.textContent = "Next Level";
  startGame();
}

function clearExistingDrops() {
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());
}

function hideCompletionPopup() {
  completionPopup.classList.add("hidden");
  completionPopup.style.display = "none";
  completionPopup.dataset.next = "";
  nextLevelBtn.textContent = "Next Level";
}

function startCatcherDrag(event) {
  if (!gameRunning) return;
  catcherDragging = true;
  catcher.classList.add("dragging");
  const catcherRect = catcher.getBoundingClientRect();
  catcherOffsetX = event.clientX - catcherRect.left;
  event.preventDefault();
}

function trackCatcherMove(event) {
  if (!catcherDragging) return;
  const containerRect = gameContainer.getBoundingClientRect();
  const catcherWidth = catcher.offsetWidth;
  let left = event.clientX - containerRect.left - catcherOffsetX;
  left = Math.max(0, Math.min(left, containerRect.width - catcherWidth));
  catcher.style.left = `${left}px`;

  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(checkCatcherCollisions);
  }
}

function stopCatcherDrag() {
  if (!catcherDragging) return;
  catcherDragging = false;
  catcher.classList.remove("dragging");
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function checkCatcherCollisions() {
  animationFrameId = null;
  if (!gameRunning) return;

  const catcherRect = catcher.getBoundingClientRect();
  const drops = gameContainer.querySelectorAll(".water-drop:not(.caught)");

  drops.forEach((drop) => {
    const dropRect = drop.getBoundingClientRect();
    if (
      dropRect.bottom >= catcherRect.top + 5 &&
      dropRect.left < catcherRect.right &&
      dropRect.right > catcherRect.left
    ) {
      const isGood = drop.dataset.good === "true";
      handleDropClick(drop, isGood);
    }
  });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

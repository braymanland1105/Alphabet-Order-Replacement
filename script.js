document.addEventListener('DOMContentLoaded', () => {
    // ### Elements
    const gameContainer = document.getElementById('game-container');
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const endScreen = document.getElementById('end-screen');
    const introPopup = document.getElementById('intro-popup');
    const startButton = document.getElementById('start-button');
    const popupGoButton = document.getElementById('popup-go-button');
    const playAgainButton = document.getElementById('play-again-button');
    const alphabetSlotsContainer = document.getElementById('alphabet-slots');
    const blockPile = document.getElementById('block-pile');
    const finalAbcContainer = document.getElementById('final-abc');
    const animationArea = document.getElementById('animation-area');
    const monkeyImage = document.getElementById('monkey-image');
    const introVO = document.getElementById('intro-vo');
    const endVO = document.getElementById('end-vo');

    // **Initial Validation**
    if (!gameContainer || !gameScreen || !alphabetSlotsContainer || !blockPile || !animationArea || !finalAbcContainer || !monkeyImage || !introVO || !endVO) {
        console.error("CRITICAL ERROR: Could not find one or more essential elements on load. Check HTML IDs:",
            { gameContainer, gameScreen, alphabetSlotsContainer, blockPile, animationArea, finalAbcContainer, monkeyImage, introVO, endVO });
        return;
    }

    // ### Game State
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    let placedLetters = {};
    let draggedBlock = null;
    let originalRotation = '';
    let currentSong = null;
    let letterBlocks = [];
    let blockData = {};
    let monkeySound = null;
    let monkeySoundLooping = false;

    // ### Audio Playback Functions

    /** Stops an audio element if it's playing */
    const stopAudio = (audioElement) => {
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
    };

    /** Plays a sound based on the given name */
    const playSound = (soundName) => {
        let soundFile = '';
        let isLetterSound = false;
        switch (soundName) {
            case 'click': soundFile = 'assets/audio/Click Sound.mp3'; break;
            case 'incorrect': soundFile = 'assets/audio/Incorrect Sound.mp3'; break;
            case 'correct': soundFile = 'assets/audio/Correct Sound.mp3'; break;
            case 'abc_song': if (currentSong) { currentSong.pause(); currentSong.currentTime = 0; } soundFile = 'assets/audio/ABC Song.mp3'; break;
            case 'applause': soundFile = 'assets/audio/Applause.mp3'; break;
            case 'monkey': soundFile = 'assets/audio/Monkey Sound.mp3'; break;
            default: if (alphabet.includes(soundName)) { soundFile = `assets/audio/${soundName}.wav`; isLetterSound = true; } else { console.warn(`Unknown sound name: ${soundName}`); return; }
        }
        if (soundFile) {
            try {
                const audio = new Audio(soundFile);
                if (soundName === 'abc_song') { currentSong = audio; }
                if (soundName === 'monkey') { audio.volume = 0.7; }
                audio.play().catch(e => console.error(`Error playing sound "${soundName}":`, e));
            } catch (e) {
                console.error(`Error creating Audio object for "${soundName}":`, e);
            }
        }
    };

    /** Starts the looping monkey sound */
    function startMonkeySound() {
        if (monkeySound) {
            monkeySound.pause();
            monkeySound.currentTime = 0;
        }
        try {
            monkeySound = new Audio('assets/audio/Monkey Sound.mp3');
            monkeySound.volume = 0.7;
            monkeySound.addEventListener('ended', function() {
                this.currentTime = 0;
                if (monkeySoundLooping) {
                    this.play().catch(e => console.error("Error looping monkey sound:", e));
                }
            });
            monkeySoundLooping = true;
            monkeySound.play().catch(e => console.error("Error playing monkey sound:", e));
        } catch (e) {
            console.error("Error creating monkey sound object:", e);
        }
    }

    /** Stops the monkey sound */
    function stopMonkeySound() {
        monkeySoundLooping = false;
        if (monkeySound) {
            monkeySound.pause();
            monkeySound.currentTime = 0;
        }
    }

    // ### Utility Function: Shuffle Array
    /** Randomizes an array using Fisher-Yates shuffle */
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ### Core Functions

    /** Initializes or resets the game state */
    function initializeGame() {
        stopAudio(currentSong);
        currentSong = null;
        stopAudio(introVO);
        stopAudio(endVO);

        if (alphabetSlotsContainer) alphabetSlotsContainer.innerHTML = '';
        if (blockPile) blockPile.innerHTML = '';
        if (animationArea) animationArea.innerHTML = '';
        if (finalAbcContainer) finalAbcContainer.innerHTML = '';
        if (animationArea && !animationArea.contains(monkeyImage)) {
            monkeyImage.classList.add('monkey-hidden');
            animationArea.appendChild(monkeyImage);
        }
        placedLetters = {};
        draggedBlock = null;
        letterBlocks = [];
        blockData = {};
        document.querySelectorAll('.screen').forEach(s => { if (s) s.classList.remove('active'); });
        document.querySelectorAll('.popup').forEach(p => { if (p) p.classList.remove('active'); });
        if (titleScreen) titleScreen.classList.add('active');
        if (monkeyImage) monkeyImage.classList.add('monkey-hidden');
        stopMonkeySound();
    }

    /** Starts the intro animation with the monkey */
    function startIntroAnimation() {
        if (!titleScreen || !gameScreen || !introPopup || !endScreen || !alphabetSlotsContainer || !blockPile || !animationArea || !monkeyImage) {
            console.error("startIntroAnimation: Elements missing.");
            return;
        }
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        introPopup.classList.remove('active');
        endScreen.classList.remove('active');
        monkeyImage.classList.remove('monkey-hidden');
        alphabetSlotsContainer.innerHTML = '';
        blockPile.innerHTML = '';
        animationArea.innerHTML = '';
        animationArea.appendChild(monkeyImage);
        letterBlocks = [];
        blockData = {};

        const slotElements = {};
        alphabet.forEach(letter => {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.letter = letter;
            alphabetSlotsContainer.appendChild(slot);
            slotElements[letter] = slot;
        });
        alphabetSlotsContainer.offsetHeight;
        const animationAreaRect = animationArea.getBoundingClientRect();
        const slotElementsData = {};

        alphabet.forEach(letter => {
            const slot = slotElements[letter];
            const rect = slot.getBoundingClientRect();
            slotElementsData[letter] = {
                top: rect.top - animationAreaRect.top,
                left: rect.left - animationAreaRect.left,
                width: slot.offsetWidth,
                height: slot.offsetHeight
            };
        });

        alphabet.forEach(letter => {
            const block = document.createElement('div');
            block.classList.add('letter-block', 'initial-position');
            if (Math.random() < 0.5) {
                block.classList.add('color-alt');
            }
            block.textContent = letter;
            block.dataset.letter = letter;
            block.style.position = 'absolute';
            block.style.top = `${slotElementsData[letter].top}px`;
            block.style.left = `${slotElementsData[letter].left}px`;
            block.style.transform = 'rotate(0deg)';
            animationArea.appendChild(block);
            letterBlocks.push(block);
            blockData[letter] = block;
        });

        setTimeout(() => {
            proceedWithSequentialAnimation(slotElementsData);
        }, 100);
    }

    /** Handles the sequential animation of the monkey knocking down blocks */
    function proceedWithSequentialAnimation(slotElementsData) {
        startMonkeySound();

        const animationAreaRect = animationArea.getBoundingClientRect();
        const pileRect = blockPile.getBoundingClientRect();
        const pileTopRelative = pileRect.top - animationAreaRect.top;
        const pileHeight = blockPile.offsetHeight - 60;
        const pileWidth = blockPile.offsetWidth - 60;
        const groundY = pileRect.top - animationAreaRect.top - 80;
        const jumpDuration = 800;
        const blockFallTime = 1000;
        const delayBetweenBlocks = 60;

        // Group letters by left positions (vertical columns)
        const leftToLetters = {};
        alphabet.forEach(letter => {
            const left = slotElementsData[letter].left;
            if (!leftToLetters[left]) leftToLetters[left] = [];
            leftToLetters[left].push(letter);
        });

        const uniqueLefts = Object.keys(leftToLetters).map(Number).sort((a, b) => a - b);
        const numLefts = uniqueLefts.length;
        const groupSize = Math.ceil(numLefts / 3);
        const leftGroupLefts = uniqueLefts.slice(0, groupSize);
        const middleGroupLefts = uniqueLefts.slice(groupSize, 2 * groupSize);
        const rightGroupLefts = uniqueLefts.slice(2 * groupSize);

        const leftLetters = [];
        const middleLetters = [];
        const rightLetters = [];
        alphabet.forEach(letter => {
            const left = slotElementsData[letter].left;
            if (leftGroupLefts.includes(left)) {
                leftLetters.push(letter);
            } else if (middleGroupLefts.includes(left)) {
                middleLetters.push(letter);
            } else if (rightGroupLefts.includes(left)) {
                rightLetters.push(letter);
            }
        });

        // Calculate center of each group
        function calculateGroupCenter(letters) {
            if (letters.length === 0) return { top: 0, left: 0 };
            let sumTop = 0, sumLeft = 0;
            letters.forEach(letter => {
                const data = slotElementsData[letter];
                sumTop += data.top + data.height / 2;
                sumLeft += data.left + data.width / 2;
            });
            return {
                top: sumTop / letters.length,
                left: sumLeft / letters.length
            };
        }

        const rightCenter = calculateGroupCenter(rightLetters);
        const middleCenter = calculateGroupCenter(middleLetters);
        const leftCenter = calculateGroupCenter(leftLetters);

        // Define landing positions
        const animationAreaWidth = animationAreaRect.width;
        const landAfterFirst = animationAreaWidth * 2 / 3;
        const landAfterSecond = animationAreaWidth / 3;
        const landAfterThird = 150;

        /** Animates the fall of a group of letters */
        const animateSectionFall = (letters) => {
            return new Promise(resolve => {
                let blockDelay = 0;
                let maxBlockTimeout = 0;

                letters.forEach(letter => {
                    const block = blockData[letter];
                    if (!block) return;

                    setTimeout(() => {
                        const randomX = Math.random() * pileWidth + 30;
                        const randomY = pileTopRelative + (Math.random() * pileHeight);
                        const randomRot = Math.random() * 90 - 45;
                        block.style.top = `${randomY}px`;
                        block.style.left = `${randomX}px`;
                        block.style.transform = `rotate(${randomRot}deg)`;

                        setTimeout(() => {
                            if (animationArea.contains(block)) animationArea.removeChild(block);
                            if (blockPile) {
                                block.classList.remove('initial-position');
                                block.style.position = '';
                                block.style.top = '';
                                block.style.left = '';
                                block.style.transform = `rotate(${randomRot}deg)`;
                                blockPile.appendChild(block);
                            }
                        }, blockFallTime);
                    }, blockDelay);

                    maxBlockTimeout = blockDelay + blockFallTime;
                    blockDelay += delayBetweenBlocks;
                });

                setTimeout(resolve, maxBlockTimeout + 100);
            });
        };

        /** Animates the monkey jumping to a target position */
        const animateMonkeyJump = (targetTop, targetLeft) => {
            return new Promise(resolve => {
                const currentStyle = window.getComputedStyle(monkeyImage);
                const startTop = parseFloat(currentStyle.top);
                const startLeft = parseFloat(currentStyle.left);
                const midLeft = (startLeft + targetLeft) / 2;
                const midTop = (startTop + targetTop) / 2;
                const arcHeight = 30;
                const jumpHeight = midTop - arcHeight;
                const minTop = 150;
                const actualJumpHeight = Math.max(minTop, jumpHeight);
                monkeyImage.style.transition = 'none';
                monkeyImage.offsetHeight;
                const jumpAnimation = monkeyImage.animate([
                    { top: `${startTop}px`, left: `${startLeft}px` },
                    { top: `${actualJumpHeight}px`, left: `${midLeft}px`, offset: 0.5 },
                    { top: `${targetTop}px`, left: `${targetLeft}px` }
                ], {
                    duration: 600,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    fill: 'forwards'
                });
                jumpAnimation.onfinish = () => {
                    monkeyImage.style.transition = '';
                    monkeyImage.style.top = `${targetTop}px`;
                    monkeyImage.style.left = `${targetLeft}px`;
                    setTimeout(resolve, 50);
                };
            });
        };

        /** Animates the monkey falling to the ground */
        const monkeyFallToGround = (landingX) => {
            return new Promise(resolve => {
                const currentStyle = window.getComputedStyle(monkeyImage);
                const currentPosX = parseFloat(currentStyle.left);
                const currentPosY = parseFloat(currentStyle.top);
                const targetX = landingX !== undefined ? landingX : currentPosX;
                monkeyImage.style.transition = 'none';
                monkeyImage.offsetHeight;
                const fallAnimation = monkeyImage.animate([
                    { top: `${currentPosY}px`, left: `${currentPosX}px` },
                    { top: `${groundY}px`, left: `${targetX}px` }
                ], {
                    duration: 250,
                    easing: 'cubic-bezier(0.5, 0, 1, 1)',
                    fill: 'forwards'
                });
                fallAnimation.onfinish = () => {
                    monkeyImage.style.transition = '';
                    monkeyImage.style.top = `${groundY}px`;
                    monkeyImage.style.left = `${targetX}px`;
                    setTimeout(resolve, 50);
                };
            });
        };

        /** Animates the monkey exiting to the left */
        const exitMonkeyLeft = () => {
            return new Promise(resolve => {
                const currentPosY = parseFloat(window.getComputedStyle(monkeyImage).top);
                monkeyImage.style.transition = 'none';
                monkeyImage.offsetHeight;
                const exitAnimation = monkeyImage.animate([
                    { top: `${currentPosY}px`, left: `${monkeyImage.style.left}` },
                    { top: `${currentPosY - 80}px`, left: '-120px' }
                ], {
                    duration: 700,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    fill: 'forwards'
                });
                exitAnimation.onfinish = () => {
                    monkeyImage.style.transition = '';
                    monkeyImage.style.left = '-120px';
                    monkeyImage.style.top = `${currentPosY - 80}px`;
                    stopMonkeySound();
                    setTimeout(() => {
                        monkeyImage.classList.remove('monkey-visible');
                        resolve();
                    }, 200);
                };
            });
        };

        const startPosX = animationAreaRect.width - 150;
        monkeyImage.style.top = `${groundY}px`;
        monkeyImage.style.left = `${startPosX}px`;
        monkeyImage.style.bottom = 'auto';
        monkeyImage.classList.add('monkey-visible');

        // **Shuffle each group's letters for randomization**
        const shuffledRightLetters = shuffleArray(rightLetters);
        const shuffledMiddleLetters = shuffleArray(middleLetters);
        const shuffledLeftLetters = shuffleArray(leftLetters);

        // **Animation Sequence**
        new Promise(resolve => setTimeout(resolve, 200))
            .then(() => animateMonkeyJump(rightCenter.top - 60, rightCenter.left - 30))
            .then(() => animateSectionFall(shuffledRightLetters))
            .then(() => monkeyFallToGround(landAfterFirst))
            .then(() => new Promise(resolve => setTimeout(resolve, 150)))
            .then(() => animateMonkeyJump(middleCenter.top - 60, middleCenter.left))
            .then(() => animateSectionFall(shuffledMiddleLetters))
            .then(() => monkeyFallToGround(landAfterSecond))
            .then(() => new Promise(resolve => setTimeout(resolve, 150)))
            .then(() => animateMonkeyJump(leftCenter.top - 60, leftCenter.left - 30))
            .then(() => animateSectionFall(shuffledLeftLetters))
            .then(() => monkeyFallToGround(landAfterThird))
            .then(() => new Promise(resolve => setTimeout(resolve, 150)))
            .then(() => exitMonkeyLeft())
            .then(() => {
                setTimeout(showIntroPopupActual, 500);
            })
            .catch(error => {
                console.error("Error during intro animation:", error);
                stopMonkeySound();
                showIntroPopupActual();
            });
    }

    /** Shows the intro popup and sets up drag-and-drop */
    function showIntroPopupActual() {
        if (!introPopup || !alphabetSlotsContainer) {
            console.error("showIntroPopupActual: Elements missing.");
            return;
        }
        if (monkeyImage) monkeyImage.classList.add('monkey-hidden');
        introPopup.classList.add('active');
        stopAudio(introVO);
        introVO.play().catch(e => console.error("Error playing intro VO:", e));
        letterBlocks.forEach(block => {
            if (block) {
                block.draggable = true;
                block.removeEventListener('dragstart', dragStart);
                block.removeEventListener('dragend', dragEnd);
                block.addEventListener('dragstart', dragStart);
                block.addEventListener('dragend', dragEnd);
            }
        });
        const slots = alphabetSlotsContainer.querySelectorAll('.slot');
        if (slots.length > 0) {
            slots.forEach(slot => {
                slot.removeEventListener('dragover', dragOver);
                slot.removeEventListener('dragenter', dragEnter);
                slot.removeEventListener('dragleave', dragLeave);
                slot.removeEventListener('drop', drop);
                slot.addEventListener('dragover', dragOver);
                slot.addEventListener('dragenter', dragEnter);
                slot.addEventListener('dragleave', dragLeave);
                slot.addEventListener('drop', drop);
            });
        } else {
            console.error("showIntroPopupActual: No slots found.");
        }
    }

    /** Starts the game after the intro popup */
    function startGame() {
        stopAudio(introVO);
        if (introPopup) {
            introPopup.classList.remove('active');
        } else {
            console.error("startGame: introPopup not found.");
        }
    }

    /** Checks if all letters are placed */
    function checkCompletion() {
        return Object.keys(placedLetters).length === alphabet.length;
    }

    /** Handles the end game sequence */
    function endGameSequence() {
        if (!gameScreen || !endScreen || !finalAbcContainer) {
            console.error("endGameSequence: Missing required elements.");
            return;
        }
        stopAudio(endVO);
        Object.values(placedLetters).forEach(block => { if (block) block.classList.add('dancing'); });
        playSound('abc_song');
        setTimeout(() => {
            Object.values(placedLetters).forEach(block => { if (block) block.classList.remove('dancing'); });
            playSound('applause');
            gameScreen.classList.remove('active');
            endScreen.classList.add('active');
            finalAbcContainer.innerHTML = '';
            alphabet.forEach(letter => {
                const d = document.createElement('div');
                d.classList.add('final-letter');
                d.textContent = letter;
                finalAbcContainer.appendChild(d);
            });
            endVO.play().catch(e => console.error("Error playing end VO:", e));
        }, 27000);
    }

    // ### Drag-and-Drop Event Handlers
    function dragStart(event) {
        if (!event.target || event.target.classList.contains('placed')) {
            event.preventDefault();
            return;
        }
        draggedBlock = event.target;
        const letter = draggedBlock.dataset.letter;
        const currentTransform = draggedBlock.style.transform;
        const rotationMatch = currentTransform.match(/rotate\([^)]+\)/);
        originalRotation = rotationMatch ? rotationMatch[0] : '';
        playSound(letter);
        setTimeout(() => { if (draggedBlock) draggedBlock.classList.add('dragging'); }, 0);
        event.dataTransfer.effectAllowed = 'move';
    }

    function dragEnd(event) {
        const block = event.target;
        if (block) {
            block.classList.remove('dragging');
            if (draggedBlock && block.draggable && !block.classList.contains('placed')) {
                block.style.transform = originalRotation || 'none';
            }
        }
        document.querySelectorAll('.slot.over').forEach(s => { if (s) s.classList.remove('over'); });
        draggedBlock = null;
        originalRotation = '';
    }

    function dragOver(event) {
        event.preventDefault();
    }

    function dragEnter(event) {
        event.preventDefault();
        const targetSlot = event.target;
        if (targetSlot && targetSlot.classList.contains('slot') && !targetSlot.hasChildNodes()) {
            targetSlot.classList.add('over');
        }
    }

    function dragLeave(event) {
        const targetSlot = event.target;
        if (targetSlot && targetSlot.classList.contains('slot')) {
            targetSlot.classList.remove('over');
        }
    }

    function drop(event) {
        event.preventDefault();
        const slot = event.target;
        if (!slot || !slot.classList.contains('slot')) {
            if (draggedBlock) draggedBlock.classList.remove('dragging');
            return;
        }
        if (slot.classList.contains('slot') && !slot.hasChildNodes() && draggedBlock) {
            slot.classList.remove('over');
            const targetLetter = slot.dataset.letter;
            const droppedLetter = draggedBlock.dataset.letter;
            if (targetLetter === droppedLetter) {
                playSound('correct');
                if (draggedBlock.parentNode) {
                    draggedBlock.parentNode.removeChild(draggedBlock);
                }
                slot.appendChild(draggedBlock);
                draggedBlock.classList.remove('dragging');
                draggedBlock.classList.add('placed');
                draggedBlock.style.transform = 'none';
                draggedBlock.style.position = 'relative';
                draggedBlock.style.top = '';
                draggedBlock.style.left = '';
                draggedBlock.draggable = false;
                placedLetters[targetLetter] = draggedBlock;
                const tempBlockRef = draggedBlock;
                draggedBlock = null;
                if (checkCompletion()) {
                    endGameSequence();
                }
            } else {
                playSound('incorrect');
                if (draggedBlock) {
                    draggedBlock.classList.add('wiggle');
                    draggedBlock.classList.remove('dragging');
                    setTimeout(() => {
                        if (draggedBlock && draggedBlock.classList.contains('wiggle')) {
                            draggedBlock.classList.remove('wiggle');
                            draggedBlock.style.transform = originalRotation || 'none';
                        }
                    }, 500);
                }
            }
        } else {
            if (slot.classList.contains('slot')) slot.classList.remove('over');
            if (draggedBlock) draggedBlock.classList.remove('dragging');
        }
    }

    // ### Event Listeners
    if (startButton) {
        startButton.addEventListener('click', () => {
            playSound('click');
            startIntroAnimation();
        });
    } else {
        console.error("Start Button not found!");
    }

    if (popupGoButton) {
        popupGoButton.addEventListener('click', () => {
            playSound('click');
            startGame();
        });
    } else {
        console.error("Popup Go Button not found!");
    }

    if (playAgainButton) {
        playAgainButton.addEventListener('click', () => {
            playSound('click');
            initializeGame();
        });
    } else {
        console.error("Play Again Button not found!");
    }

    // ### Start the Game
    initializeGame();
});
